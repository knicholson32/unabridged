import type { Library, LibraryFolder, LibraryItem } from '../types';

// Unabridged and Audiobookshelf usually see the same files under different mount points (e.g.
// `/library` and `/audiobooks`). Both describe a book by its path relative to their library folder
// (`Author/Title`), so books are matched on that relative path, and on ASIN when the metadata.json
// sidecar has given ABS one. ABS item IDs change if an item is removed and re-added, so these are
// matched again rather than trusted forever.

/** Collapse repeated slashes, resolve `.` and `..`, and drop a trailing slash (POSIX paths) */
const normalizePath = (p: string): string => {
	const parts: string[] = [];
	for (const part of p.split('/')) {
		if (part === '' || part === '.') continue;
		if (part === '..') parts.pop();
		else parts.push(part);
	}
	return (p.startsWith('/') ? '/' : '') + parts.join('/');
};

/**
 * Get a book folder's path relative to the Unabridged library folder
 * @param localPath the folder (or a file in it) as Unabridged sees it
 * @param localRoot the Unabridged library folder (`library.location`)
 * @returns the relative folder path, e.g. `Author/Title`, or null if it is outside the root
 */
export const toRelPath = (localPath: string, localRoot: string): string | null => {
	const root = normalizePath(localRoot);
	const full = normalizePath(localPath);
	const prefix = root.endsWith('/') ? root : root + '/';
	if (!full.startsWith(prefix) || full.length === prefix.length) return null;
	return full.substring(prefix.length);
};

/**
 * Choose the library folder that holds Unabridged's books. With one folder there is no choice;
 * with several, the first is used unless one is named.
 */
export const chooseFolder = (library: Library, folderId?: string | null): LibraryFolder | null => {
	if (folderId) return library.folders.find((f) => f.id === folderId) ?? null;
	return library.folders[0] ?? null;
};

/**
 * Get a path as the Audiobookshelf server sees it
 * @param relPath a path relative to the library folder
 * @param folder the ABS library folder
 */
export const toAbsPath = (relPath: string, folder: LibraryFolder): string =>
	normalizePath(`${folder.fullPath}/${relPath}`);

/** Lookup tables for a library's items */
export type ItemIndex = {
	byAsin: Map<string, LibraryItem>;
	byRelPath: Map<string, LibraryItem>;
};

/**
 * Index a library's items by ASIN and relative path. When two items share a key, one that is
 * present on disk is preferred over one ABS has marked missing.
 */
export const buildItemIndex = (items: LibraryItem[]): ItemIndex => {
	const byAsin = new Map<string, LibraryItem>();
	const byRelPath = new Map<string, LibraryItem>();
	const put = (map: Map<string, LibraryItem>, key: string, item: LibraryItem) => {
		const existing = map.get(key);
		if (existing === undefined || (existing.isMissing && !item.isMissing)) map.set(key, item);
	};
	for (const item of items) {
		const asin = item.media?.metadata?.asin;
		if (asin) put(byAsin, asin.toUpperCase(), item);
		put(byRelPath, item.relPath, item);
	}
	return { byAsin, byRelPath };
};

/**
 * Find the ABS item for a book, by ASIN first and then by relative path
 * @returns the item, or null if ABS does not have it
 */
export const findItem = (
	index: ItemIndex,
	book: { asin?: string | null; relPath?: string | null }
): LibraryItem | null => {
	if (book.asin) {
		const item = index.byAsin.get(book.asin.toUpperCase());
		if (item !== undefined) return item;
	}
	if (book.relPath) {
		const item = index.byRelPath.get(book.relPath);
		if (item !== undefined) return item;
	}
	return null;
};
