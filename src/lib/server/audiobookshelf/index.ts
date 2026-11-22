// Audiobookshelf client. Every function takes the connection explicitly and returns a Result, so
// this module has no dependency on Unabridged's settings or database.
//
// Verified against Audiobookshelf 2.37.2. Scanning and watcher updates require an admin API key.

import { normalizeAddress, request } from './client';
import { chooseFolder, toAbsPath } from './linking';
import {
	AbsError,
	fail,
	ok,
	type Author,
	type AuthorMatchResult,
	type Connection,
	type ConnectionInfo,
	type ItemScanResult,
	type Library,
	type LibraryItem,
	type LibraryItemsPage,
	type Result,
	type Series,
	type ServerStatus,
	type Task,
	type User
} from './types';

export * as linking from './linking';
export * as types from './types';
export { normalizeAddress } from './client';

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// -------------------------------------------------------------------------------------------------
// Connection
// -------------------------------------------------------------------------------------------------

/**
 * Check that the address is an Audiobookshelf server and that the API key belongs to an active
 * admin user (needed to scan libraries)
 * @returns the server version and the key's user
 */
export const testConnection = async (conn: Connection): Promise<Result<ConnectionInfo>> => {
	const status = await request<ServerStatus>(conn, '/status', { auth: false });
	if (!status.ok) {
		// Something answered, but not with ABS's status page
		if (status.error === AbsError.NOT_FOUND || status.error === AbsError.UNEXPECTED_RESPONSE)
			return fail(AbsError.NOT_AUDIOBOOKSHELF);
		return status;
	}
	if (status.value?.app !== 'audiobookshelf') return fail(AbsError.NOT_AUDIOBOOKSHELF);

	const me = await request<User>(conn, '/api/me');
	if (!me.ok) return me;
	if (!me.value.isActive)
		return fail(AbsError.UNAUTHORIZED, `The ABS user '${me.value.username}' is disabled.`);
	if (me.value.type !== 'root' && me.value.type !== 'admin')
		return fail(
			AbsError.NOT_ADMIN,
			`The API key belongs to '${me.value.username}', who is not an Audiobookshelf admin. Scanning libraries needs an admin's API key.`
		);

	return ok({
		serverVersion: status.value.serverVersion,
		username: me.value.username,
		userType: me.value.type
	});
};

// -------------------------------------------------------------------------------------------------
// Libraries
// -------------------------------------------------------------------------------------------------

/**
 * List the server's libraries
 * @param booksOnly leave out podcast libraries. Defaults to true.
 */
export const getLibraries = async (
	conn: Connection,
	booksOnly = true
): Promise<Result<Library[]>> => {
	const result = await request<{ libraries: Library[] }>(conn, '/api/libraries');
	if (!result.ok) return result;
	const libraries = result.value.libraries ?? [];
	return ok(booksOnly ? libraries.filter((l) => l.mediaType === 'book') : libraries);
};

/** Get one library, checking that it holds books */
export const getLibrary = async (conn: Connection, libraryId: string): Promise<Result<Library>> => {
	const result = await request<Library>(conn, `/api/libraries/${encodeURIComponent(libraryId)}`);
	if (!result.ok) return result;
	if (result.value.mediaType !== 'book') return fail(AbsError.NOT_A_BOOK_LIBRARY);
	return result;
};

/**
 * Get every item in a library (paged internally)
 */
export const getLibraryItems = async (
	conn: Connection,
	libraryId: string
): Promise<Result<LibraryItem[]>> => {
	const items: LibraryItem[] = [];
	const limit = 200;
	for (let page = 0; ; page++) {
		const result = await request<LibraryItemsPage>(
			conn,
			`/api/libraries/${encodeURIComponent(libraryId)}/items`,
			{ query: { minified: 1, limit, page } }
		);
		if (!result.ok) return result;
		const results = result.value.results ?? [];
		items.push(...results);
		if (results.length < limit || items.length >= result.value.total) break;
	}
	return ok(items);
};

/**
 * Get every series in a library (paged internally)
 */
export const getLibrarySeries = async (
	conn: Connection,
	libraryId: string
): Promise<Result<Series[]>> => {
	const series: Series[] = [];
	const limit = 200;
	for (let page = 0; ; page++) {
		const result = await request<{ results: Series[]; total: number }>(
			conn,
			`/api/libraries/${encodeURIComponent(libraryId)}/series`,
			{ query: { minified: 1, limit, page } }
		);
		if (!result.ok) return result;
		const results = result.value.results ?? [];
		series.push(...results);
		if (results.length < limit || series.length >= result.value.total) break;
	}
	return ok(series);
};

// -------------------------------------------------------------------------------------------------
// Scanning
// -------------------------------------------------------------------------------------------------

/**
 * Start a scan of a library. Returns as soon as ABS accepts it; use `scanLibrary` to wait.
 * @param force rescan every item, not only changed ones
 */
export const startLibraryScan = async (
	conn: Connection,
	libraryId: string,
	force = false
): Promise<Result<void>> =>
	request<void>(conn, `/api/libraries/${encodeURIComponent(libraryId)}/scan`, {
		method: 'POST',
		query: force ? { force: 1 } : undefined,
		json: false
	});

/** Whether ABS is currently scanning a library */
export const isLibraryScanning = async (
	conn: Connection,
	libraryId: string
): Promise<Result<boolean>> => {
	const result = await request<{ tasks: Task[] }>(conn, '/api/tasks');
	if (!result.ok) return result;
	return ok(
		(result.value.tasks ?? []).some(
			(t) => t.action === 'library-scan' && t.data?.libraryId === libraryId && !t.isFinished
		)
	);
};

/**
 * Scan a library and wait for the scan to finish. ABS's scan endpoint returns immediately, so this
 * polls ABS's task list until the scan's task is gone.
 */
export const scanLibrary = async (
	conn: Connection,
	libraryId: string,
	options: {
		force?: boolean;
		/** Give up after this long. Defaults to 20 minutes. */
		timeoutMs?: number;
		pollMs?: number;
		/** Called with the elapsed time while the scan runs */
		onProgress?: (elapsedMs: number) => void;
	} = {}
): Promise<Result<void>> => {
	const { force = false, timeoutMs = 20 * 60 * 1000, pollMs = 2000, onProgress } = options;

	const started = await startLibraryScan(conn, libraryId, force);
	if (!started.ok) return started;

	// A small library can finish before its task is ever seen, so a scan that never appears is
	// treated as finished after a short grace period.
	const graceMs = Math.min(3000, timeoutMs);
	const start = Date.now();
	let seen = false;
	while (Date.now() - start < timeoutMs) {
		const scanning = await isLibraryScanning(conn, libraryId);
		if (!scanning.ok) return scanning;
		if (scanning.value) seen = true;
		else if (seen || Date.now() - start >= graceMs) return ok(undefined);
		onProgress?.(Date.now() - start);
		await delay(pollMs);
	}
	return fail(AbsError.SCAN_TIMEOUT);
};

/**
 * Rescan a single item, e.g. after its metadata.json changed. Waits for the result.
 */
export const scanItem = async (
	conn: Connection,
	itemId: string
): Promise<Result<ItemScanResult>> => {
	const result = await request<{ result: ItemScanResult }>(
		conn,
		`/api/items/${encodeURIComponent(itemId)}/scan`,
		{ method: 'POST', timeoutMs: 60000 }
	);
	if (!result.ok) return result;
	return ok(result.value.result);
};

/**
 * Tell ABS that a book's audio file was added, so it picks the book up without a full library
 * scan. ABS processes this after its watcher's short delay (about 10-15 seconds); use
 * `waitForItem` to wait for the item.
 * @param relFilePath the audio file's path relative to the library folder, e.g. `Author/Title/Title.m4b`
 */
export const notifyFileAdded = async (
	conn: Connection,
	library: Library,
	relFilePath: string,
	folderId?: string | null
): Promise<Result<void>> => {
	const folder = chooseFolder(library, folderId);
	if (folder === null)
		return fail(AbsError.NOT_FOUND, 'The Audiobookshelf library has no folders.');
	return request<void>(conn, '/api/watcher/update', {
		method: 'POST',
		body: { libraryId: library.id, path: toAbsPath(relFilePath, folder), type: 'add' },
		json: false
	});
};

/**
 * Wait until ABS has an item (present on disk) for a book
 * @param match is called with each item and returns whether it is the book
 */
export const waitForItem = async (
	conn: Connection,
	libraryId: string,
	match: (item: LibraryItem) => boolean,
	options: { timeoutMs?: number; pollMs?: number } = {}
): Promise<Result<LibraryItem>> => {
	const { timeoutMs = 60000, pollMs = 2000 } = options;
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		const items = await getLibraryItems(conn, libraryId);
		if (!items.ok) return items;
		const item = items.value.find((i) => !i.isMissing && match(i));
		if (item !== undefined) return ok(item);
		await delay(pollMs);
	}
	return fail(AbsError.ITEM_TIMEOUT);
};

// -------------------------------------------------------------------------------------------------
// Items
// -------------------------------------------------------------------------------------------------

/** Get one item */
export const getItem = async (conn: Connection, itemId: string): Promise<Result<LibraryItem>> =>
	request<LibraryItem>(conn, `/api/items/${encodeURIComponent(itemId)}`);

/**
 * Remove an item from ABS. Files on disk are never touched (no `hard=1`); Unabridged deletes
 * those itself.
 */
export const deleteItem = async (conn: Connection, itemId: string): Promise<Result<void>> =>
	request<void>(conn, `/api/items/${encodeURIComponent(itemId)}`, {
		method: 'DELETE',
		json: false
	});

// -------------------------------------------------------------------------------------------------
// Authors
// -------------------------------------------------------------------------------------------------

/**
 * Get an author, including whether ABS has an image for them
 */
export const getAuthor = async (conn: Connection, authorId: string): Promise<Result<Author>> =>
	request<Author>(conn, `/api/authors/${encodeURIComponent(authorId)}`);

/**
 * Have ABS look an author up on Audible (through Audnexus) and fill in their image, description
 * and ASIN. Same as "Match" on the author's page. ABS only replaces an existing image when the
 * match finds a different ASIN.
 * @param lookup the author's ASIN if known (more accurate), else their name
 * @param region the Audible region to search, e.g. `us` or `uk`
 * @returns the updated author; fails with NOT_FOUND if Audible has no such author
 */
export const matchAuthor = async (
	conn: Connection,
	authorId: string,
	lookup: { asin?: string | null; name: string },
	region: string
): Promise<Result<AuthorMatchResult>> =>
	request<AuthorMatchResult>(conn, `/api/authors/${encodeURIComponent(authorId)}/match`, {
		method: 'POST',
		body: { q: lookup.name, ...(lookup.asin ? { asin: lookup.asin } : {}), region },
		// The lookup goes out to Audnexus and can take several seconds
		timeoutMs: Math.max(conn.timeoutMs ?? 0, 30000)
	});

// -------------------------------------------------------------------------------------------------
// Links
// -------------------------------------------------------------------------------------------------

/** Link to an item's page in the ABS web app, or null if the address is invalid */
export const itemUrl = (address: string, itemId: string): string | null => {
	const base = normalizeAddress(address);
	return base === null ? null : `${base}/item/${encodeURIComponent(itemId)}`;
};

/** Link to a series page in the ABS web app, or null if the address is invalid */
export const seriesUrl = (address: string, libraryId: string, seriesId: string): string | null => {
	const base = normalizeAddress(address);
	return base === null
		? null
		: `${base}/library/${encodeURIComponent(libraryId)}/series/${encodeURIComponent(seriesId)}`;
};

/** Path of an item's cover on the ABS API (needs the API key, so serve it through a proxy route) */
export const coverPath = (itemId: string): string =>
	`/api/items/${encodeURIComponent(itemId)}/cover`;
