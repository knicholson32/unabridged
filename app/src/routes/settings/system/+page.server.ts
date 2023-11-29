import prisma from '$lib/server/prisma';
import * as settings from '$lib/server/settings';
import type * as types from '$lib/types/index.js';
import cronstrue from 'cronstrue';
import cron from 'node-cron';
import { Cron } from '$lib/server/cmd';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params }) => {

  // Load the cron records
  const record = await settings.get('system.cron.record');
  // Set a variable to hold the parsed records
  let recordParsed: types.Cron.Record | undefined = undefined;
  // Only parse if records exist
  if (record !== '') {
    try {
      // Attempt to parse the records
      recordParsed = JSON.parse(record) as types.Cron.Record;
      // Check that the records are the correct version
      if (recordParsed.version !== 'v2') {
        // They are not. Reset them.
        recordParsed = undefined;
        await settings.set('system.cron.record', '');
      }
    } catch (e) {
      // Records could not be parsed. Reset them.
      recordParsed = undefined;
      await settings.set('system.cron.record', '');
    }
  }

  return {
    settingValues: {
      'system.debug': await settings.get('system.debug'),
      'system.cron.enable': await settings.get('system.cron.enable'),
      'system.cron.maxRun': await settings.get('system.cron.maxRun'),
      'system.cron.record': recordParsed,
      'system.cron': await settings.get('system.cron'),
    }
  }
}

export const actions = {
  updateCron: async ({ request }) => {

    const data = await request.formData();

    // Initialize a variable to tell if we should restart the cron later
    let cronShouldBeRestarted = false;

    const cronEnable = (data.get('system.cron.enable') ?? undefined) as undefined | string;
    if (cronEnable !== undefined) {
      cronShouldBeRestarted = true;
      await settings.set('system.cron.enable', cronEnable === 'true');
    }

    const maxRun = (data.get('system.cron.maxRun') ?? undefined) as undefined | string;
    if (maxRun !== undefined) await settings.set('system.cron.maxRun', parseInt(maxRun));

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


    // Restart the cron if we get this far, need to, and haven't done so yet.
    if (cronShouldBeRestarted) Cron.start()

  },
  updateDebug: async ({ request }) => {

    const data = await request.formData();

    const debug = (data.get('system.debug') ?? undefined) as undefined | string;
    if (debug !== undefined) {
      const verbose = (data.get('system.debug.verbose') ?? undefined) as undefined | string;
      await settings.set('system.debug', debug === 'false' ? 0 : verbose === 'true' ? 2 : 1);
    }

  }
}