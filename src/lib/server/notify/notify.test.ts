// Notifier tests against a fake ntfy server. The fake follows ntfy's JSON publishing API
// (POST to the server root with { topic, title, message, ... }) and its JSON error bodies.

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import * as http from 'node:http';
import type { AddressInfo } from 'node:net';

// The module imports settings (and so Prisma); publish() does not use them
vi.mock('$lib/server/settings', () => ({}));
const notify = await import('.');

const TOKEN = 'tk_test';
let server: http.Server;
let base = '';
const received: { url: string; auth: string | undefined; body: Record<string, unknown> }[] = [];

beforeAll(async () => {
	server = http.createServer((req, res) => {
		let data = '';
		req.on('data', (c) => (data += c));
		req.on('end', () => {
			if (req.url?.endsWith('/slow/')) return; // never answers
			const body = JSON.parse(data) as Record<string, unknown>;
			received.push({ url: req.url ?? '', auth: req.headers.authorization, body });
			if (body.topic === 'protected' && req.headers.authorization !== `Bearer ${TOKEN}`) {
				res.writeHead(403, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ code: 40301, http: 403, error: 'forbidden' }));
				return;
			}
			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ id: 'x', event: 'message', topic: body.topic }));
		});
	});
	await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
	base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
	server.closeAllConnections();
	server.close();
});

describe('parseTopicUrl', () => {
	it('splits the server and topic', () => {
		expect(notify.parseTopicUrl('https://ntfy.sh/my-topic')).toEqual({
			server: 'https://ntfy.sh/',
			topic: 'my-topic'
		});
		expect(notify.parseTopicUrl(' https://example.com/ntfy/alerts_1/ ')).toEqual({
			server: 'https://example.com/ntfy/',
			topic: 'alerts_1'
		});
	});
	it('rejects URLs that are not topics', () => {
		expect(notify.parseTopicUrl('https://ntfy.sh')).toBeNull();
		expect(notify.parseTopicUrl('https://ntfy.sh/bad topic')).toBeNull();
		expect(notify.parseTopicUrl('ftp://ntfy.sh/topic')).toBeNull();
		expect(notify.parseTopicUrl('not a url')).toBeNull();
	});
});

describe('publish', () => {
	it('sends JSON to the server root, with non-ASCII titles intact and a click link', async () => {
		const r = await notify.publish(
			`${base}/prefix/alerts`,
			'',
			{
				title: 'Download failed: Les Misérables — Part 1',
				message: 'x',
				path: '/library/books/B0'
			},
			'https://unabridged.example.com/'
		);
		expect(r).toEqual({ ok: true });
		const last = received.at(-1)!;
		expect(last.url).toBe('/prefix/');
		expect(last.auth).toBeUndefined();
		expect(last.body).toEqual({
			topic: 'alerts',
			title: 'Download failed: Les Misérables — Part 1',
			message: 'x',
			priority: 3,
			click: 'https://unabridged.example.com/library/books/B0'
		});
	});
	it('leaves out the link when no Unabridged URL is set', async () => {
		await notify.publish(`${base}/alerts`, '', { title: 't', message: 'm', path: '/x' });
		expect(received.at(-1)!.body.click).toBeUndefined();
	});
	it('sends the access token and explains a refusal', async () => {
		expect(await notify.publish(`${base}/protected`, TOKEN, { title: 't', message: 'm' })).toEqual({
			ok: true
		});
		expect(received.at(-1)!.auth).toBe(`Bearer ${TOKEN}`);
		const r = await notify.publish(`${base}/protected`, 'wrong', { title: 't', message: 'm' });
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.message).toMatch(/403: forbidden.*access token/);
	});
	it('reports an unreachable server', async () => {
		const r = await notify.publish('http://127.0.0.1:1/alerts', '', { title: 't', message: 'm' });
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.message).toMatch(/Could not reach ntfy/);
	});
	it('reports a bad topic URL without sending', async () => {
		const n = received.length;
		const r = await notify.publish('https://ntfy.sh', '', { title: 't', message: 'm' });
		expect(r.ok).toBe(false);
		expect(received.length).toBe(n);
	});
});
