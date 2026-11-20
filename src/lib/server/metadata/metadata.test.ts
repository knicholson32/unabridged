import { describe, expect, it } from 'vitest';
import { build } from '$lib/server/metadata';

type BookInput = Parameters<typeof build>[0];

/** A processed book as the metadata writer loads it, with only the fields it reads filled in */
const makeBook = (overrides: Partial<Record<string, unknown>> = {}): BookInput =>
	({
		asin: 'B01N17THEO',
		title: 'For We Are Many',
		subtitle: 'Bobiverse, Book 2',
		description: 'Bob and his clones...',
		isbn: '9781680680591',
		release_date: BigInt(1492473600), // 2017-04-18
		series_sequence: '2',
		series: { id: 's1', title: 'Bobiverse', absSeriesId: null },
		authors: [{ name: 'Dennis E. Taylor' }],
		narrators: [{ name: 'Ray Porter' }],
		genres: [{ tag: 'Science Fiction' }, { tag: 'Space Opera' }],
		media: [],
		...overrides
	}) as unknown as BookInput;

describe('metadata.json builder', () => {
	it('fills in everything Audiobookshelf reads', () => {
		expect(build(makeBook())).toEqual({
			title: 'For We Are Many',
			subtitle: 'Bobiverse, Book 2',
			authors: ['Dennis E. Taylor'],
			narrators: ['Ray Porter'],
			series: ['Bobiverse #2'],
			genres: ['Science Fiction', 'Space Opera'],
			description: 'Bob and his clones...',
			isbn: '9781680680591',
			asin: 'B01N17THEO',
			publishedYear: '2017',
			publishedDate: '2017-04-18'
		});
	});

	it('keeps decimal and range sequences', () => {
		expect(build(makeBook({ series_sequence: '2.5' })).series).toEqual(['Bobiverse #2.5']);
		expect(build(makeBook({ series_sequence: '1-3' })).series).toEqual(['Bobiverse #1-3']);
	});

	it('strips characters Audiobookshelf cannot parse in a sequence', () => {
		// ABS reads the sequence after the last " #" and rejects spaces or another "#"
		expect(build(makeBook({ series_sequence: '1 - 3' })).series).toEqual(['Bobiverse #1-3']);
		expect(build(makeBook({ series_sequence: '#4' })).series).toEqual(['Bobiverse #4']);
	});

	it('writes just the series name when there is no sequence', () => {
		expect(build(makeBook({ series_sequence: null })).series).toEqual(['Bobiverse']);
	});

	it('writes no series for a standalone book', () => {
		expect(build(makeBook({ series: null, series_sequence: null })).series).toEqual([]);
	});

	it('writes cleared text fields as empty strings, which ABS applies (it skips nulls)', () => {
		const m = build(makeBook({ subtitle: null, description: null, isbn: null }));
		expect(m.subtitle).toBe('');
		expect(m.description).toBe('');
		expect(m.isbn).toBe('');
	});

	it('leaves out the release date when it is unknown', () => {
		const m = build(makeBook({ release_date: BigInt(0) }));
		expect(m.publishedYear).toBeUndefined();
		expect(m.publishedDate).toBeUndefined();
	});
});
