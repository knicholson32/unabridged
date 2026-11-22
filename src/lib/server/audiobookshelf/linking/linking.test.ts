import { describe, expect, it } from 'vitest';
import { buildItemIndex, chooseFolder, findItem, toAbsPath, toRelPath } from '.';
import type { Library, LibraryItem } from '../types';

const item = (
	id: string,
	relPath: string,
	asin: string | null,
	isMissing = false
): LibraryItem => ({
	id,
	libraryId: 'lib',
	folderId: 'f1',
	path: `/audiobooks/${relPath}`,
	relPath,
	isMissing,
	isInvalid: false,
	media: {
		metadata: { title: null, subtitle: null, authorName: null, seriesName: null, asin, isbn: null }
	}
});

describe('toRelPath', () => {
	it('gives the path inside the library folder', () => {
		expect(toRelPath('/library/Author/Title', '/library')).toBe('Author/Title');
		expect(toRelPath('/library/Author/Title/Title.m4b', '/library/')).toBe(
			'Author/Title/Title.m4b'
		);
	});
	it('normalizes slashes and dots', () => {
		expect(toRelPath('/library//Author/./Title/', '/library')).toBe('Author/Title');
	});
	it('rejects paths outside the folder, including look-alike prefixes and ..', () => {
		expect(toRelPath('/other/Author', '/library')).toBeNull();
		expect(toRelPath('/libraryX/Author', '/library')).toBeNull();
		expect(toRelPath('/library/../etc/passwd', '/library')).toBeNull();
		expect(toRelPath('/library', '/library')).toBeNull();
	});
});

describe('toAbsPath and chooseFolder', () => {
	const library: Library = {
		id: 'lib',
		name: 'Audiobooks',
		mediaType: 'book',
		folders: [
			{ id: 'f1', fullPath: '/audiobooks' },
			{ id: 'f2', fullPath: '/more/' }
		]
	};
	it('joins a relative path onto the ABS folder', () => {
		expect(toAbsPath('A/B/B.m4b', library.folders[0])).toBe('/audiobooks/A/B/B.m4b');
		expect(toAbsPath('A/B', library.folders[1])).toBe('/more/A/B');
	});
	it('uses the first folder unless one is named', () => {
		expect(chooseFolder(library)?.id).toBe('f1');
		expect(chooseFolder(library, 'f2')?.id).toBe('f2');
		expect(chooseFolder(library, 'nope')).toBeNull();
	});
});

describe('findItem', () => {
	const index = buildItemIndex([
		item('a', 'Dennis E. Taylor/For We Are Many', 'B01N17THEO'),
		item('b', 'Martha Wells/All Systems Red', null),
		// A removed item and its re-added replacement share an ASIN; the present one must win
		item('old', 'B.V. Larson/The Techborn', 'B0DJCFZV5W', true),
		item('new', 'B.V. Larson/The Techborn', 'B0DJCFZV5W')
	]);

	it('finds by ASIN, ignoring case', () => {
		expect(findItem(index, { asin: 'b01n17theo' })?.id).toBe('a');
	});
	it('falls back to the folder path when ABS has no ASIN', () => {
		expect(
			findItem(index, { asin: 'B076XSGP65', relPath: 'Martha Wells/All Systems Red' })?.id
		).toBe('b');
	});
	it('prefers an item that is present over one marked missing', () => {
		expect(findItem(index, { asin: 'B0DJCFZV5W' })?.id).toBe('new');
		expect(findItem(index, { relPath: 'B.V. Larson/The Techborn' })?.id).toBe('new');
	});
	it('returns null when nothing matches', () => {
		expect(findItem(index, { asin: 'NOPE', relPath: 'x/y' })).toBeNull();
		expect(findItem(index, {})).toBeNull();
	});
});
