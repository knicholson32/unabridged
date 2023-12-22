import prisma from '$lib/server/prisma';
import { json } from '@sveltejs/kit';
import * as events from '$lib/server/events';
import { type Notification, type ModalTheme, type Issuer, API } from '$lib/types';

export const GET = async () => {
	const notificationsRaw = await prisma.notification.findMany();
	const notifications: Notification[] = [];
	for (const note of notificationsRaw) {
		notifications.push({
			id: note.id,
			icon_path: note.icon_path,
			icon_color: note.icon_color,
			theme: note.theme as ModalTheme,
			text: note.text,
			sub_text: note.sub_text,
			linger_time: note.linger_time,
			needs_clearing: note.needs_clearing,
			auto_open: note.auto_open,
			issuer: note.issuer as Issuer,
			identifier: note.identifier
		});
	}

	return json(
		{
			ok: true,
			status: 200,
			notifications: notifications,
			type: 'notification'
		} satisfies API.Notification,
		{ status: 200 }
	);
};

export const DELETE = async ({ request }) => {
	try {
		const j = await request.json();
		const ids: string[] = j.ids;

		// Check that the ID was actually submitted
		if (ids === null || ids === undefined) API.response._400({ missingBodyParams: ['ids'] });

		// Delete many notifications
		await prisma.notification.deleteMany({
			where: {
				id: {
					in: ids
				}
			}
		});

		events.emit('notification.deleted', ids);

		return API.response.success();
	} catch (e) {
		return API.response._400({ message: 'Invalid body. Expecting JSON.' });
	}
};
