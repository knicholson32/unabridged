import type { Handle } from '@sveltejs/kit';
import { LibraryManager } from '$lib/server/cmd';
import * as settings from '$lib/server/settings';
import { checkOrigin, needsOriginCheck } from '$lib/server/security/origin';

// Start the library manager
LibraryManager.start();

/** Name of the form action a request runs ("?/updateIntegration" → "updateIntegration") */
const actionName = (search: string): string | null => {
	const match = search.match(/^\?\/([^&]*)/);
	if (match !== null) return match[1] === '' ? 'default' : match[1];
	return null;
};

/** The debug level, re-read at most every few seconds so logging adds no database read per request */
let debugLevel = 0;
let debugReadAt = 0;
const getDebug = async (): Promise<number> => {
	if (Date.now() - debugReadAt > 5000) {
		debugReadAt = Date.now();
		try {
			debugLevel = await settings.get('system.debug');
		} catch (e) {
			// Settings unavailable (e.g. during a migration); keep the last value
		}
	}
	return debugLevel;
};

/** How a request reached the server, for the request log: useful when a proxy or tunnel is in between */
const describeRequest = (event: Parameters<Handle>[0]['event']): string => {
	const h = event.request.headers;
	let client = 'unknown';
	try {
		client = event.getClientAddress();
	} catch (e) {
		// Not available in every environment
	}
	const parts = [`from ${h.get('x-forwarded-for') ?? client}`, `host=${h.get('host') ?? '-'}`];
	for (const name of ['x-forwarded-host', 'x-forwarded-proto', 'origin', 'cf-ray'])
		if (h.get(name)) parts.push(`${name}=${h.get(name)}`);
	return parts.join(' ');
};

export const handle: Handle = async ({ event, resolve }) => {
	const { request, url } = event;
	const debug = await getDebug();
	const started = Date.now();

	// Verbose: log every request that reaches the app, so a request that never arrives (a proxy or
	// tunnel problem) can be told apart from one the app fails
	if (debug > 1)
		console.log(`Request ${request.method} ${url.pathname}${url.search} ${describeRequest(event)}`);

	// Cross-site form protection. Replaces SvelteKit's own check (disabled in svelte.config.js),
	// which rejects every form when the instance is opened at an address other than ORIGIN.
	if (needsOriginCheck(request.method, request.headers.get('content-type'))) {
		const check = checkOrigin(
			request.headers.get('origin'),
			request.headers.get('host'),
			request.headers.get('x-forwarded-host'),
			process.env.ORIGIN
		);
		if (!check.allowed) {
			console.warn(
				`Rejected ${request.method} ${url.pathname}${url.search}: ${check.reason}. ` +
					'If this is your own browser, make sure the address you use matches ORIGIN or that your ' +
					'reverse proxy sends X-Forwarded-Host.'
			);
			return new Response('Cross-site form submissions are forbidden', { status: 403 });
		}
	}

	// Log form actions in debug mode
	const action = request.method === 'POST' ? actionName(url.search) : null;
	if (action === null) {
		const response = await resolve(event);
		if (debug > 1 || response.status >= 500)
			console.log(
				`Request ${request.method} ${url.pathname}: HTTP ${response.status} in ${
					Date.now() - started
				} ms`
			);
		return response;
	}

	if (debug > 0) console.log(`Action ${url.pathname} ?/${action}: started`);
	try {
		const response = await resolve(event);
		if (debug > 0 || response.status >= 400)
			console.log(
				`Action ${url.pathname} ?/${action}: HTTP ${response.status} in ${Date.now() - started} ms`
			);
		return response;
	} catch (e) {
		console.error(`Action ${url.pathname} ?/${action}: failed after ${Date.now() - started} ms`, e);
		throw e;
	}
};
