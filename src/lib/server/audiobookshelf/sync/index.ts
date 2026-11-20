// Keeps Audiobookshelf in step with Unabridged: tells ABS about new books, scans the library after
// processing, links books and series to their ABS IDs, and removes deleted books. Every function
// here is best-effort: failures are logged (and reported for scans) but never thrown, so ABS
// problems can't break downloading or converting.

import { v4 as uuidv4 } from 'uuid';
import prisma from '$lib/server/prisma';
import * as settings from '$lib/server/settings';
import * as events from '$lib/server/events';
import { sanitizeFile } from '$lib/server/helpers';
import { icons } from '$lib/components';
import * as publicTypes from '$lib/types';
import * as abs from '..';
import { getLibraryConfig } from '../settings';

export type SyncResult = { success: boolean; message: string };

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const bookSelect = {
	asin: true,
	title: true,
	absItemId: true,
	authors: { select: { name: true } },
	media: { where: { is_file: true, extension: 'm4b' }, select: { path: true } }
} as const;

type BookForLink = {
	asin: string;
	title: string;
	absItemId: string | null;
	authors: { name: string }[];
	media: { path: string | null }[];
};

/**
 * The book's audio file and folder, relative to the Unabridged library folder
 */
const relPaths = (
	book: BookForLink,
	libraryRoot: string
): { folder: string | null; file: string | null } => {
	const audio = book.media.find((m) => m.path !== null)?.path ?? null;
	if (audio !== null) {
		const file = abs.linking.toRelPath(audio, libraryRoot);
		if (file !== null) return { folder: file.substring(0, file.lastIndexOf('/')), file };
	}
	// Fall back to the converter's naming scheme
	if (book.authors.length === 0) return { folder: null, file: null };
	return { folder: `${sanitizeFile(book.authors[0].name)}/${sanitizeFile(book.title)}`, file: null };
};

// -------------------------------------------------------------------------------------------------
// Linking
// -------------------------------------------------------------------------------------------------

/**
 * Match every processed book to its ABS item (by ASIN, then folder path) and every series to its
 * ABS series (by name), and save the IDs. IDs of books ABS no longer has are cleared.
 */
export const linkBooks = async (): Promise<
	abs.types.Result<{ linked: number; unmatched: number; changed: number }>
> => {
	const cfg = await getLibraryConfig();
	if (cfg === null)
		return abs.types.fail(abs.types.AbsError.NOT_FOUND, 'Audiobookshelf is not configured.');

	const items = await abs.getLibraryItems(cfg.conn, cfg.libraryId);
	if (!items.ok) return items;
	const index = abs.linking.buildItemIndex(items.value);
	const libraryRoot = await settings.get('library.location');

	let linked = 0;
	let unmatched = 0;
	let changed = 0;
	const books = await prisma.book.findMany({ where: { processed: true }, select: bookSelect });
	for (const book of books) {
		const { folder } = relPaths(book, libraryRoot);
		const item = abs.linking.findItem(index, { asin: book.asin, relPath: folder });
		const id = item !== null && !item.isMissing ? item.id : null;
		if (id === null) unmatched++;
		else linked++;
		if (id !== book.absItemId) {
			await prisma.book.update({ where: { asin: book.asin }, data: { absItemId: id } });
			changed++;
		}
	}

	// Series: ABS names series from the metadata.json sidecar, which uses Unabridged's titles
	const absSeries = await abs.getLibrarySeries(cfg.conn, cfg.libraryId);
	if (absSeries.ok) {
		const byName = new Map<string, abs.types.Series>();
		for (const s of absSeries.value) {
			const existing = byName.get(s.name);
			// Prefer a series that has books over one left empty by removed items
			if (existing === undefined || ((existing.books?.length ?? 0) === 0 && (s.books?.length ?? 0) > 0))
				byName.set(s.name, s);
		}
		const series = await prisma.series.findMany({
			where: { books: { some: { processed: true } } },
			select: { id: true, title: true, absSeriesId: true }
		});
		for (const s of series) {
			const id = byName.get(s.title)?.id ?? null;
			if (id !== s.absSeriesId)
				await prisma.series.update({ where: { id: s.id }, data: { absSeriesId: id } });
		}
	} else console.log('Audiobookshelf: could not get series', absSeries.message);

	return abs.types.ok({ linked, unmatched, changed });
};

// -------------------------------------------------------------------------------------------------
// Single books
// -------------------------------------------------------------------------------------------------

/**
 * Tell ABS a book was just converted so it picks it up within seconds, without a full scan
 */
export const notifyBookAdded = async (asin: string): Promise<void> => {
	try {
		const cfg = await getLibraryConfig();
		if (cfg === null) return;
		const book = await prisma.book.findUnique({ where: { asin }, select: bookSelect });
		if (book === null) return;
		const { file } = relPaths(book, await settings.get('library.location'));
		if (file === null) {
			console.log(`Audiobookshelf: ${asin} is not inside the library folder; skipping notify`);
			return;
		}
		const library = await abs.getLibrary(cfg.conn, cfg.libraryId);
		if (!library.ok) return console.log('Audiobookshelf: notify failed', library.message);
		const result = await abs.notifyFileAdded(cfg.conn, library.value, file, cfg.folderId);
		if (!result.ok) console.log('Audiobookshelf: notify failed', result.message);
		else console.log(`Audiobookshelf: notified of ${asin} (${file})`);
	} catch (e) {
		console.log('Audiobookshelf: notify failed', e);
	}
};

/**
 * Rescan a book ABS already has, e.g. after its metadata.json changed. Clears a stale ID.
 */
export const refreshBook = async (asin: string): Promise<void> => {
	try {
		const cfg = await getLibraryConfig();
		if (cfg === null) return;
		const book = await prisma.book.findUnique({ where: { asin }, select: { absItemId: true } });
		if (book === null || book.absItemId === null) return;
		const result = await abs.scanItem(cfg.conn, book.absItemId);
		if (!result.ok) {
			if (result.error === abs.types.AbsError.NOT_FOUND)
				await prisma.book.update({ where: { asin }, data: { absItemId: null } });
			else console.log('Audiobookshelf: refresh failed', result.message);
		}
	} catch (e) {
		console.log('Audiobookshelf: refresh failed', e);
	}
};

/**
 * Remove a book from ABS (files are left alone). Call before its files and DB records are removed.
 */
export const removeBook = async (asin: string): Promise<void> => {
	try {
		const cfg = await getLibraryConfig();
		if (cfg === null) return;
		const book = await prisma.book.findUnique({ where: { asin }, select: bookSelect });
		if (book === null) return;
		let itemId = book.absItemId;
		if (itemId === null) {
			// Not linked yet; look it up so the item doesn't linger as "missing" in ABS
			const items = await abs.getLibraryItems(cfg.conn, cfg.libraryId);
			if (!items.ok) return console.log('Audiobookshelf: remove failed', items.message);
			const { folder } = relPaths(book, await settings.get('library.location'));
			itemId =
				abs.linking.findItem(abs.linking.buildItemIndex(items.value), { asin, relPath: folder })?.id ??
				null;
		}
		if (itemId === null) return;
		const result = await abs.deleteItem(cfg.conn, itemId);
		if (!result.ok && result.error !== abs.types.AbsError.NOT_FOUND)
			console.log('Audiobookshelf: remove failed', result.message);
		await prisma.book.update({ where: { asin }, data: { absItemId: null } });
	} catch (e) {
		console.log('Audiobookshelf: remove failed', e);
	}
};

// -------------------------------------------------------------------------------------------------
// Library scans
// -------------------------------------------------------------------------------------------------

const notifyFailure = async (message: string) => {
	const notification: publicTypes.Notification = {
		id: uuidv4(),
		icon_path: icons.warning,
		icon_color: 'text-red-400',
		issuer: 'abs.scan.result' satisfies publicTypes.Issuer,
		theme: 'info' satisfies publicTypes.ModalTheme,
		text: message,
		sub_text: 'Audiobookshelf scan failed',
		identifier: null,
		linger_time: -1,
		needs_clearing: true,
		auto_open: false
	};
	await prisma.notification.create({ data: notification });
	events.emit('notification.created', [notification]);
};

/**
 * Scan the ABS library, wait for it, then link books and series. Reports progress and the result
 * to the status bar, and a notification on failure.
 */
export const runScan = async (): Promise<SyncResult> => {
	const cfg = await getLibraryConfig();
	if (cfg === null) return { success: false, message: 'Audiobookshelf is not configured.' };
	if (await settings.get('abs.scan.inProgress'))
		return { success: true, message: 'A scan is already running.' };

	await settings.set('abs.scan.inProgress', true);
	const progressId = '';
	events.emitProgress('basic.abs.scan', progressId, {
		t: publicTypes.Event.Progress.Basic.Stage.START
	});

	let result: SyncResult;
	try {
		const timeoutMs = (await settings.get('abs.scan.timeout')) * 1000;
		const scan = await abs.scanLibrary(cfg.conn, cfg.libraryId, {
			timeoutMs,
			onProgress: (elapsed) =>
				events.emitProgress('basic.abs.scan', progressId, {
					t: publicTypes.Event.Progress.Basic.Stage.IN_PROGRESS,
					p: Math.min(elapsed / timeoutMs, 0.95)
				})
		});
		if (!scan.ok) result = { success: false, message: scan.message };
		else {
			const link = await linkBooks();
			result = link.ok
				? {
						success: true,
						message:
							link.value.unmatched === 0
								? `Scanned; ${link.value.linked} books linked.`
								: `Scanned; ${link.value.linked} books linked, ${link.value.unmatched} not found in Audiobookshelf.`
				  }
				: { success: false, message: link.message };
		}
	} catch (e) {
		console.log('Audiobookshelf: scan error', e);
		result = { success: false, message: 'An unexpected error occurred during the scan.' };
	} finally {
		await settings.set('abs.scan.inProgress', false);
	}

	events.emitProgress('basic.abs.scan', progressId, {
		t: publicTypes.Event.Progress.Basic.Stage.DONE,
		m: result.message,
		success: result.success
	});
	events.emit('abs.scan.result', result);
	console.log(`Audiobookshelf: scan ${result.success ? 'done' : 'failed'}: ${result.message}`);
	if (!result.success) await notifyFailure(result.message);
	return result;
};

/**
 * Scan after the processing queue finishes adding books: waits the configured delay (so a batch
 * gets one scan), then scans unless more books started processing in the meantime.
 * @param isIdle reports whether the processing queue is idle
 */
export const scanAfterProcessing = async (isIdle: () => boolean): Promise<void> => {
	try {
		const s = await settings.getMany(
			'abs.enable',
			'abs.scan.enable',
			'abs.scan.scheduled',
			'abs.scan.delay',
			'abs.scan.nextRun'
		);
		if (!s['abs.enable'] || !s['abs.scan.enable'] || s['abs.scan.scheduled']) return;
		if ((await getLibraryConfig()) === null) return;
		// Already waiting to scan; that scan will cover these books too
		if (s['abs.scan.nextRun'] !== -1) return;

		const runAt = Math.floor(Date.now() / 1000) + s['abs.scan.delay'];
		console.log(`Audiobookshelf: scan scheduled in ${s['abs.scan.delay']}s`);
		await settings.set('abs.scan.nextRun', runAt);
		events.emit('abs.scan.scheduled', runAt);

		await delay(s['abs.scan.delay'] * 1000);

		await settings.set('abs.scan.nextRun', -1);
		events.emit('abs.scan.scheduled', -1);

		// More books started processing; the next time the queue empties schedules another scan
		if (!isIdle()) return;
		// Settings may have changed while waiting
		const now = await settings.getMany('abs.enable', 'abs.scan.enable', 'abs.scan.scheduled');
		if (!now['abs.enable'] || !now['abs.scan.enable'] || now['abs.scan.scheduled']) return;

		await runScan();
	} catch (e) {
		console.log('Audiobookshelf: scheduled scan error', e);
		await settings.set('abs.scan.nextRun', -1);
		events.emit('abs.scan.scheduled', -1);
	}
};

/**
 * The scheduled (cron) part: test the connection and, if scanning is on, scan and link
 * @returns results for the cron record, or null if Audiobookshelf is disabled
 */
export const scheduledRun = async (): Promise<{
	test: publicTypes.ConnectionTestResult;
	scan: SyncResult | null;
} | null> => {
	const s = await settings.getMany('abs.enable', 'abs.scan.enable', 'abs.address', 'abs.apiKey', 'abs.apiTimeout');
	if (!s['abs.enable']) return null;

	const test = await abs.testConnection({
		address: s['abs.address'],
		apiKey: s['abs.apiKey'],
		timeoutMs: s['abs.apiTimeout']
	});
	const testResult: publicTypes.ConnectionTestResult = test.ok
		? {
				success: true,
				source: 'abs',
				message: `Connected to Audiobookshelf ${test.value.serverVersion} as '${test.value.username}'.`
		  }
		: { success: false, source: 'abs', message: test.message };

	if (!test.ok || !s['abs.scan.enable'] || (await getLibraryConfig()) === null)
		return { test: testResult, scan: null };
	return { test: testResult, scan: await runScan() };
};
