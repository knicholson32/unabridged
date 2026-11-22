import * as settings from '$lib/server/settings';

/**
 * Push notifications to the admin through ntfy (https://ntfy.sh, or a self-hosted server).
 *
 * Messages are published as JSON to the server's root rather than as a plain body with `Title:`
 * headers, because header values must be ASCII and book titles often are not.
 */

/** ntfy priorities: 1 min, 2 low, 3 default, 4 high, 5 max */
export type Priority = 1 | 2 | 3 | 4 | 5;

export type Message = {
	title: string;
	message: string;
	priority?: Priority;
	/** ntfy tags; names of emoji (e.g. 'warning') are shown as icons */
	tags?: string[];
	/** Path in Unabridged to open when the notification is tapped, e.g. '/sources/abc' */
	path?: string;
};

export type Result = { ok: true } | { ok: false; message: string };

export type Topic = { server: string; topic: string };

const TIMEOUT_MS = 10000;

/**
 * Split a topic URL into the server it is published to and the topic name
 * @param url the topic URL, e.g. 'https://ntfy.sh/my-topic' or 'https://example.com/ntfy/alerts'
 * @returns the server (ending in '/') and topic, or null if the URL is not a topic URL
 */
export const parseTopicUrl = (url: string): Topic | null => {
	let u: URL;
	try {
		u = new URL(url.trim());
	} catch (e) {
		return null;
	}
	if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
	const parts = u.pathname.split('/').filter((p) => p !== '');
	const topic = parts.pop();
	// ntfy topic names: letters, numbers, '-' and '_', up to 64 characters
	if (topic === undefined || !/^[-_A-Za-z0-9]{1,64}$/.test(topic)) return null;
	const prefix = parts.length === 0 ? '' : parts.join('/') + '/';
	return { server: `${u.origin}/${prefix}`, topic };
};

/**
 * Publish a message to a topic, whether or not notifications are enabled. Used directly by the
 * settings page's test button; everything else should use `send`.
 * @param topicUrl the full topic URL
 * @param token an access token, or '' for an open topic
 * @param msg the message
 * @param linkAddress the URL of Unabridged, for `msg.path`; '' leaves the notification without a link
 */
export const publish = async (
	topicUrl: string,
	token: string,
	msg: Message,
	linkAddress = ''
): Promise<Result> => {
	const topic = parseTopicUrl(topicUrl);
	if (topic === null)
		return {
			ok: false,
			message: "The topic URL should look like 'https://ntfy.sh/my-topic'."
		};

	const body: Record<string, unknown> = {
		topic: topic.topic,
		title: msg.title,
		message: msg.message,
		priority: msg.priority ?? 3
	};
	if (msg.tags !== undefined && msg.tags.length > 0) body.tags = msg.tags;
	if (msg.path !== undefined && linkAddress !== '')
		body.click = linkAddress.replace(/\/+$/, '') + msg.path;

	const headers: Record<string, string> = { 'Content-Type': 'application/json' };
	if (token !== '') headers.Authorization = `Bearer ${token}`;

	try {
		const res = await fetch(topic.server, {
			method: 'POST',
			headers,
			body: JSON.stringify(body),
			signal: AbortSignal.timeout(TIMEOUT_MS)
		});
		if (res.ok) return { ok: true };
		// ntfy errors are JSON: { "code": 40101, "http": 401, "error": "unauthorized", ... }
		let detail = '';
		try {
			const j = (await res.json()) as { error?: string };
			if (typeof j.error === 'string') detail = `: ${j.error}`;
		} catch (e) {
			// Not JSON; the status is enough
		}
		if (res.status === 401 || res.status === 403)
			return {
				ok: false,
				message: `ntfy refused the message (${res.status}${detail}). Check the access token.`
			};
		return { ok: false, message: `ntfy returned ${res.status}${detail}.` };
	} catch (e) {
		if (e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError'))
			return { ok: false, message: `ntfy did not respond within ${TIMEOUT_MS / 1000} seconds.` };
		const cause = e instanceof Error && e.cause instanceof Error ? e.cause.message : String(e);
		return { ok: false, message: `Could not reach ntfy at ${topic.server}: ${cause}` };
	}
};

/**
 * Send a notification, if ntfy is enabled. Never throws: a failure is logged and returned, so a
 * broken notifier cannot break the sync or download that called it.
 * @param msg the message
 * @returns whether it was sent; null if notifications are off
 */
export const send = async (msg: Message): Promise<Result | null> => {
	try {
		const s = await settings.getSet('notify');
		if (!s['notify.ntfy.enable'] || s['notify.ntfy.url'] === '') return null;
		const result = await publish(
			s['notify.ntfy.url'],
			s['notify.ntfy.token'],
			msg,
			s['notify.linkAddress']
		);
		if (!result.ok) console.log(`Notify: could not send '${msg.title}': ${result.message}`);
		return result;
	} catch (e) {
		console.log(`Notify: could not send '${msg.title}'`, e);
		return { ok: false, message: String(e) };
	}
};
