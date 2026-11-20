import { AbsError, fail, ok, type Connection, type Result } from '../types';

const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Normalize a server address: trim it, require http(s) and drop trailing slashes. A base path
 * (ABS's ROUTER_BASE_PATH) is kept.
 * @returns the address, or null if it is not a valid http(s) URL
 */
export const normalizeAddress = (address: string): string | null => {
	const trimmed = address.trim();
	try {
		const url = new URL(trimmed);
		if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
	} catch (e) {
		return null;
	}
	return trimmed.replace(/\/+$/, '');
};

type RequestOptions = {
	method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
	/** JSON body */
	body?: unknown;
	query?: Record<string, string | number | boolean>;
	/** Send the API key. Defaults to true. */
	auth?: boolean;
	/** Parse the response as JSON. Defaults to true; false ignores the body (e.g. a plain "OK"). */
	json?: boolean;
	/** Overrides the connection's timeout for this request */
	timeoutMs?: number;
};

/**
 * Make a request to the Audiobookshelf API. Never throws.
 * @param conn the server to talk to
 * @param path the API path, starting with `/`
 * @returns the parsed response, or the reason the request failed
 */
export const request = async <T>(
	conn: Connection,
	path: string,
	options: RequestOptions = {}
): Promise<Result<T>> => {
	const { method = 'GET', body, query, auth = true, json = true } = options;

	const address = normalizeAddress(conn.address);
	if (address === null) return fail(AbsError.INVALID_ADDRESS);
	if (auth && conn.apiKey.trim() === '') return fail(AbsError.NO_API_KEY);

	let url = address + path;
	if (query !== undefined) {
		const params = new URLSearchParams();
		for (const [key, value] of Object.entries(query)) params.set(key, String(value));
		url += `?${params.toString()}`;
	}

	const headers: Record<string, string> = { Accept: 'application/json' };
	if (auth) headers.Authorization = `Bearer ${conn.apiKey.trim()}`;
	if (body !== undefined) headers['Content-Type'] = 'application/json';

	let response: Response;
	try {
		response = await fetch(url, {
			method,
			headers,
			body: body === undefined ? undefined : JSON.stringify(body),
			signal: AbortSignal.timeout(options.timeoutMs ?? conn.timeoutMs ?? DEFAULT_TIMEOUT_MS),
			redirect: 'follow'
		});
	} catch (e) {
		const err = e as Error & { cause?: { code?: string; message?: string } };
		if (err.name === 'TimeoutError' || err.name === 'AbortError') return fail(AbsError.TIMEOUT);
		const reason = err.cause?.code ?? err.cause?.message ?? err.message;
		return fail(AbsError.UNREACHABLE, `Could not reach the Audiobookshelf server (${reason}).`);
	}

	if (response.status === 401) return fail(AbsError.UNAUTHORIZED, undefined, 401);
	if (response.status === 403) return fail(AbsError.NOT_ADMIN, undefined, 403);
	if (response.status === 404) return fail(AbsError.NOT_FOUND, undefined, 404);
	if (!response.ok) {
		const text = (await response.text().catch(() => '')).substring(0, 200);
		return fail(
			AbsError.UNEXPECTED_RESPONSE,
			`Audiobookshelf returned ${response.status} ${response.statusText}${text ? `: ${text}` : ''}`,
			response.status
		);
	}

	if (!json) return ok(undefined as T);

	try {
		return ok((await response.json()) as T);
	} catch (e) {
		return fail(AbsError.UNEXPECTED_RESPONSE, 'Audiobookshelf returned a response that is not JSON.');
	}
};
