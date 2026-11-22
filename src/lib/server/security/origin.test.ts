import { describe, expect, it } from 'vitest';
import { checkOrigin, needsOriginCheck } from './origin';

describe('needsOriginCheck', () => {
	it('applies to form posts only', () => {
		expect(needsOriginCheck('POST', 'application/x-www-form-urlencoded')).toBe(true);
		expect(needsOriginCheck('POST', 'multipart/form-data; boundary=x')).toBe(true);
		expect(needsOriginCheck('delete', 'text/plain;charset=UTF-8')).toBe(true);
		expect(needsOriginCheck('GET', 'application/x-www-form-urlencoded')).toBe(false);
		expect(needsOriginCheck('POST', 'application/json')).toBe(false);
		expect(needsOriginCheck('POST', null)).toBe(false);
	});
});

describe('checkOrigin', () => {
	it('allows a form sent from the address the server was reached on, whatever ORIGIN says', () => {
		// The deployed case: opened by IP while ORIGIN still has its default
		expect(
			checkOrigin('http://192.168.1.50:3000', '192.168.1.50:3000', null, 'http://localhost:3000')
		).toEqual({ allowed: true });
	});

	it('allows the forwarded host behind a reverse proxy', () => {
		expect(
			checkOrigin(
				'https://unabridged.example.org',
				'unabridged:3000',
				'unabridged.example.org',
				undefined
			)
		).toEqual({ allowed: true });
		expect(
			checkOrigin('https://a.example.org', 'x', 'a.example.org, proxy.local', undefined)
		).toEqual({
			allowed: true
		});
	});

	it('allows the configured ORIGIN and ignores default ports and case', () => {
		expect(
			checkOrigin(
				'https://Unabridged.example.org:443',
				'internal:3000',
				null,
				'https://unabridged.example.org'
			)
		).toEqual({
			allowed: true
		});
	});

	it('rejects forms from other sites, and requests without an Origin', () => {
		const other = checkOrigin(
			'https://evil.example.com',
			'192.168.1.50:3000',
			null,
			'http://localhost:3000'
		);
		expect(other.allowed).toBe(false);
		if (!other.allowed) expect(other.reason).toContain('evil.example.com');
		expect(
			checkOrigin('http://192.168.1.50:3001', '192.168.1.50:3000', null, undefined).allowed
		).toBe(false);
		expect(checkOrigin(null, 'localhost:3000', null, undefined).allowed).toBe(false);
		expect(checkOrigin('null', 'localhost:3000', null, undefined).allowed).toBe(false);
	});
});
