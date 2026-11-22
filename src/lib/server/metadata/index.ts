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
 * Find the folder a book's audio lives in. Prefers the path recorded when the book was converted,
 * since `library.location` may have changed since then.
 * @returns the folder, or null if it cannot be determined
 */
export const getBookFolder = async (book: BookWithRelations): Promise<string | null> => {
	const audio = book.media.find((m) => m.is_file && m.path !== null && m.extension === 'm4b');
	if (audio?.path) return path.dirname(audio.path);

	// Fall back to the naming scheme used by the converter
	if (book.authors.length === 0) return null;
	const libraryFolder = await settings.get('library.location');
	return `${libraryFolder}/${sanitizeFile(book.authors[0].name)}/${sanitizeFile(book.title)}`;
};

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

		const folder = await getBookFolder(book);
		if (folder === null) {
			console.log(`Metadata: could not determine folder for ${asin}`);
			return false;
		}

		try {
			await fs.access(folder);
		} catch (e) {
			console.log(`Metadata: folder does not exist for ${asin}: ${folder}`);
			return false;
		}

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
