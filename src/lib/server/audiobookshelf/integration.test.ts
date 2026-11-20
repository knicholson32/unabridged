// Tests against a real Audiobookshelf server. Skipped unless ABS_TEST_URL, ABS_TEST_KEY (an admin
// API key) and ABS_TEST_LIBRARY (a book library ID) are set; see the README. They only read and scan;
// nothing is deleted.

import { describe, expect, it } from 'vitest';
import * as abs from '.';
import type { Connection } from './types';

const url = process.env.ABS_TEST_URL ?? '';
const apiKey = process.env.ABS_TEST_KEY ?? '';
const libraryId = process.env.ABS_TEST_LIBRARY ?? '';
const configured = url !== '' && apiKey !== '' && libraryId !== '';
const conn: Connection = { address: url, apiKey, timeoutMs: 10000 };

describe.skipIf(!configured)('against a real Audiobookshelf server', () => {
	it('connects with an admin key', async () => {
		const r = await abs.testConnection(conn);
		expect(r.ok, r.ok ? '' : r.message).toBe(true);
	});

	it('rejects a wrong key', async () => {
		const r = await abs.testConnection({ ...conn, apiKey: 'not-a-key' });
		expect(r.ok ? null : r.error).toBe(abs.types.AbsError.UNAUTHORIZED);
	});

	it('finds the test library and its folder', async () => {
		const r = await abs.getLibrary(conn, libraryId);
		expect(r.ok, r.ok ? '' : r.message).toBe(true);
		if (r.ok) expect(r.value.folders.length).toBeGreaterThan(0);
	});

	it('lists items, and every present item can be matched by ASIN or path', async () => {
		const items = await abs.getLibraryItems(conn, libraryId);
		expect(items.ok, items.ok ? '' : items.message).toBe(true);
		if (!items.ok) return;
		const index = abs.linking.buildItemIndex(items.value);
		for (const item of items.value.filter((i) => !i.isMissing)) {
			const found = abs.linking.findItem(index, {
				asin: item.media.metadata.asin,
				relPath: item.relPath
			});
			expect(found?.id).toBe(item.id);
		}
	});

	it('runs a library scan to completion', async () => {
		const r = await abs.scanLibrary(conn, libraryId, { pollMs: 500, timeoutMs: 5 * 60 * 1000 });
		expect(r.ok, r.ok ? '' : r.message).toBe(true);
		const scanning = await abs.isLibraryScanning(conn, libraryId);
		expect(scanning.ok && scanning.value).toBe(false);
	}, 6 * 60 * 1000);

	it('rescans a single item', async () => {
		const items = await abs.getLibraryItems(conn, libraryId);
		const first = items.ok ? items.value.find((i) => !i.isMissing) : undefined;
		if (first === undefined) return; // empty library
		const r = await abs.scanItem(conn, first.id);
		expect(r.ok, r.ok ? '' : r.message).toBe(true);
	});

	it('lists series', async () => {
		const r = await abs.getLibrarySeries(conn, libraryId);
		expect(r.ok, r.ok ? '' : r.message).toBe(true);
	});
});
