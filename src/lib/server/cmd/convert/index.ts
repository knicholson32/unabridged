/**
 * Converts a downloaded Audible book into a single .m4b in the library, using ffmpeg directly.
 * Replaces the AAXtoMP3 script. The ffmpeg command itself is built in ./ffmpeg.ts.
 */
import * as child_process from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as settings from '$lib/server/settings';
import type { Prisma } from '@prisma/client';
import prisma from '$lib/server/prisma';
import * as events from '$lib/server/events';
import * as media from '$lib/server/media';
import * as metadata from '$lib/server/metadata';
import * as AbsSync from '$lib/server/audiobookshelf/sync';
import { sanitizeFile } from '$lib/server/helpers';
import { Event, SourceType } from '$lib/types';
import { round } from '$lib/helpers';
import { ConversionError } from './types';
import * as ffmpeg from './ffmpeg';

export { ConversionError, conversionErrorToString } from './types';

const FFMPEG = 'ffmpeg';
const FFPROBE = 'ffprobe';

/** Allowed difference between the source and output lengths before the output counts as broken */
const DURATION_TOLERANCE_MS = 2000;

// --------------------------------------------------------------------------------------------
// Cancelling
// --------------------------------------------------------------------------------------------

// Kill conversions left over from before a dev-server reload
if (global.aax === undefined) global.aax = { cancelMap: {} };
for (const asin of Object.keys(global.aax.cancelMap)) {
	global.aax.cancelMap[asin].canceled = true;
	global.aax.cancelMap[asin].proc.kill();
	delete global.aax.cancelMap[asin];
}

/**
 * Cancel a running conversion
 * @param asin the book being converted
 * @returns whether a conversion was running
 */
export const cancel = (asin: string): boolean => {
	if (asin in global.aax.cancelMap) {
		global.aax.cancelMap[asin].canceled = true;
		global.aax.cancelMap[asin].proc.kill();
		return true;
	}
	return false;
};

// --------------------------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------------------------

/** Run ffprobe and read the duration and tags */
const probe = (file: string, decryption?: ffmpeg.Decryption) =>
	new Promise<{ durationMs: number | null; tags: Record<string, string> } | null>((resolve) => {
		child_process.execFile(
			FFPROBE,
			ffmpeg.buildProbeArgs(file, decryption),
			{ maxBuffer: 16 * 1024 * 1024 },
			(err, stdout, stderr) => {
				if (err) {
					console.error(`ffprobe failed for ${file}:`, stderr || err.message);
					resolve(null);
				} else {
					resolve(ffmpeg.parseProbe(stdout));
				}
			}
		);
	});

/** Decide which error to report from ffmpeg's error output */
const classifyError = (stderr: string): ConversionError => {
	if (/permission denied|read-only file system|no space left/i.test(stderr))
		return ConversionError.DESTINATION_NOT_WRITABLE;
	if (/invalid data found|moov atom not found|audible_key|audible_iv|activation/i.test(stderr))
		return ConversionError.INVALID_FILE;
	return ConversionError.CONVERSION_ERROR;
};

const removeQuietly = (file: string) => {
	try {
		fs.rmSync(file, { force: true });
	} catch (e) {
		// Nothing to do
	}
};

const setProgress = async (processID: string, progress: number, speed?: number) => {
	try {
		await prisma.processQueue.update({
			where: { id: processID },
			data: { book: { update: { process_progress: progress, speed: speed ?? null } } }
		});
	} catch (e) {
		console.log('Could not save conversion progress', e);
	}
	events.emitProgress('processor.book', processID, {
		r: true,
		d: false,
		p: round(progress),
		s: speed,
		t: Event.Progress.Processor.BOOK.Task.PROCESS
	});
};

// --------------------------------------------------------------------------------------------
// Conversion
// --------------------------------------------------------------------------------------------

const bookInclude = {
	sources: {
		where: { NOT: { audible: null }, type: SourceType.AUDIBLE },
		include: { audible: true }
	},
	authors: true,
	narrators: true
} satisfies Prisma.BookInclude;

type BookForConversion = Prisma.BookGetPayload<{ include: typeof bookInclude }>;

/**
 * Convert a downloaded book into an .m4b in the library folder
 * @param asin the book
 * @param sourceId the source it was downloaded from
 * @param processID the process queue entry, for progress updates
 * @param tmpDir the folder audible-cli downloaded the book into
 */
export const exec = async (
	asin: string,
	sourceId: string,
	processID: string,
	tmpDir: string
): Promise<ConversionError> => {
	const book = await prisma.book.findUnique({
		where: { asin },
		include: bookInclude
	});
	if (book === null) return ConversionError.BOOK_NOT_FOUND;
	if (book.sources.length === 0) return ConversionError.NO_PROFILE;
	if (book.authors.length === 0) return ConversionError.CONVERSION_ERROR;
	if (!fs.existsSync(tmpDir)) return ConversionError.NO_FOLDER;

	const debug = (await settings.get('system.debug')) > 0;

	const result = await convert(book, sourceId, processID, tmpDir, debug);

	if (result !== ConversionError.NO_ERROR) {
		await prisma.book.update({ where: { asin }, data: { processed: false } });
	}

	// Delete the download folder (kept in debug mode, for inspection)
	if (!debug) {
		try {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		} catch (e) {
			// Nothing to do
		}
	}

	return result;
};

const convert = async (
	book: BookForConversion,
	sourceId: string,
	processID: string,
	tmpDir: string,
	debug: boolean
): Promise<ConversionError> => {
	// 1. Find the downloaded files
	const files = ffmpeg.findDownloadFiles(fs.readdirSync(tmpDir));
	if (files === null) {
		console.log(`Convert ${book.asin}: no .aaxc or .aax file in ${tmpDir}`);
		return ConversionError.NO_FOLDER;
	}
	const audio = path.join(tmpDir, files.audio);

	// 2. Work out how to decrypt it. An .aaxc needs the key and IV from its voucher; only the older
	//    .aax format uses the account's activation bytes.
	let decryption: ffmpeg.Decryption;
	if (files.audio.toLowerCase().endsWith('.aaxc')) {
		const voucher = files.voucher ? fs.readFileSync(path.join(tmpDir, files.voucher), 'utf-8') : '';
		const keys = ffmpeg.parseVoucher(voucher);
		if (keys === null) {
			console.log(`Convert ${book.asin}: missing or unreadable voucher`);
			return ConversionError.INVALID_FILE;
		}
		decryption = { type: 'aaxc', ...keys };
	} else {
		const activationBytes = book.sources.find((s) => s.audible?.activation_bytes)?.audible
			?.activation_bytes;
		if (!activationBytes) return ConversionError.NO_PROFILE_WITH_AUTHCODE;
		decryption = { type: 'aax', activationBytes };
	}

	// 3. Read the source: its length (for progress and the final check) and the tags Unabridged
	//    does not store itself (copyright)
	const source = await probe(audio, decryption);
	if (source === null || source.durationMs === null) return ConversionError.INVALID_FILE;

	// 4. Prepare the destination. An existing copy of the book is only replaced once the new one is
	//    complete, so a failed conversion never removes a working book.
	const libraryFolder = await settings.get('library.location');
	const fileName = sanitizeFile(book.title);
	const destinationFolder = path.join(
		libraryFolder,
		sanitizeFile(book.authors[0].name),
		sanitizeFile(book.title)
	);
	const output = path.join(destinationFolder, `${fileName}.m4b`);
	const partial = `${output}.tmp`;
	try {
		fs.mkdirSync(destinationFolder, { recursive: true });
		fs.accessSync(destinationFolder, fs.constants.R_OK | fs.constants.W_OK);
	} catch (e) {
		return ConversionError.DESTINATION_NOT_WRITABLE;
	}

	// 5. Tags and chapters
	const chapters = files.chapters
		? ffmpeg.parseChapters(
				fs.readFileSync(path.join(tmpDir, files.chapters), 'utf-8'),
				source.durationMs
		  )
		: null;
	if (chapters === null) console.log(`Convert ${book.asin}: no chapter data; using the file's own`);

	const releaseSeconds = Number(book.release_date);
	const tags: ffmpeg.Tags = {
		title: book.title,
		artist: book.authors.map((a) => a.name).join(', '),
		narrator: book.narrators.map((n) => n.name).join(', '),
		date:
			Number.isFinite(releaseSeconds) && releaseSeconds > 0
				? new Date(releaseSeconds * 1000).getUTCFullYear().toString()
				: source.tags['date'] ?? '',
		// Fall back to Audible's own description when Unabridged has none
		description: book.description || source.tags['comment'] || '',
		copyright: source.tags['copyright'] ?? '',
		genre: source.tags['genre'] ?? 'Audiobook'
	};
	const metadataFile = path.join(tmpDir, 'unabridged.ffmetadata');
	fs.writeFileSync(metadataFile, ffmpeg.buildMetadataFile(tags, chapters?.chapters ?? []), 'utf-8');

	const args = ffmpeg.buildArgs({
		decryption,
		audio,
		cover: files.cover ? path.join(tmpDir, files.cover) : null,
		metadataFile,
		// Without chapter data, keep the chapters stored in the Audible file instead of writing none
		chaptersFrom: chapters === null ? 'source' : 'metadata',
		output: partial
	});

	// 6. Run ffmpeg
	await setProgress(processID, 0);
	if (debug) {
		// The key, IV and activation bytes decrypt the book, so keep them out of the log
		const secret = new Set(['-audible_key', '-audible_iv', '-activation_bytes']);
		const shown = args.map((a, i) =>
			i > 0 && secret.has(args[i - 1]) ? '<hidden>' : JSON.stringify(a)
		);
		console.log(`${FFMPEG} ${shown.join(' ')}`);
	}

	const proc = child_process.spawn(FFMPEG, args, { cwd: tmpDir });
	global.aax.cancelMap[book.asin] = { proc, canceled: false };

	const exit = await new Promise<{ code: number | null; stderr: string; spawnError?: Error }>(
		(resolve) => {
			const parser = new ffmpeg.ProgressParser();
			let stderr = '';
			let lastUpdate = 0;

			proc.stdout.on('data', (d: Buffer) => {
				for (const report of parser.push(d.toString())) {
					if (report.seconds === null) continue;
					// At most one database update a second
					const now = Date.now();
					if (now - lastUpdate < 1000 && !report.done) continue;
					lastUpdate = now;
					const progress = Math.min(1, (report.seconds * 1000) / (source.durationMs ?? Infinity));
					void setProgress(processID, progress, report.speed ?? undefined);
				}
			});
			proc.stderr.on('data', (d: Buffer) => {
				// Keep the last 16 kB; ffmpeg's errors come at the end
				stderr = (stderr + d.toString()).slice(-16384);
			});
			proc.on('error', (err) => resolve({ code: null, stderr, spawnError: err }));
			proc.on('close', (code) => resolve({ code, stderr }));
		}
	);

	const canceled = global.aax.cancelMap[book.asin]?.canceled === true;
	delete global.aax.cancelMap[book.asin];

	if (canceled) {
		removeQuietly(partial);
		return ConversionError.CANCELED;
	}
	if (exit.spawnError !== undefined || exit.code !== 0) {
		console.error(
			`Convert ${book.asin}: ffmpeg failed (exit ${exit.code})`,
			exit.spawnError?.message ?? exit.stderr
		);
		removeQuietly(partial);
		return exit.spawnError !== undefined
			? ConversionError.CONVERSION_ERROR
			: classifyError(exit.stderr);
	}
	if (exit.stderr.trim() !== '') console.log(`Convert ${book.asin}: ffmpeg reported:`, exit.stderr);

	// 7. Check the result is complete before it replaces anything
	const result = await probe(partial);
	if (
		result === null ||
		result.durationMs === null ||
		Math.abs(result.durationMs - source.durationMs) > DURATION_TOLERANCE_MS
	) {
		console.error(
			`Convert ${book.asin}: output length ${result?.durationMs} ms does not match the source ${source.durationMs} ms`
		);
		removeQuietly(partial);
		return ConversionError.CONVERSION_ERROR;
	}

	try {
		fs.renameSync(partial, output);
		// Audiobookshelf and other players also look for a cover image in the book's folder
		if (files.cover)
			fs.copyFileSync(
				path.join(tmpDir, files.cover),
				path.join(destinationFolder, `${fileName}.jpg`)
			);
		// Left behind by AAXtoMP3; the chapters are now only inside the .m4b
		removeQuietly(path.join(destinationFolder, `${fileName}.chapters.txt`));
	} catch (e) {
		console.error(`Convert ${book.asin}: could not move the output into the library`, e);
		removeQuietly(partial);
		return ConversionError.DESTINATION_NOT_WRITABLE;
	}

	// 8. Record the result
	try {
		await media.saveFile(output, book.asin, sourceId, {
			description: 'Playable audio book file',
			title: book.title,
			noCopy: true
		});

		await prisma.processQueue.update({
			where: { id: processID },
			data: {
				book: {
					update: { process_progress: 1, downloaded_mb: null, total_mb: null, speed: null }
				}
			}
		});
		events.emitProgress('processor.book', processID, {
			r: true,
			d: false,
			p: 1,
			t: Event.Progress.Processor.BOOK.Task.PROCESS
		});

		await prisma.book.update({
			where: { asin: book.asin },
			data: { processed: true, date_added: Math.floor(new Date().getTime() / 1000) }
		});

		// Write the Audiobookshelf metadata sidecar. Best-effort: a failure is logged but does not
		// fail the conversion, and the file can be regenerated from Settings → Library.
		await metadata.writeSidecar(book.asin);
		// Have Audiobookshelf pick the book up now rather than at the next scan (not awaited)
		void AbsSync.notifyBookAdded(book.asin);
	} catch (e) {
		console.log('Conversion error', e);
		return ConversionError.COULD_NOT_SAVE;
	}

	return ConversionError.NO_ERROR;
};
