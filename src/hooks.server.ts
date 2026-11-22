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

export const handle: Handle = async ({ event, resolve }) => {
	const { request, url } = event;

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
	if (action === null) return resolve(event);

	let debug = 0;
	try {
		debug = await settings.get('system.debug');
	} catch (e) {
		// Settings unavailable (e.g. during a migration); carry on without logging
	}

	const started = Date.now();
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
