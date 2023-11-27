import prisma from '$lib/server/prisma';
import * as settings from '$lib/server/settings';
import cronstrue from 'cronstrue';
import cron from 'node-cron';
import { Cron } from '$lib/server/cmd';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params }) => {
  return {
    settingValues: {
      'system.debug': await settings.get('system.debug'),
      'system.cron.enable': await settings.get('system.cron.enable'),
      'system.cron': await settings.get('system.cron'),
    }
  }
}

export const actions = {
  updateSystem: async ({ request }) => {

    const data = await request.formData();

    const debug = (data.get('system.debug') ?? undefined) as undefined | string;
    if (debug !== undefined) await settings.set('system.debug', debug === 'true');

    const cronEnable = (data.get('system.cron.enable') ?? undefined) as undefined | string;
    if (cronEnable !== undefined) {
      Cron.start();
      await settings.set('system.cron.enable', cronEnable === 'true');
    }

    const cronInput = (data.get('system.cron') ?? undefined) as undefined | string;
    if (cronInput !== undefined) {
      if (!cron.validate(cronInput)) {
        try {
          cronstrue.toString(cronInput);
          return { action: '?/updateSystem', name: 'system.cron', success: false, message: 'Cron is not valid' };
        } catch (e: unknown) {
          return { action: '?/updateSystem', name: 'system.cron', success: false, message: e as string };
        }
      } else {
        // Save backup cron value
        const backupCronValue = await settings.get('system.cron');

        // Assign new cron value
        await settings.set('system.cron', cronInput);

        // Restart cron tasks. Check if it started correctly
        if(!Cron.start() && await settings.get('system.cron.enable') === true) {
          // It did not. Revert and error
          await settings.set('system.cron', backupCronValue);
          // Reload cron with old settings
          Cron.start()
          // Error
          return { action: '?/updateSystem', name: 'system.cron', success: false, message: 'Cron failed to start with these settings.' };
        } 
      }
    }

  },
  updateDebug: async ({ request }) => {

    const data = await request.formData();

    const debug = (data.get('system.debug') ?? undefined) as undefined | string;
    if (debug !== undefined) await settings.set('system.debug', debug === 'true');

  }
}