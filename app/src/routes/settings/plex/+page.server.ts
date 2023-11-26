import prisma from '$lib/server/prisma';
import { error } from '@sveltejs/kit';
import * as fs from 'node:fs/promises';
import * as helpers from '$lib/server/helpers';
import * as settings from '$lib/server/settings';
import { CollectionBy } from '$lib/types';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params }) => {

  const settingValues = {
    'plex.enable': await settings.get('plex.enable'),
    'plex.address': await settings.get('plex.address'),
    'plex.useToken': await settings.get('plex.useToken'),
    'plex.token': await helpers.decrypt(await settings.get('plex.token')),
    'plex.username': await settings.get('plex.username'),
    'plex.password': await helpers.decrypt(await settings.get('plex.password')),
    'plex.library.autoScan': await settings.get('plex.library.autoScan'),
    'plex.library.scheduled': await settings.get('plex.library.scheduled'),
    'plex.library.autoScanDelay': await settings.get('plex.library.autoScanDelay'),
    'plex.collections.enable': await settings.get('plex.collections.enable'),
    'plex.collections.by': await settings.get('plex.collections.by'),
    'library.location': await settings.get('library.location')
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
  updatePlexIntegration: async ({ request }) => {

    const data = await request.formData();

    const plexEnable = (data.get('plex.enable') ?? undefined) as undefined | string;
    if (plexEnable !== undefined) await settings.set('plex.enable', plexEnable === 'true');

    const useToken = (data.get('plex.useToken') ?? undefined) as undefined | string;
    if (useToken !== undefined) await settings.set('plex.useToken', useToken === 'true');

    const username = (data.get('plex.username') ?? undefined) as undefined | string;
    if (username !== undefined) await settings.set('plex.username', username);

    const password = (data.get('plex.password') ?? undefined) as undefined | string;
    if (password !== undefined) await settings.set('plex.password', await helpers.encrypt(password));

    const token = (data.get('plex.token') ?? undefined) as undefined | string;
    if (token !== undefined) await settings.set('plex.token', await helpers.encrypt(token));

    // TODO: Test plex access
  },
  updatePlexLibrary: async ({ request }) => {

    const data = await request.formData();

    const autoScan = (data.get('plex.library.autoScan') ?? undefined) as undefined | string;
    if (autoScan !== undefined) await settings.set('plex.library.autoScan', autoScan === 'true');

    const autoScanDelay = (data.get('plex.library.autoScanDelay') ?? undefined) as undefined | string;
    if (autoScanDelay !== undefined) await settings.set('plex.library.autoScanDelay', parseInt(autoScanDelay));

    const scheduled = (data.get('plex.library.scheduled') ?? undefined) as undefined | string;
    if (scheduled !== undefined) await settings.set('plex.library.scheduled', scheduled === 'true');
  },
  updatePlexCollections: async ({ request }) => {

    const data = await request.formData();

    const collectionsEnable = (data.get('plex.collections.enable') ?? undefined) as undefined | string;
    if (collectionsEnable !== undefined) await settings.set('plex.collections.enable', collectionsEnable === 'true');

    const collectBy = (data.get('plex.collections.by') ?? undefined) as undefined | string;
    if (collectBy !== undefined) {
      if (collectBy !== CollectionBy.album && collectBy !== CollectionBy.series) {
        return { action: '?/updatePlexCollections', name: 'plex.collections.by', success: false, message: 'Invalid collection type. Please choose a valid selection.' };
      } else await settings.set('plex.collections.by', collectBy);
    }
  }
}