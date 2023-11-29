import * as fs from 'node:fs/promises';
import * as helpers from '$lib/server/helpers';
import * as settings from '$lib/server/settings';
import { CollectionBy, type GenerateAlert, type URLAlert } from '$lib/types';
import * as Plex from '$lib/server/plex';
import { PlexOauth } from 'plex-oauth'
import { redirect } from '@sveltejs/kit';
import { getContext } from 'svelte';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params, url }) => {

  // const plexSignInSuccess: boolean | undefined = url.searchParams.get('success') === null ? undefined : url.searchParams.get('success') === 'true'


  const settingValues = {
    'plex.enable': await settings.get('plex.enable'),
    'plex.apiTimeout': await settings.get('plex.apiTimeout'),
    'plex.address': await settings.get('plex.address'),
    'plex.token': await helpers.decrypt(await settings.get('plex.token')),
    'plex.library.autoScan': await settings.get('plex.library.autoScan'),
    'plex.library.scheduled': await settings.get('plex.library.scheduled'),
    'plex.library.autoScanDelay': await settings.get('plex.library.autoScanDelay'),
    'plex.collections.enable': await settings.get('plex.collections.enable'),
    'plex.collections.by': await settings.get('plex.collections.by'),
    'library.location': await settings.get('library.location')
  }

  let signedIn = false;

  if (settingValues['plex.enable'] === true && settingValues['plex.address']?.length > 0 && settingValues['plex.token']?.length > 0) {
    const results = await Plex.testPlexConnection(settingValues['plex.address'], settingValues['plex.token']);
    if (results.success === true) signedIn = true;
  }

  return {
    settingValues,
    plex: {
      signedIn,
      name: await settings.get('plex.friendlyName')
    },
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

    // See if the button pressed was Sign In
    const signIntoPlex = data.get('signIntoPlex');

    if (signIntoPlex !== null) {
      // It was. We need to save the current data (address and enable) and go deal with the sign-in
      await settings.set('plex.enable', false);
      const address = (data.get('plex.address') ?? undefined) as undefined | string;
      if (address !== undefined) await settings.set('plex.address', address);

      // Sign in via Plex
      const plexOauth = new PlexOauth(Plex.types.CLIENT_INFORMATION);
      const d = await plexOauth.requestHostedLoginURL();
      const [hostedUILink, pinId] = d;
      const additionalURLParams = {
        '[context][device][deviceName]': 'Unabridged',
        '[context][device][version]': process.env.GIT_COMMIT?.substring(0, 7) ?? 'unknown',
        'forwardUrl': `${helpers.removeTrailingSlashes(process.env.ORIGIN ?? '127.0.0.1')}/settings/plex/oauth/${pinId}`
      }
      console.log(additionalURLParams);
      const url = hostedUILink + '&' + new URLSearchParams(additionalURLParams).toString()
      throw redirect(303, url);

    } else {
      // It was not. Normal submit.
      const plexEnable = (data.get('plex.enable') ?? undefined) as undefined | string;
      const address = (data.get('plex.address') ?? undefined) as undefined | string;
      const token = (data.get('plex.token') ?? undefined) as undefined | string;

      let results;
      if (plexEnable ?? await settings.get('plex.enable')) {
        // Test the plex connection
        const results = await Plex.testPlexConnection(address ?? await settings.get('plex.address'), token ?? await helpers.decrypt(await settings.get('plex.token')));
        if (results.success === true) {
          // The connection was a success. We can save the values
          if (plexEnable !== undefined) await settings.set('plex.enable', plexEnable === 'true');
          if (address !== undefined) await settings.set('plex.address', address);
          if (token !== undefined) await settings.set('plex.token', await helpers.encrypt(token));
        }
        // Message the user of the results
        return { action: '?/updatePlexIntegration', name: results.source, success: results.success, message: results.message };
      }
    }
  },
  testPlexIntegration: async () => {
    const results = await Plex.testPlexConnection(await settings.get('plex.address'), await helpers.decrypt(await settings.get('plex.token')));
    return { action: '?/updatePlexIntegration', invalidatedParams: false, name: results.source, success: results.success, message: results.message };
  },
  clearPlexIntegration: async () => {
    await settings.set('plex.enable', false);
    await settings.set('plex.address', '');
    await settings.set('plex.friendlyName', '');
    await settings.set('plex.token', '');
  },
  updatePlexAPI: async ({ request }) => {
    const data = await request.formData();

    const apiTimeout = (data.get('plex.apiTimeout') ?? undefined) as undefined | string;
    if (apiTimeout !== undefined) await settings.set('plex.apiTimeout', parseInt(apiTimeout));
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