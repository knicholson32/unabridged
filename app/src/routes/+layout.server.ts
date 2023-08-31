import type * as Types from '@prisma/client';
import prisma from '$lib/server/prisma';
import type { SideMenu, LinkMenuItem, NotificationAPI } from '$lib/types/';

/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch }) {
    const nData = await (await fetch('/api/notification')).json() as NotificationAPI;
    return {
        notifications: nData.notifications ?? [],
    };

}