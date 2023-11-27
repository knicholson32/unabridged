import prisma from '$lib/server/prisma';
import { error } from '@sveltejs/kit';
import * as fs from 'node:fs/promises';
import * as helpers from '$lib/server/helpers';
import * as settings from '$lib/server/settings';
import { CollectionBy } from '$lib/types';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params }) => {

  const settingValues = {
    'library.location': await settings.get('library.location'),
    'progress.startPaused': await settings.get('progress.startPaused'),
    'general.autoSync': await settings.get('general.autoSync'),
  }

  return {
    settingValues
  }
}

export const actions = {
  updateLibraryLocation: async ({ request }) => {

    const data = await request.formData();

    const libraryLocation = (data.get('library.location') ?? undefined) as undefined | string;

    if (libraryLocation === undefined) return;

    try {
      await fs.access(libraryLocation, fs.constants.R_OK | fs.constants.W_OK);
      await settings.set('library.location', libraryLocation);
    } catch (err) {
      return { action: '?/updateLibraryLocation', name: 'library.location', success: false, message: 'Directory does not exist or Unabridged does not have write access' };
    }
  },
  updateDownloadManager: async ({ request }) => {

    const data = await request.formData();

    const startPaused = (data.get('progress.startPaused') ?? undefined) as undefined | string;
    if (startPaused !== undefined) await settings.set('progress.startPaused', startPaused === 'true');

  },
  updateAutoSync: async ({ request }) => {

    const data = await request.formData();

    const autoSync = (data.get('general.autoSync') ?? undefined) as undefined | string;
    if (autoSync !== undefined) await settings.set('general.autoSync', autoSync === 'true');

  },
}