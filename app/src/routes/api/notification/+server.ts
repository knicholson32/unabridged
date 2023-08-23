import prisma from '$lib/server/prisma';
import { json } from '@sveltejs/kit';
import * as helpers from '$lib/helpers';
import type { NotificationAPI, Notification, ModalTheme, Issuer } from '$lib/types';

export const POST = async ({ request }) => {
  const notification = await request.json() as Notification;
  await prisma.notification.create({ data: notification });
  return await GET();
}

export const GET = async () => {
  const notificationsRaw = await prisma.notification.findMany();
  const notifications: Notification[] = [];
  for (const note of notificationsRaw) {
    notifications.push({
      id: note.id,
      icon_path: note.icon_path,
      icon_color: note.icon_color,
      theme: (note.theme as ModalTheme),
      text: note.text,
      sub_text: note.sub_text,
      linger_time: note.linger_time,
      needs_clearing: note.needs_clearing,
      auto_open: note.auto_open,
      issuer: (note.issuer as Issuer),
      identifier: note.identifier
    });
  }
  return json({ ok: true, notifications: notifications ?? undefined } satisfies NotificationAPI);
}

export const DELETE = async ({ request }) => {
  const j = await request.json();
  const ids: string[] = j.ids;

  // Check that the ID was actually submitted
  if (ids === null || ids === undefined) return helpers.jsonWithStatus({ ok: false }, 400)

  // Delete many notifications
  await prisma.notification.deleteMany({ 
    where: {
      id: {
        in: ids
      }
    }
  });

  return await GET();
}