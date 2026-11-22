// Client tests against a fake Audiobookshelf server, so they run without a real one.
// The fake follows the behavior verified against Audiobookshelf 2.37.2.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as http from 'node:http';
import type { AddressInfo } from 'node:net';
import * as abs from '.';
import { AbsError, type Connection } from './types';

const ADMIN = 'admin-key';
const READER = 'reader-key';
const LIBRARY = 'lib1';
const ITEM_COUNT = 450; // more than one page (pages are 200)

let server: http.Server;
let base = '';
/** Polls of /api/tasks still to report the scan as running */
let scanPollsRemaining = 0;
const watcherUpdates: unknown[] = [];
const deleted: string[] = [];

const send = (res: http.ServerResponse, status: number, body?: unknown) => {
	if (body === undefined) {
		res.writeHead(status, { 'Content-Type': 'text/plain' });
		res.end(status === 200 ? 'OK' : String(status));
	} else {
		res.writeHead(status, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify(body));
	}
};

const readBody = (req: http.IncomingMessage) =>
	new Promise<string>((resolve) => {
		let data = '';
		req.on('data', (c) => (data += c));
		req.on('end', () => resolve(data));
	});

beforeAll(async () => {
	server = http.createServer(async (req, res) => {
		const url = new URL(req.url ?? '/', 'http://x');
		const p = url.pathname;
		const key = (req.headers.authorization ?? '').replace('Bearer ', '');

		if (p === '/status')
			return send(res, 200, { app: 'audiobookshelf', serverVersion: '2.37.2', isInit: true });
		if (p.startsWith('/hang')) return; // never answers
		if (p === '/not-json/status') {
			res.writeHead(200, { 'Content-Type': 'text/html' });
			return res.end('<html>hello</html>');
		}
		if (key !== ADMIN && key !== READER) return send(res, 401);
		const admin = key === ADMIN;

		if (p === '/api/me')
			return send(res, 200, {
				id: 'u',
				username: admin ? 'root' : 'reader',
				type: admin ? 'root' : 'user',
				isActive: true
			});
		if (p === '/api/libraries')
			return send(res, 200, {
				libraries: [
					{
						id: LIBRARY,
						name: 'Audiobooks',
						mediaType: 'book',
						folders: [{ id: 'f1', fullPath: '/audiobooks' }]
					},
					{ id: 'pods', name: 'Podcasts', mediaType: 'podcast', folders: [] }
				]
			});
		if (p === `/api/libraries/${LIBRARY}`)
			return send(res, 200, {
				id: LIBRARY,
				name: 'Audiobooks',
				mediaType: 'book',
				folders: [{ id: 'f1', fullPath: '/audiobooks' }]
			});
		if (p === '/api/libraries/pods')
			return send(res, 200, { id: 'pods', name: 'Podcasts', mediaType: 'podcast', folders: [] });
		if (p === `/api/libraries/${LIBRARY}/items`) {
			const limit = Number(url.searchParams.get('limit'));
			const page = Number(url.searchParams.get('page'));
			const results = [];
			for (let i = page * limit; i < Math.min(ITEM_COUNT, (page + 1) * limit); i++)
				results.push({
					id: `item${i}`,
					relPath: `Author/Book ${i}`,
					isMissing: false,
					media: { metadata: { asin: `ASIN${i}` } }
				});
			return send(res, 200, { results, total: ITEM_COUNT, limit, page });
		}
		if (p === `/api/libraries/${LIBRARY}/scan`) {
			if (!admin) return send(res, 403);
			scanPollsRemaining = 3;
			return send(res, 200);
		}
		if (p === '/api/tasks') {
			const running = scanPollsRemaining > 0;
			if (running) scanPollsRemaining--;
			return send(res, 200, {
				tasks: running
					? [
							{
								id: 't',
								action: 'library-scan',
								data: { libraryId: LIBRARY },
								isFinished: false,
								isFailed: false
							}
					  ]
					: []
			});
		}
		if (p === '/api/watcher/update') {
			if (!admin) return send(res, 403);
			watcherUpdates.push(JSON.parse(await readBody(req)));
			return send(res, 200);
		}
		const itemScan = p.match(/^\/api\/items\/([^/]+)\/scan$/);
		if (itemScan)
			return itemScan[1] === 'item1' ? send(res, 200, { result: 'UPDATED' }) : send(res, 404);
		const item = p.match(/^\/api\/items\/([^/]+)$/);
		if (item && req.method === 'DELETE') {
			deleted.push(item[1] + (url.searchParams.has('hard') ? '?hard' : ''));
			return send(res, 200);
		}
		return send(res, 404);
	});
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
	server.closeAllConnections?.();
	server.close();
});

const conn = (overrides: Partial<Connection> = {}): Connection => ({
	address: base,
	apiKey: ADMIN,
	...overrides
});
const errorOf = (r: abs.types.Result<unknown>) => (r.ok ? null : r.error);

describe('normalizeAddress', () => {
	it('drops trailing slashes and keeps a base path', () => {
		expect(abs.normalizeAddress('http://h:80/')).toBe('http://h:80');
		expect(abs.normalizeAddress(' https://h/abs// ')).toBe('https://h/abs');
	});
	it('rejects anything that is not an http(s) URL', () => {
		expect(abs.normalizeAddress('ftp://h')).toBeNull();
		expect(abs.normalizeAddress('audiobookshelf')).toBeNull();
		expect(abs.normalizeAddress('')).toBeNull();
	});
});

describe('testConnection', () => {
	it('succeeds with an admin key', async () => {
		const r = await abs.testConnection(conn({ address: base + '/' }));
		expect(r).toEqual({
			ok: true,
			value: { serverVersion: '2.37.2', username: 'root', userType: 'root' }
		});
	});
	it('explains each failure', async () => {
		expect(errorOf(await abs.testConnection(conn({ address: 'nope' })))).toBe(
			AbsError.INVALID_ADDRESS
		);
		expect(errorOf(await abs.testConnection(conn({ apiKey: ' ' })))).toBe(AbsError.NO_API_KEY);
		expect(errorOf(await abs.testConnection(conn({ address: 'http://127.0.0.1:1' })))).toBe(
			AbsError.UNREACHABLE
		);
		expect(errorOf(await abs.testConnection(conn({ address: base + '/not-json' })))).toBe(
			AbsError.NOT_AUDIOBOOKSHELF
		);
		expect(errorOf(await abs.testConnection(conn({ apiKey: 'wrong' })))).toBe(
			AbsError.UNAUTHORIZED
		);
		const reader = await abs.testConnection(conn({ apiKey: READER }));
		expect(errorOf(reader)).toBe(AbsError.NOT_ADMIN);
		expect(reader.ok ? '' : reader.message).toContain("'reader'");
	});
	it('times out instead of hanging', async () => {
		const start = Date.now();
		const r = await abs.testConnection(conn({ address: base + '/hang', timeoutMs: 200 }));
		expect(errorOf(r)).toBe(AbsError.TIMEOUT);
		expect(Date.now() - start).toBeLessThan(2000);
	});
});

describe('libraries and items', () => {
	it('lists book libraries only, unless asked', async () => {
		const books = await abs.getLibraries(conn());
		expect(books.ok && books.value.map((l) => l.id)).toEqual([LIBRARY]);
		const all = await abs.getLibraries(conn(), false);
		expect(all.ok && all.value.length).toBe(2);
	});
	it('rejects podcast libraries and unknown ones', async () => {
		expect(errorOf(await abs.getLibrary(conn(), 'pods'))).toBe(AbsError.NOT_A_BOOK_LIBRARY);
		expect(errorOf(await abs.getLibrary(conn(), 'nope'))).toBe(AbsError.NOT_FOUND);
	});
	it('pages through every item', async () => {
		const items = await abs.getLibraryItems(conn(), LIBRARY);
		expect(items.ok && items.value.length).toBe(ITEM_COUNT);
		expect(items.ok && new Set(items.value.map((i) => i.id)).size).toBe(ITEM_COUNT);
	});
});

describe('scanning', () => {
	it('waits for a library scan to finish', async () => {
		const r = await abs.scanLibrary(conn(), LIBRARY, { pollMs: 10 });
		expect(r.ok).toBe(true);
		expect(scanPollsRemaining).toBe(0);
	});
	it('gives up after the timeout', async () => {
		// The fake resets the counter when a scan starts, so keep reporting "running" from the first poll
		const keepRunning = setInterval(() => (scanPollsRemaining = 1_000_000), 1);
		const r = await abs.scanLibrary(conn(), LIBRARY, { pollMs: 10, timeoutMs: 100 });
		clearInterval(keepRunning);
		expect(errorOf(r)).toBe(AbsError.SCAN_TIMEOUT);
		scanPollsRemaining = 0;
	});
	it('refuses a non-admin key', async () => {
		expect(errorOf(await abs.startLibraryScan(conn({ apiKey: READER }), LIBRARY))).toBe(
			AbsError.NOT_ADMIN
		);
	});
	it('rescans a single item', async () => {
		const r = await abs.scanItem(conn(), 'item1');
		expect(r).toEqual({ ok: true, value: 'UPDATED' });
		expect(errorOf(await abs.scanItem(conn(), 'missing'))).toBe(AbsError.NOT_FOUND);
	});
	it("tells the watcher about a new file, at ABS's path", async () => {
		const lib = await abs.getLibrary(conn(), LIBRARY);
		if (!lib.ok) throw new Error(lib.message);
		const r = await abs.notifyFileAdded(
			conn(),
			lib.value,
			'Martha Wells/All Systems Red/All Systems Red.m4b'
		);
		expect(r.ok).toBe(true);
		expect(watcherUpdates.at(-1)).toEqual({
			libraryId: LIBRARY,
			path: '/audiobooks/Martha Wells/All Systems Red/All Systems Red.m4b',
			type: 'add'
		});
	});
	it('waits for an item to appear', async () => {
		const r = await abs.waitForItem(conn(), LIBRARY, (i) => i.media.metadata.asin === 'ASIN449', {
			pollMs: 10
		});
		expect(r.ok && r.value.id).toBe('item449');
		const missing = await abs.waitForItem(conn(), LIBRARY, () => false, {
			pollMs: 10,
			timeoutMs: 50
		});
		expect(errorOf(missing)).toBe(AbsError.ITEM_TIMEOUT);
	});
});

describe('items and links', () => {
	it('deletes items without touching files', async () => {
		expect((await abs.deleteItem(conn(), 'item7')).ok).toBe(true);
		expect(deleted).toEqual(['item7']); // never ?hard
	});
	it('builds web links, keeping a base path', () => {
		expect(abs.itemUrl('http://h:13378/', 'abc')).toBe('http://h:13378/item/abc');
		expect(abs.seriesUrl('https://h/abs', 'L', 'S')).toBe('https://h/abs/library/L/series/S');
		expect(abs.itemUrl('nope', 'abc')).toBeNull();
	});
});
