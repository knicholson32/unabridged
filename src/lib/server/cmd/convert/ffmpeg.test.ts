import { describe, expect, it } from 'vitest';
import * as ffmpeg from './ffmpeg';

const chaptersJson = (chapters: unknown[], runtime_length_ms?: number) =>
	JSON.stringify({ content_metadata: { chapter_info: { chapters, runtime_length_ms } } });

describe('findDownloadFiles', () => {
	it('picks the audio, voucher, chapters and cover', () => {
		expect(
			ffmpeg.findDownloadFiles([
				'Book-AAX_44_128.aaxc',
				'Book-AAX_44_128.voucher',
				'Book-annotations.json',
				'Book-chapters.json',
				'Book_(1215).jpg',
				'Book.pdf'
			])
		).toEqual({
			audio: 'Book-AAX_44_128.aaxc',
			voucher: 'Book-AAX_44_128.voucher',
			chapters: 'Book-chapters.json',
			cover: 'Book_(1215).jpg'
		});
	});

	it("prefers audible-cli's cover over the one Unabridged provides", () => {
		const files = ffmpeg.findDownloadFiles([
			'zzz_provided_cover_(500).jpg',
			'a.aaxc',
			'Book_(1215).jpg'
		]);
		expect(files?.cover).toBe('Book_(1215).jpg');
		const fallback = ffmpeg.findDownloadFiles(['a.aaxc', 'zzz_provided_cover_(500).jpg']);
		expect(fallback?.cover).toBe('zzz_provided_cover_(500).jpg');
	});

	it('handles an .aax without a voucher, and no audio at all', () => {
		expect(ffmpeg.findDownloadFiles(['Book.aax'])).toEqual({
			audio: 'Book.aax',
			voucher: null,
			chapters: null,
			cover: null
		});
		expect(ffmpeg.findDownloadFiles(['Book-chapters.json', 'Book.jpg'])).toBeNull();
	});
});

describe('parseVoucher', () => {
	const key = '0123456789abcdef0123456789abcdef';
	const iv = 'fedcba9876543210fedcba9876543210';

	it('reads the key and IV', () => {
		const voucher = JSON.stringify({
			content_license: { license_response: { key, iv, rules: [] } }
		});
		expect(ffmpeg.parseVoucher(voucher)).toEqual({ key, iv });
	});

	it('rejects missing, malformed and non-JSON vouchers', () => {
		expect(ffmpeg.parseVoucher('{}')).toBeNull();
		expect(ffmpeg.parseVoucher('not json')).toBeNull();
		expect(
			ffmpeg.parseVoucher(
				JSON.stringify({ content_license: { license_response: { key: 'short', iv } } })
			)
		).toBeNull();
	});
});

describe('parseChapters', () => {
	it('ends each chapter where the next starts, and the last at the runtime', () => {
		const result = ffmpeg.parseChapters(
			chaptersJson(
				[
					{ title: 'Opening Credits', start_offset_ms: 0, length_ms: 17854 },
					{ title: 'Chapter 1', start_offset_ms: 17854, length_ms: 935325 }
				],
				953179
			)
		);
		expect(result).toEqual({
			runtimeMs: 953179,
			chapters: [
				{ title: 'Opening Credits', startMs: 0, endMs: 17854 },
				{ title: 'Chapter 1', startMs: 17854, endMs: 953179 }
			]
		});
	});

	it('flattens parts, putting each part before its chapters', () => {
		const result = ffmpeg.parseChapters(
			chaptersJson(
				[
					{ title: 'Intro', start_offset_ms: 0, length_ms: 1000 },
					{
						title: 'Part One',
						start_offset_ms: 1000,
						length_ms: 5000,
						chapters: [
							{ title: 'Chapter 1', start_offset_ms: 1500, length_ms: 2000 },
							{ title: 'Chapter 2', start_offset_ms: 3500, length_ms: 2500 }
						]
					},
					{ title: 'End Credits', start_offset_ms: 6000, length_ms: 500 }
				],
				6500
			)
		);
		expect(result?.chapters.map((c) => [c.title, c.startMs, c.endMs])).toEqual([
			['Intro', 0, 1000],
			['Part One', 1000, 1500],
			['Chapter 1', 1500, 3500],
			['Chapter 2', 3500, 6000],
			['End Credits', 6000, 6500]
		]);
	});

	it('does not let chapters run past the measured audio length', () => {
		const result = ffmpeg.parseChapters(
			chaptersJson([{ title: 'Only', start_offset_ms: 0, length_ms: 37081297 }], 37081297),
			37081273.333
		);
		expect(result?.chapters).toEqual([{ title: 'Only', startMs: 0, endMs: 37081273 }]);
	});

	it('uses the last chapter length when no runtime is given, and names untitled chapters', () => {
		const result = ffmpeg.parseChapters(
			chaptersJson([
				{ start_offset_ms: 0, length_ms: 100 },
				{ title: '  Two ', start_offset_ms: 100, length_ms: 200 }
			])
		);
		expect(result).toEqual({
			runtimeMs: null,
			chapters: [
				{ title: 'Chapter 1', startMs: 0, endMs: 100 },
				{ title: 'Two', startMs: 100, endMs: 300 }
			]
		});
	});

	it('returns null for unreadable files', () => {
		expect(ffmpeg.parseChapters('nope')).toBeNull();
		expect(ffmpeg.parseChapters('{}')).toBeNull();
	});
});

describe('buildMetadataFile', () => {
	const tags: ffmpeg.Tags = {
		title: 'All Systems Red',
		artist: 'Martha Wells',
		narrator: 'Kevin R. Free',
		date: '2017',
		description: 'Line one; has = and # and \\\r\nLine two',
		copyright: '',
		genre: 'Audiobook'
	};

	it('escapes special characters and skips empty tags', () => {
		const file = ffmpeg.buildMetadataFile(tags, []);
		expect(file).toBe(
			[
				';FFMETADATA1',
				'title=All Systems Red',
				'album=All Systems Red',
				'artist=Martha Wells',
				'album_artist=Martha Wells',
				'composer=Kevin R. Free',
				'date=2017',
				'genre=Audiobook',
				'description=Line one\\; has \\= and \\# and \\\\\\',
				'Line two',
				'track=1/1',
				''
			].join('\n')
		);
	});

	it('writes chapters in milliseconds', () => {
		const file = ffmpeg.buildMetadataFile(tags, [
			{ title: 'Part 1: The #1 = Best', startMs: 0, endMs: 1234.4 }
		]);
		expect(file).toContain(
			'[CHAPTER]\nTIMEBASE=1/1000\nSTART=0\nEND=1234\ntitle=Part 1: The \\#1 \\= Best\n'
		);
	});
});

describe('buildArgs', () => {
	const base = {
		decryption: { type: 'aaxc' as const, key: 'k'.repeat(32), iv: 'i'.repeat(32) },
		audio: 'in.aaxc',
		metadataFile: 'meta.txt',
		output: 'out.m4b.tmp'
	};

	it('maps audio, cover, tags and chapters', () => {
		const args = ffmpeg.buildArgs({ ...base, cover: 'cover.jpg' }).join(' ');
		expect(args).toContain(
			`-audible_key ${'k'.repeat(32)} -audible_iv ${'i'.repeat(
				32
			)} -i in.aaxc -i cover.jpg -f ffmetadata -i meta.txt`
		);
		expect(args).toContain(
			'-map 0:a:0 -map 1:v:0 -disposition:v:0 attached_pic -map_metadata 2 -map_chapters 2'
		);
		expect(args.endsWith('-c copy -f mp4 out.m4b.tmp')).toBe(true);
	});

	it('falls back to the embedded cover and the source chapters', () => {
		const args = ffmpeg
			.buildArgs({
				...base,
				decryption: { type: 'aax', activationBytes: 'abcd1234' },
				cover: null,
				chaptersFrom: 'source'
			})
			.join(' ');
		expect(args).toContain('-activation_bytes abcd1234 -i in.aaxc -f ffmetadata -i meta.txt');
		expect(args).toContain(
			'-map 0:v:0? -disposition:v:0 attached_pic -map_metadata 1 -map_chapters 0'
		);
	});

	it('keeps titles with shell characters as single arguments', () => {
		const output = `/library/A "quoted" $book \`x\`/out.m4b`;
		expect(ffmpeg.buildArgs({ ...base, cover: null, output }).at(-1)).toBe(output);
	});
});

describe('ProgressParser', () => {
	it('reports each block, even when split across chunks', () => {
		const parser = new ffmpeg.ProgressParser();
		expect(parser.push('out_time_us=1500000\nspe')).toEqual([]);
		expect(parser.push('ed=12.5x\nprogress=continue\nout_time_us=3000000\n')).toEqual([
			{ seconds: 1.5, speed: 12.5, done: false }
		]);
		expect(parser.push('speed=N/A\nprogress=end\n')).toEqual([
			{ seconds: 3, speed: null, done: true }
		]);
	});
});

describe('parseProbe', () => {
	it('reads the duration and lower-cases tag names', () => {
		expect(
			ffmpeg.parseProbe(
				JSON.stringify({ format: { duration: '12.5', tags: { Copyright: '©2024' } } })
			)
		).toEqual({ durationMs: 12500, tags: { copyright: '©2024' } });
		expect(ffmpeg.parseProbe('{}')).toBeNull();
	});
});
