import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { Prisma } from '@prisma/client';
import prisma from '$lib/server/prisma';
import * as settings from '$lib/server/settings';
import { sanitizeFile } from '$lib/server/helpers';

/**
 * Name of the sidecar file Audiobookshelf reads from each book folder. ABS gives this file the
 * highest priority by default (`absMetadata` is last in `metadataPrecedence`), so whatever is
 * written here wins over audio tags and folder names.
 */
export const FILE_NAME = 'metadata.json';

/**
 * The subset of ABS's `metadata.json` book format that Unabridged has data for.
 * See `server/utils/generators/abmetadataGenerator.js` in the ABS source.
 *
 * ABS skips keys that are `null`, so cleared text fields are written as `''` to make sure an
 * edit in Unabridged also clears the value in ABS.
 */
export type AbsBookMetadata = {
	title: string;
	subtitle: string;
	authors: string[];
	narrators: string[];
	/** Each entry is `"Series Name #sequence"` (e.g. `#2`, `#1.5`, `#1-3`), or just `"Series Name"` */
	series: string[];
	genres: string[];
	publishedYear?: string;
	publishedDate?: string;
	description: string;
	isbn: string;
	asin: string;
};

const bookInclude = {
	authors: true,
	narrators: true,
	genres: true,
	series: true,
	media: true
} satisfies Prisma.BookInclude;

type BookWithRelations = Prisma.BookGetPayload<{ include: typeof bookInclude }>;

/**
 * Reduce a folder name to letters and digits, lower-cased, so small differences in spacing and
 * punctuation still match ("James S.A. Corey" and "James S. A. Corey" → "jamessacorey").
 */
export const folderKey = (name: string): string =>
	sanitizeFile(name)
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '');

const listDirs = async (folder: string): Promise<string[]> => {
	try {
		return (await fs.readdir(folder, { withFileTypes: true }))
			.filter((e) => e.isDirectory())
			.map((e) => e.name);
	} catch (e) {
		return [];
	}
};

const exists = async (p: string): Promise<boolean> => {
	try {
		await fs.access(p);
		return true;
	} catch (e) {
		return false;
	}
};

/** Whether a folder holds an .m4b, i.e. is really a converted book */
const hasAudio = async (folder: string): Promise<boolean> => {
	try {
		return (await fs.readdir(folder)).some((f) => f.toLowerCase().endsWith('.m4b'));
	} catch (e) {
		return false;
	}
};

/** Whether a folder already has this book's metadata.json */
const hasSidecarFor = async (folder: string, asin: string): Promise<boolean> => {
	try {
		const json = JSON.parse(await fs.readFile(path.join(folder, FILE_NAME), 'utf-8'));
		return json?.asin === asin;
	} catch (e) {
		return false;
	}
};

/**
 * Find the folder a book's audio lives in. Tries, in order:
 * 1. the folder of the .m4b recorded when the book was converted
 * 2. the converter's naming scheme, `<library>/<first author>/<title>`
 * 3. a search of `<library>/*\/*` for a folder holding this book's metadata.json, or whose author
 *    and title match once spacing, punctuation and case are ignored (for books whose title or
 *    author changed after conversion)
 * Only folders that contain an .m4b count, so metadata is never written into an unrelated folder.
 * @returns the folder (null if not found) and a description of each place that was tried
 */
export const locateBookFolder = async (
	book: BookWithRelations
): Promise<{ folder: string | null; tried: string[] }> => {
	const tried: string[] = [];
	const check = async (folder: string, why: string): Promise<boolean> => {
		if (await hasAudio(folder)) return true;
		tried.push(
			`${why}: ${folder} (${(await exists(folder)) ? 'exists but has no .m4b' : 'does not exist'})`
		);
		return false;
	};

	// 1. Where the converter put it
	const audio = book.media.find((m) => m.is_file && m.path !== null && m.extension === 'm4b');
	if (audio?.path) {
		const folder = path.dirname(audio.path);
		if (await check(folder, 'recorded .m4b')) return { folder, tried };
	} else tried.push('recorded .m4b: none (the book has no .m4b media record)');

	const libraryFolder = await settings.get('library.location');
	if (book.authors.length === 0) {
		tried.push('naming scheme: the book has no author');
		return { folder: null, tried };
	}

	// 2. Where the converter would put it now
	const expected = path.join(
		libraryFolder,
		sanitizeFile(book.authors[0].name),
		sanitizeFile(book.title)
	);
	if (await check(expected, 'naming scheme')) return { folder: expected, tried };

	// 3. Search two levels deep
	const authorKeys = new Set(book.authors.map((a) => folderKey(a.name)));
	const titleKey = folderKey(book.title);
	let nameMatch: string | null = null;
	for (const authorDir of await listDirs(libraryFolder)) {
		const authorMatches = authorKeys.has(folderKey(authorDir));
		for (const titleDir of await listDirs(path.join(libraryFolder, authorDir))) {
			const folder = path.join(libraryFolder, authorDir, titleDir);
			// A metadata.json with this ASIN is certain; take it straight away
			if ((await hasSidecarFor(folder, book.asin)) && (await hasAudio(folder))) {
				tried.push(`search: found by metadata.json at ${folder}`);
				return { folder, tried };
			}
			if (
				nameMatch === null &&
				authorMatches &&
				folderKey(titleDir) === titleKey &&
				(await hasAudio(folder))
			)
				nameMatch = folder;
		}
	}
	if (nameMatch !== null) {
		tried.push(`search: found by author and title at ${nameMatch}`);
		return { folder: nameMatch, tried };
	}

	// Not found: list what the author's folder does hold, to help work out where the book went
	const authorDir = path.join(libraryFolder, sanitizeFile(book.authors[0].name));
	const contents = await listDirs(authorDir);
	tried.push(
		contents.length > 0
			? `search: no match; ${authorDir} contains: ${contents.map((c) => `'${c}'`).join(', ')}`
			: `search: no matching folder anywhere in ${libraryFolder}`
	);
	return { folder: null, tried };
};

/**
 * Find the folder a book's audio lives in
 * @returns the folder, or null if it cannot be found
 */
export const getBookFolder = async (book: BookWithRelations): Promise<string | null> =>
	(await locateBookFolder(book)).folder;

/**
 * Build the ABS metadata for a book
 * @param book the book, including its relations
 * @returns the metadata object to serialize
 */
export const build = (book: BookWithRelations): AbsBookMetadata => {
	const series: string[] = [];
	if (book.series !== null) {
		// ABS takes everything after the last " #" as the sequence, and it may not contain spaces or
		// "#". Decimals and ranges ("1.5", "1-3") are fine.
		const sequence = (book.series_sequence ?? '').replace(/[\s#]/g, '');
		series.push(sequence !== '' ? `${book.series.title} #${sequence}` : book.series.title);
	}

	const metadata: AbsBookMetadata = {
		title: book.title,
		subtitle: book.subtitle ?? '',
		authors: book.authors.map((a) => a.name),
		narrators: book.narrators.map((n) => n.name),
		series,
		genres: book.genres.map((g) => g.tag),
		description: book.description ?? '',
		isbn: book.isbn ?? '',
		asin: book.asin
	};

	// Release date is stored as unix seconds. 0 means unknown.
	const releaseSeconds = Number(book.release_date);
	if (Number.isFinite(releaseSeconds) && releaseSeconds > 0) {
		const released = new Date(releaseSeconds * 1000);
		metadata.publishedYear = released.getUTCFullYear().toString();
		metadata.publishedDate = released.toISOString().substring(0, 10);
	}

	return metadata;
};

/**
 * Write (or overwrite) the `metadata.json` sidecar for a processed book. Never throws; failures are
 * logged and reported through the return value so callers can treat this as best-effort.
 * @param asin the book to write metadata for
 * @returns whether the file was written
 */
export const writeSidecar = async (asin: string): Promise<boolean> => {
	try {
		const book = await prisma.book.findUnique({ where: { asin }, include: bookInclude });
		// Only processed books have a folder on disk
		if (book === null || book.processed !== true) return false;

		const { folder, tried } = await locateBookFolder(book);
		if (folder === null) {
			console.log(
				`Metadata: cannot find the audio for ${asin} ('${book.title}'), which is marked as processed. ` +
					`If it was moved or deleted, download it again. Looked in:\n  - ${tried.join('\n  - ')}`
			);
			return false;
		}
		// Found somewhere other than the recorded location: say where, in case it is unexpected
		if (tried.length > 0) console.log(`Metadata: ${asin} found after: ${tried.join('; ')}`);

		// Write to a temp file and rename, so the ABS watcher never reads a half-written file
		const target = path.join(folder, FILE_NAME);
		const temp = `${target}.tmp`;
		await fs.writeFile(temp, JSON.stringify(build(book), null, 2) + '\n', 'utf-8');
		await fs.rename(temp, target);
		return true;
	} catch (e) {
		console.error(`Metadata: failed to write sidecar for ${asin}`, e);
		return false;
	}
};

/**
 * Write sidecars for every processed book. Used to backfill existing libraries.
 * @returns how many files were written and which books failed
 */
export const writeAllSidecars = async (): Promise<{ written: number; failed: string[] }> => {
	const books = await prisma.book.findMany({
		where: { processed: true },
		select: { asin: true }
	});

	let written = 0;
	const failed: string[] = [];
	for (const { asin } of books) {
		if (await writeSidecar(asin)) written++;
		else failed.push(asin);
	}
	return { written, failed };
};

/**
 * Write sidecars for every processed book, once. Runs on start until it has succeeded, so
 * upgraded libraries get their metadata.json files without anyone having to press
 * Settings → Library → Write metadata files. Never throws.
 *
 * The setting is not set when there are processed books but none could be written: that usually
 * means the library folder is not mounted yet, so it is tried again on the next start.
 */
export const writeAllSidecarsOnce = async (): Promise<void> => {
	try {
		if (await settings.get('library.metadataFilesWritten')) return;

		console.log('Metadata: writing metadata.json for existing books');
		const { written, failed } = await writeAllSidecars();
		if (failed.length > 0) console.log('Metadata: could not write sidecars for', failed);

		if (written === 0 && failed.length > 0) {
			console.log('Metadata: no files could be written; will try again on the next start');
			return;
		}
		await settings.set('library.metadataFilesWritten', true);
		console.log(`Metadata: wrote metadata.json for ${written} book${written === 1 ? '' : 's'}`);
	} catch (e) {
		console.error('Metadata: automatic metadata.json write failed', e);
	}
};
