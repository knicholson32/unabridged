import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

// The library location comes from settings; point it at a temporary folder instead of the database
const library = fs.mkdtempSync(path.join(os.tmpdir(), 'unabridged-library-'));
vi.mock('$lib/server/settings', () => ({ get: async () => library }));
vi.mock('$lib/server/prisma', () => ({ default: {} }));

const { folderKey, locateBookFolder } = await import('$lib/server/metadata');

type BookInput = Parameters<typeof locateBookFolder>[0];
const book = (overrides: Partial<Record<string, unknown>> = {}): BookInput =>
	({
		asin: 'B073H9PF2D',
		title: 'Leviathan Wakes',
		authors: [{ name: 'James S. A. Corey' }],
		media: [],
		...overrides
	}) as unknown as BookInput;

/** Create a book folder holding an .m4b (and optionally a metadata.json) */
const makeBook = (rel: string, asin?: string) => {
	const folder = path.join(library, rel);
	fs.mkdirSync(folder, { recursive: true });
	fs.writeFileSync(path.join(folder, `${path.basename(rel)}.m4b`), '');
	if (asin) fs.writeFileSync(path.join(folder, 'metadata.json'), JSON.stringify({ asin }));
	return folder;
};

beforeAll(() => {
	fs.mkdirSync(library, { recursive: true });
});
afterAll(() => fs.rmSync(library, { recursive: true, force: true }));

describe('folderKey', () => {
	it('ignores spacing, punctuation, case and accents', () => {
		expect(folderKey('James S.A. Corey')).toBe(folderKey('James S. A. Corey'));
		expect(folderKey('Leviathan Wakes')).toBe(folderKey('leviathan  wakes!'));
		expect(folderKey('Brontë')).toBe('bronte');
		expect(folderKey('Leviathan Wakes')).not.toBe(folderKey('Leviathan Wakes 2'));
	});
});

describe('locateBookFolder', () => {
	it('uses the naming scheme when the folder is there', async () => {
		const folder = makeBook('Plain Author/Plain Title');
		const result = await locateBookFolder(
			book({ title: 'Plain Title', authors: [{ name: 'Plain Author' }] })
		);
		expect(result.folder).toBe(folder);
	});

	it('finds a folder whose author or title is spelled slightly differently', async () => {
		const folder = makeBook('James S.A. Corey/Leviathan Wakes');
		const result = await locateBookFolder(book());
		expect(result.folder).toBe(folder);
		expect(result.tried.at(-1)).toContain('found by author and title');
	});

	it('finds a folder by its metadata.json, wherever it is', async () => {
		const folder = makeBook('Someone Else/A Renamed Book', 'B000RENAMED');
		const result = await locateBookFolder(book({ asin: 'B000RENAMED', title: 'Original Title' }));
		expect(result.folder).toBe(folder);
		expect(result.tried.at(-1)).toContain('found by metadata.json');
	});

	it('ignores matching folders that have no audio, and lists what the author folder holds', async () => {
		fs.mkdirSync(path.join(library, 'Empty Author/Gone Book'), { recursive: true });
		makeBook('Empty Author/Another Book');
		const result = await locateBookFolder(
			book({ asin: 'B000GONE', title: 'Gone Book', authors: [{ name: 'Empty Author' }] })
		);
		expect(result.folder).toBeNull();
		expect(result.tried.join('\n')).toContain('exists but has no .m4b');
		expect(result.tried.at(-1)).toContain("'Another Book'");
	});

	it('reports a recorded .m4b whose folder has gone', async () => {
		const result = await locateBookFolder(
			book({
				asin: 'B000MOVED',
				title: 'Nowhere',
				authors: [{ name: 'Nobody' }],
				media: [{ is_file: true, extension: 'm4b', path: '/somewhere/else/Nowhere.m4b' }]
			})
		);
		expect(result.folder).toBeNull();
		expect(result.tried[0]).toBe('recorded .m4b: /somewhere/else (does not exist)');
	});
});
