import * as child_process from 'node:child_process';
import * as fs from 'node:fs';
import prisma from '$lib/server/prisma';
import { AUDIBLE_CMD, AUDIBLE_FOLDER } from '$lib/server/env';

/**
 * What Audible lets an account do with the books in its library.
 *
 * `audible library export` has fixed columns that leave out `customer_rights`, so the rights come
 * from one more request to the library API. A catalog title (Audible Plus and similar) whose
 * access has ended stays in the library with `is_consumable_offline: false`; audible-cli then
 * refuses to download it ("<title> is not downloadable."). Audible gives no useful end date for
 * catalog access (`is_consumable_until` is 2099-12-31 while access lasts), so a loss of access is
 * only seen at the first sync after it happens.
 */

export type Right = {
	asin: string;
	/** customer_rights.is_consumable_offline */
	downloadable: boolean;
	/** is_ayce: in the library through a catalog plan, not bought */
	borrowed: boolean;
};

/** A book that the account could download at the previous sync and cannot now */
export type LostAccess = { asin: string; title: string; downloaded: boolean; borrowed: boolean };

/** Most items the library API returns per page */
const PAGE_SIZE = 1000;

/**
 * Read the rights from a page of the library API
 * @param page the parsed JSON response of `1.0/library` with the customer_rights response group
 * @returns one entry per item that has rights; items without them are left out
 */
export const parseRights = (page: unknown): Right[] => {
	const items = (page as { items?: unknown })?.items;
	if (!Array.isArray(items)) return [];
	const rights: Right[] = [];
	for (const item of items as Record<string, unknown>[]) {
		const cr = item?.customer_rights as Record<string, unknown> | null | undefined;
		if (typeof item?.asin !== 'string' || cr === null || typeof cr !== 'object') continue;
		rights.push({
			asin: item.asin,
			downloadable: cr.is_consumable_offline === true,
			borrowed: item.is_ayce === true
		});
	}
	return rights;
};

/**
 * Run `audible api` and return its parsed JSON output
 * @param cli_id the audible-cli profile
 * @param page the 1-based page to fetch
 */
const fetchPage = (cli_id: string, page: number): Promise<unknown> => {
	const out = `/tmp/${cli_id}.rights.${page}.json`;
	const args = [
		'-P',
		cli_id,
		'api',
		'1.0/library',
		'-p',
		'response_groups=customer_rights',
		'-p',
		`num_results=${PAGE_SIZE}`,
		'-p',
		`page=${page}`,
		'-o',
		out
	];
	return new Promise((resolve, reject) => {
		child_process.execFile(
			AUDIBLE_CMD,
			args,
			{ env: { ...process.env, AUDIBLE_CONFIG_DIR: AUDIBLE_FOLDER } },
			(err, _stdout, stderr) => {
				if (err !== null) return reject(new Error(stderr.trim() || err.message));
				try {
					resolve(JSON.parse(fs.readFileSync(out).toString()));
				} catch (e) {
					reject(e);
				} finally {
					fs.rmSync(out, { force: true });
				}
			}
		);
	});
};

/**
 * Fetch the rights to every book in an account's library
 * @param cli_id the audible-cli profile
 * @returns the rights, or null if they could not be fetched (the reason is logged)
 */
export const fetch = async (cli_id: string): Promise<Right[] | null> => {
	const all: Right[] = [];
	try {
		for (let page = 1; page < 100; page++) {
			const json = await fetchPage(cli_id, page);
			const count = ((json as { items?: unknown[] })?.items ?? []).length;
			all.push(...parseRights(json));
			if (count < PAGE_SIZE) return all;
		}
		return all;
	} catch (e) {
		console.log(`Library rights: could not fetch for profile ${cli_id}:`, e);
		return null;
	}
};

/**
 * Work out whether each book may be downloaded by at least one of its accounts. An account with
 * no rights row for the book counts as allowed (its rights have not been fetched yet).
 * @param asins the books to update; all books if not given
 */
export const updateDownloadable = async (asins?: string[]) => {
	const books = await prisma.book.findMany({
		where: asins === undefined ? undefined : { asin: { in: asins } },
		select: {
			asin: true,
			downloadable: true,
			sources: { select: { id: true } },
			rights: { select: { sourceId: true, downloadable: true } }
		}
	});
	const yes: string[] = [];
	const no: string[] = [];
	for (const b of books) {
		const downloadable =
			b.sources.length === 0 ||
			b.sources.some((s) => b.rights.find((r) => r.sourceId === s.id)?.downloadable !== false);
		if (downloadable !== b.downloadable) (downloadable ? yes : no).push(b.asin);
	}
	if (yes.length > 0)
		await prisma.book.updateMany({ where: { asin: { in: yes } }, data: { downloadable: true } });
	if (no.length > 0)
		await prisma.book.updateMany({ where: { asin: { in: no } }, data: { downloadable: false } });
};

/**
 * Save an account's rights and update which books can be downloaded
 * @param sourceId the account
 * @param rights what `fetch` returned for it
 * @returns the books it could download at the last sync and cannot now. A book seen for the first
 *          time is never in this list, so the first sync after upgrading reports nothing.
 */
export const save = async (sourceId: string, rights: Right[]): Promise<LostAccess[]> => {
	const now = Math.floor(Date.now() / 1000);
	const books = await prisma.book.findMany({
		where: { sources: { some: { id: sourceId } } },
		select: {
			asin: true,
			title: true,
			downloaded: true,
			rights: { where: { sourceId }, select: { downloadable: true } }
		}
	});
	const byAsin = new Map(books.map((b) => [b.asin, b]));
	const lost: LostAccess[] = [];

	await prisma.$transaction(
		rights
			.filter((r) => byAsin.has(r.asin))
			.map((r) => {
				const book = byAsin.get(r.asin)!;
				if (book.rights[0]?.downloadable === true && !r.downloadable)
					lost.push({
						asin: r.asin,
						title: book.title,
						downloaded: book.downloaded,
						borrowed: r.borrowed
					});
				const data = { downloadable: r.downloadable, borrowed: r.borrowed, checked: now };
				return prisma.bookRights.upsert({
					where: { asin_sourceId: { asin: r.asin, sourceId } },
					create: { asin: r.asin, sourceId, ...data },
					update: data
				});
			})
	);

	await updateDownloadable(books.map((b) => b.asin));
	const notAllowed = rights.filter((r) => byAsin.has(r.asin) && !r.downloadable).length;
	console.log(
		`Library rights: saved ${rights.length} for account ${sourceId}; ${notAllowed} not downloadable` +
			(lost.length > 0 ? `; access ended for ${lost.map((l) => `'${l.title}'`).join(', ')}` : '')
	);
	return lost;
};
