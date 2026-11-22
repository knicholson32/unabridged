import * as settings from '$lib/server/settings';
import * as notify from '$lib/server/notify';

const ACTION_NOTIFICATIONS = '?/updateNotifications';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params }) => {
	return {
		settingValues: {
			'search.autoSubmit': await settings.get('search.autoSubmit'),
			'general.timezone': await settings.get('general.timezone'),
			...(await settings.getSet('notify'))
		},
		version: process.env.GIT_COMMIT ?? 'Unknown'
	};
};

export const actions = {
	updateSearch: async ({ request }) => {
		const data = await request.formData();

		const autoSubmit = (data.get('search.autoSubmit') ?? undefined) as undefined | string;
		if (autoSubmit !== undefined) await settings.set('search.autoSubmit', autoSubmit === 'true');
	},
	updateLocalization: async ({ request }) => {
		const data = await request.formData();

		const timezone = (data.get('general.timezone') ?? undefined) as undefined | string;
		if (timezone !== undefined) await settings.set('general.timezone', timezone);
	},
	updateNotifications: async ({ request }) => {
		const data = await request.formData();
		const saved = await settings.getSet('notify');
		const enableRaw = data.get('notify.ntfy.enable') as string | null;
		const urlRaw = data.get('notify.ntfy.url') as string | null;
		const tokenRaw = data.get('notify.ntfy.token') as string | null;
		const linkRaw = data.get('notify.linkAddress') as string | null;

		const enable = enableRaw === null ? saved['notify.ntfy.enable'] : enableRaw === 'true';
		const url = urlRaw === null ? saved['notify.ntfy.url'] : urlRaw.trim();
		const token = tokenRaw === null ? saved['notify.ntfy.token'] : tokenRaw.trim();
		const link = (linkRaw === null ? saved['notify.linkAddress'] : linkRaw.trim()).replace(
			/\/+$/,
			''
		);

		if (url !== '' && notify.parseTopicUrl(url) === null)
			return {
				action: ACTION_NOTIFICATIONS,
				name: 'notify.ntfy.url',
				success: false,
				message: "The topic URL should look like 'https://ntfy.sh/my-topic'."
			};
		if (enable && url === '')
			return {
				action: ACTION_NOTIFICATIONS,
				name: 'notify.ntfy.url',
				success: false,
				message: 'Enter a topic URL to turn notifications on.'
			};
		if (link !== '' && !/^https?:\/\/[^/]/.test(link))
			return {
				action: ACTION_NOTIFICATIONS,
				name: 'notify.linkAddress',
				success: false,
				message: "The Unabridged URL must start with 'http://' or 'https://'."
			};

		await settings.set('notify.ntfy.enable', enable);
		await settings.set('notify.ntfy.url', url);
		await settings.set('notify.ntfy.token', token);
		await settings.set('notify.linkAddress', link);
		console.log(
			`Notifications: saved enabled=${enable}, topic '${url}', token ${
				token === '' ? 'empty' : token === saved['notify.ntfy.token'] ? 'unchanged' : 'changed'
			}`
		);
		return {
			action: ACTION_NOTIFICATIONS,
			name: 'notify.ntfy.enable',
			success: true,
			message: 'Saved'
		};
	},
	testNotifications: async () => {
		const s = await settings.getSet('notify');
		const result = await notify.publish(
			s['notify.ntfy.url'],
			s['notify.ntfy.token'],
			{
				title: 'Unabridged test notification',
				message: 'Notifications from Unabridged are working.',
				tags: ['white_check_mark'],
				path: '/settings/general'
			},
			s['notify.linkAddress']
		);
		console.log(`Notifications: test ${result.ok ? 'sent' : `failed: ${result.message}`}`);
		if (!result.ok)
			return {
				action: ACTION_NOTIFICATIONS,
				invalidatedParams: false,
				name: 'notify.ntfy.url',
				success: false,
				message: result.message
			};
		return {
			action: ACTION_NOTIFICATIONS,
			invalidatedParams: false,
			name: 'notify.ntfy.enable',
			success: true,
			message: 'Test notification sent'
		};
	}
};
