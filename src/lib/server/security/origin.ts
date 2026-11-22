/**
 * Cross-site form protection.
 *
 * SvelteKit's own check compares the browser's `Origin` header with the `ORIGIN` environment
 * variable. When those differ (the instance is opened by IP, by a second hostname, or `ORIGIN` was
 * never changed from its default) every form on the site is rejected with a 403. Nothing reaches
 * the app's code, so nothing is logged and the forms appear to do nothing.
 *
 * This check instead compares the `Origin` host with the host the request was actually sent to.
 * A form posted from another site still has a different host and is still rejected.
 */

/** Content types a browser can send cross-site without a CORS preflight */
const FORM_CONTENT_TYPES = [
	'application/x-www-form-urlencoded',
	'multipart/form-data',
	'text/plain'
];
const MUTATING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/** Whether a request is one that cross-site protection applies to */
export const needsOriginCheck = (method: string, contentType: string | null): boolean => {
	if (!MUTATING_METHODS.includes(method.toUpperCase())) return false;
	const type = (contentType ?? '').split(';')[0].trim().toLowerCase();
	return FORM_CONTENT_TYPES.includes(type);
};

/** The host (with port, if any) of a URL, lower-cased; null if it is not a URL */
const hostOf = (url: string): string | null => {
	try {
		return new URL(url).host.toLowerCase();
	} catch (e) {
		return null;
	}
};

/** Remove a default port, so "host:80" and "host" compare equal */
const withoutDefaultPort = (host: string): string => host.replace(/:(80|443)$/, '');

export type OriginCheck = { allowed: true } | { allowed: false; reason: string };

/**
 * Decide whether a form submission comes from this site
 * @param origin the request's `Origin` header
 * @param host the request's `Host` header
 * @param forwardedHost the `X-Forwarded-Host` header set by a reverse proxy, if any
 * @param configuredOrigin the `ORIGIN` environment variable, if set
 */
export const checkOrigin = (
	origin: string | null,
	host: string | null,
	forwardedHost: string | null,
	configuredOrigin: string | undefined
): OriginCheck => {
	if (origin === null || origin === '' || origin === 'null')
		return { allowed: false, reason: 'the request has no Origin header' };

	const originHost = hostOf(origin);
	if (originHost === null)
		return { allowed: false, reason: `the Origin header '${origin}' is not a URL` };

	const accepted = new Set<string>();
	// A proxy may pass a list ("a, b"); the first entry is the host the browser used
	if (forwardedHost) accepted.add(forwardedHost.split(',')[0].trim().toLowerCase());
	if (host) accepted.add(host.trim().toLowerCase());
	if (configuredOrigin) {
		const configuredHost = hostOf(configuredOrigin);
		if (configuredHost !== null) accepted.add(configuredHost);
	}

	const target = withoutDefaultPort(originHost);
	for (const candidate of accepted)
		if (withoutDefaultPort(candidate) === target) return { allowed: true };

	return {
		allowed: false,
		reason: `the form was sent from '${origin}', but this server was reached as '${
			[...accepted].join("' / '") || 'unknown'
		}'`
	};
};
