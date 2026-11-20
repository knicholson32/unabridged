import { describe, expect, it } from 'vitest';
import { compareSeriesSequence, normalizeSeriesSequence, seriesSequenceNumber } from '$lib/helpers';

describe('normalizeSeriesSequence', () => {
	it('keeps whole numbers, decimals and ranges as given', () => {
		expect(normalizeSeriesSequence('2')).toBe('2');
		expect(normalizeSeriesSequence('1.5')).toBe('1.5');
		expect(normalizeSeriesSequence('1-3')).toBe('1-3');
	});
	it('trims, and treats blank or missing as no sequence', () => {
		expect(normalizeSeriesSequence(' 3 ')).toBe('3');
		expect(normalizeSeriesSequence('')).toBeNull();
		expect(normalizeSeriesSequence('   ')).toBeNull();
		expect(normalizeSeriesSequence(undefined)).toBeNull();
		expect(normalizeSeriesSequence(null)).toBeNull();
	});
});

describe('seriesSequenceNumber', () => {
	it('reads the leading number', () => {
		expect(seriesSequenceNumber('2')).toBe(2);
		expect(seriesSequenceNumber('0.5')).toBe(0.5);
		expect(seriesSequenceNumber('1-3')).toBe(1);
		expect(seriesSequenceNumber('10')).toBe(10);
	});
	it('is NaN when there is no leading number', () => {
		expect(seriesSequenceNumber('Prequel')).toBeNaN();
	});
});

describe('compareSeriesSequence', () => {
	it('sorts like a reader would expect, with missing sequences last', () => {
		// Values seen in a real Audible library export
		const values = ['10', null, '2', '1-3', '1.5', '1', '0.5', 'Prequel', '1-2', '6.5', '3', '3-4'];
		expect([...values].sort(compareSeriesSequence)).toEqual([
			'0.5',
			'1',
			'1-2',
			'1-3',
			'1.5',
			'2',
			'3',
			'3-4',
			'6.5',
			'10',
			'Prequel',
			null
		]);
	});
	it('sorts numerically, not as text', () => {
		expect(compareSeriesSequence('2', '10')).toBeLessThan(0);
		expect(compareSeriesSequence('10', '9')).toBeGreaterThan(0);
	});
	it('treats equal sequences as equal, so callers can break ties by title', () => {
		expect(compareSeriesSequence('2', '2')).toBe(0);
		expect(compareSeriesSequence(null, null)).toBe(0);
	});
});
