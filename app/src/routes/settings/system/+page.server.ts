import prisma from '$lib/server/prisma';
import { error } from '@sveltejs/kit';
import * as settings from '$lib/server/settings';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params }) => {

  const autoSync = await settings.get('general.autoSync');
  const startPaused = await settings.get('progress.startPaused');
  const debug = await settings.get('system.debug');

  return {
    autoSync,
    startPaused,
    debug
  }
}

export const actions = {
  update: async ({ request }) => {

    const data = await request.formData();

    const autoSync = (data.get('autoSync') ?? undefined) as undefined | string;
    if (autoSync !== undefined) await settings.set('general.autoSync', autoSync === 'true');

    const startPaused = (data.get('startPaused') ?? undefined) as undefined | string;
    if (startPaused !== undefined) {
      await settings.set('progress.startPaused', startPaused === 'true');
      if (await prisma.processQueue.count() === 0) await settings.set('progress.paused', await settings.get('progress.startPaused'));
    }

    const debug = (data.get('debug') ?? undefined) as undefined | string;
    if (debug !== undefined) await settings.set('system.debug', debug === 'true');

  }
}