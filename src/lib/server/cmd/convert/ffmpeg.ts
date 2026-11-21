/**
 * Builds the ffmpeg command that turns an Audible download into a single .m4b.
 *
 * Everything here is plain data in, plain data out (no database, no settings), so it can be
 * unit tested. The function that runs ffmpeg lives in ./index.ts.
 *
 * One ffmpeg pass does what AAXtoMP3, mp4chaps and mp4art used to do between them:
 * - decrypt the .aaxc (key and IV from the audible-cli voucher) or .aax (activation bytes)
 * - copy the audio into an .m4b without re-encoding
 * - write tags and chapters from an ffmetadata file
 * - embed the cover image
 */

// --------------------------------------------------------------------------------------------
// Inputs
// --------------------------------------------------------------------------------------------

/** How to decrypt the source file */
export type Decryption =
	| { type: 'aaxc'; key: string; iv: string }
	| { type: 'aax'; activationBytes: string };

/** One chapter, in milliseconds from the start of the book */
export type Chapter = { title: string; startMs: number; endMs: number };

/** Tags written to the .m4b. Empty values are left out. */
export type Tags = {
	title: string;
	/** All authors, already joined */
	artist: string;
	/** All narrators, already joined. Written as `composer`, which is where audiobook apps look. */
	narrator: string;
	/** Release year, or a full date */
	date: string;
	description: string;
	copyright: string;
	genre: string;
};

/** The files audible-cli leaves in the download folder */
export type DownloadFiles = {
	/** The .aaxc (or .aax) file */
	audio: string;
	/** The `.voucher` file holding the .aaxc key and IV */
	voucher: string | null;
	/** The `-chapters.json` file */
	chapters: string | null;
	/** The cover image */
	cover: string | null;
};

// --------------------------------------------------------------------------------------------
// Download folder
// --------------------------------------------------------------------------------------------

/**
 * Pick out the files to convert from the names in a download folder.
 * @param fileNames the names of the files in the folder
 * @returns the files, or null if there is no audio file
 */
export const findDownloadFiles = (fileNames: string[]): DownloadFiles | null => {
	const names = [...fileNames].sort();
	const audio =
		names.find((n) => n.toLowerCase().endsWith('.aaxc')) ??
		names.find((n) => n.toLowerCase().endsWith('.aax'));
	if (audio === undefined) return null;

	const stem = audio.replace(/\.aaxc?$/i, '');
	const voucher = names.includes(`${stem}.voucher`)
		? `${stem}.voucher`
		: names.find((n) => n.toLowerCase().endsWith('.voucher')) ?? null;
	const chapters = names.find((n) => n.endsWith('-chapters.json')) ?? null;

	// audible-cli names the cover "<title>_(1215).jpg". When it does not download one, Unabridged adds
	// "zzz_provided_cover_(500).jpg"; the "zzz" sorts it after audible-cli's cover, so the sorted list
	// prefers the real one when both exist.
	const cover = names.find((n) => /\.jpe?g$/i.test(n)) ?? null;

	return { audio, voucher, chapters, cover };
};

/**
 * Read the decryption key and IV from an audible-cli voucher
 * @param voucherJson the contents of the `.voucher` file
 * @returns the key and IV, or null if the voucher does not hold them
 */
export const parseVoucher = (voucherJson: string): { key: string; iv: string } | null => {
	try {
		const voucher = JSON.parse(voucherJson);
		const license = voucher?.content_license?.license_response;
		const key = license?.key;
		const iv = license?.iv;
		const hex = /^[0-9a-f]{32}$/i;
		if (typeof key !== 'string' || typeof iv !== 'string') return null;
		if (!hex.test(key) || !hex.test(iv)) return null;
		return { key, iv };
	} catch (e) {
		return null;
	}
};

// --------------------------------------------------------------------------------------------
// Chapters
// --------------------------------------------------------------------------------------------

type AudibleChapter = {
	title?: string;
	start_offset_ms?: number;
	length_ms?: number;
	chapters?: AudibleChapter[];
};

/**
 * Read the chapters from audible-cli's `-chapters.json`.
 *
 * Audible nests chapters inside parts ("Part One" → "Chapter 1", ...). They are flattened into one
 * list with each part placed before its own chapters, as AAXtoMP3 did. Each chapter ends where the
 * next one starts; the last ends at the end of the book.
 * @param chaptersJson the contents of the file
 * @param audioDurationMs the measured length of the audio. Audible's runtime can be a few
 *                        milliseconds longer, so when this is given no chapter runs past it.
 * @returns the chapters and the length of the book, or null if the file cannot be read
 */
export const parseChapters = (
	chaptersJson: string,
	audioDurationMs?: number | null
): { chapters: Chapter[]; runtimeMs: number | null } | null => {
	let info: { chapters?: AudibleChapter[]; runtime_length_ms?: number } | undefined;
	try {
		info = JSON.parse(chaptersJson)?.content_metadata?.chapter_info;
	} catch (e) {
		return null;
	}
	if (info === undefined || !Array.isArray(info.chapters)) return null;

	const flat: { title: string; startMs: number }[] = [];
	const walk = (list: AudibleChapter[]) => {
		for (const c of list) {
			if (typeof c.start_offset_ms === 'number' && Number.isFinite(c.start_offset_ms)) {
				flat.push({ title: (c.title ?? '').trim(), startMs: Math.max(0, c.start_offset_ms) });
			}
			if (Array.isArray(c.chapters)) walk(c.chapters);
		}
	};
	walk(info.chapters);

	const runtimeMs =
		typeof info.runtime_length_ms === 'number' && info.runtime_length_ms > 0
			? info.runtime_length_ms
			: null;

	// Fall back to the last chapter's own length when the runtime is not given
	const lastEnd = (() => {
		if (runtimeMs !== null) return runtimeMs;
		const last = info.chapters[info.chapters.length - 1];
		if (last?.start_offset_ms !== undefined && last.length_ms !== undefined)
			return last.start_offset_ms + last.length_ms;
		return null;
	})();

	const limit =
		typeof audioDurationMs === 'number' && Number.isFinite(audioDurationMs) && audioDurationMs > 0
			? Math.round(audioDurationMs)
			: Infinity;

	const chapters: Chapter[] = flat.map((c, i) => {
		const next = i + 1 < flat.length ? flat[i + 1].startMs : lastEnd ?? c.startMs;
		const startMs = Math.min(c.startMs, limit);
		return {
			title: c.title !== '' ? c.title : `Chapter ${i + 1}`,
			startMs,
			endMs: Math.max(startMs, Math.min(next, limit))
		};
	});

	return { chapters, runtimeMs };
};

// --------------------------------------------------------------------------------------------
// ffmetadata
// --------------------------------------------------------------------------------------------

/**
 * Escape a value for an ffmetadata file. `=`, `;`, `#`, `\` and line breaks must be escaped with
 * a backslash.
 */
export const escapeMetadata = (value: string): string =>
	value.replace(/\r\n?/g, '\n').replace(/[=;#\\\n]/g, (c) => `\\${c}`);

/**
 * Build the ffmetadata file holding the tags and chapters
 * @param tags the book's tags
 * @param chapters the book's chapters
 * @returns the contents of the file
 */
export const buildMetadataFile = (tags: Tags, chapters: Chapter[]): string => {
	const lines = [';FFMETADATA1'];
	const tag = (key: string, value: string) => {
		if (value.trim() !== '') lines.push(`${key}=${escapeMetadata(value)}`);
	};

	tag('title', tags.title);
	tag('album', tags.title);
	tag('artist', tags.artist);
	tag('album_artist', tags.artist);
	tag('composer', tags.narrator);
	tag('date', tags.date);
	tag('genre', tags.genre);
	tag('copyright', tags.copyright);
	tag('description', tags.description);
	tag('track', '1/1');

	for (const c of chapters) {
		lines.push('', '[CHAPTER]', 'TIMEBASE=1/1000');
		lines.push(`START=${Math.round(c.startMs)}`, `END=${Math.round(c.endMs)}`);
		lines.push(`title=${escapeMetadata(c.title)}`);
	}

	return lines.join('\n') + '\n';
};

// --------------------------------------------------------------------------------------------
// Command
// --------------------------------------------------------------------------------------------

const decryptArgs = (decryption: Decryption): string[] =>
	decryption.type === 'aaxc'
		? ['-audible_key', decryption.key, '-audible_iv', decryption.iv]
		: ['-activation_bytes', decryption.activationBytes];

/**
 * Build the ffprobe arguments that read a file's duration and tags as JSON
 * @param file the file to read
 * @param decryption how to decrypt it, for an Audible file
 */
export const buildProbeArgs = (file: string, decryption?: Decryption): string[] => [
	'-v',
	'error',
	...(decryption !== undefined ? decryptArgs(decryption) : []),
	'-show_entries',
	'format=duration:format_tags',
	'-of',
	'json',
	file
];

/**
 * Read ffprobe's JSON output
 * @returns the duration in milliseconds (null if missing) and the tags, with lower-case keys
 */
export const parseProbe = (
	json: string
): { durationMs: number | null; tags: Record<string, string> } | null => {
	try {
		const format = JSON.parse(json)?.format;
		if (format === undefined) return null;
		const seconds = parseFloat(format.duration);
		const tags: Record<string, string> = {};
		for (const [k, v] of Object.entries(format.tags ?? {}))
			if (typeof v === 'string') tags[k.toLowerCase()] = v;
		return { durationMs: Number.isFinite(seconds) ? seconds * 1000 : null, tags };
	} catch (e) {
		return null;
	}
};

/**
 * Build the ffmpeg arguments. ffmpeg is run without a shell, so no value needs quoting.
 * @param options the input and output files
 * @returns the arguments, not including `ffmpeg` itself
 */
export const buildArgs = (options: {
	decryption: Decryption;
	audio: string;
	cover: string | null;
	metadataFile: string;
	/** Take chapters from the metadata file (the default) or keep the ones in the Audible file */
	chaptersFrom?: 'metadata' | 'source';
	output: string;
}): string[] => {
	const decrypt = decryptArgs(options.decryption);

	const args = ['-hide_banner', '-nostdin', '-y', '-loglevel', 'error', '-nostats'];
	args.push('-progress', 'pipe:1');
	args.push(...decrypt, '-i', options.audio);

	// Input 1: the cover, or nothing. Input numbers below depend on this.
	if (options.cover !== null) args.push('-i', options.cover);
	const metadataInput = options.cover !== null ? 2 : 1;
	args.push('-f', 'ffmetadata', '-i', options.metadataFile);

	args.push('-map', '0:a:0');
	if (options.cover !== null) {
		args.push('-map', '1:v:0', '-disposition:v:0', 'attached_pic');
	} else {
		// Fall back to the cover inside the Audible file, if it has one
		args.push('-map', '0:v:0?', '-disposition:v:0', 'attached_pic');
	}
	const chaptersInput = options.chaptersFrom === 'source' ? 0 : metadataInput;
	args.push('-map_metadata', `${metadataInput}`, '-map_chapters', `${chaptersInput}`);
	args.push('-c', 'copy', '-f', 'mp4', options.output);
	return args;
};

// --------------------------------------------------------------------------------------------
// Progress
// --------------------------------------------------------------------------------------------

/**
 * Accumulates ffmpeg's `-progress` output, which arrives as `key=value` lines in arbitrary chunks.
 * Each block of lines ends with `progress=continue` (or `progress=end`).
 */
export class ProgressParser {
	private buffer = '';
	private values: Record<string, string> = {};

	/**
	 * Feed in a chunk of output
	 * @returns one entry per completed block: the position in seconds and the speed, when known
	 */
	push(chunk: string): { seconds: number | null; speed: number | null; done: boolean }[] {
		this.buffer += chunk;
		const lines = this.buffer.split('\n');
		this.buffer = lines.pop() ?? '';

		const reports: { seconds: number | null; speed: number | null; done: boolean }[] = [];
		for (const line of lines) {
			const eq = line.indexOf('=');
			if (eq === -1) continue;
			const key = line.substring(0, eq).trim();
			const value = line.substring(eq + 1).trim();
			if (key !== 'progress') {
				this.values[key] = value;
				continue;
			}

			// out_time_us is microseconds. (out_time_ms is also microseconds, despite its name.)
			const us = parseInt(this.values['out_time_us'] ?? this.values['out_time_ms'] ?? '', 10);
			const speed = parseFloat((this.values['speed'] ?? '').replace('x', ''));
			reports.push({
				seconds: Number.isFinite(us) && us >= 0 ? us / 1_000_000 : null,
				speed: Number.isFinite(speed) ? speed : null,
				done: value === 'end'
			});
			this.values = {};
		}
		return reports;
	}
}
