import * as fs from 'node:fs/promises';
import * as helpers from '$lib/server/helpers';
import * as helpersPublic from '$lib/helpers';
import * as settings from '$lib/server/settings';
import { CollectionBy, ScanAndGenerate, type GenerateAlert, scanAndGenerateToStringLong } from '$lib/types';
import * as Plex from '$lib/server/plex';
import { PlexOauth } from 'plex-oauth'
import { redirect } from '@sveltejs/kit';
import type { Issuer, ModalTheme, Notification } from '$lib/types';
import { v4 as uuidv4 } from 'uuid';
import prisma from '$lib/server/prisma';
import type { Prisma } from '@prisma/client';
import type { Decimal } from '@prisma/client/runtime/library';
import * as events from '$lib/server/events';


type CollectionDetails = (Prisma.SeriesGetPayload<{ include: { books: true } }> & { icon: string, url: string });

// type CollectionDetails = {
//   key: string,
//   url: string,
//   icon: string,
//   title: string
// }[];

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params, url }) => {

  // const plexSignInSuccess: boolean | undefined = url.searchParams.get('success') === null ? undefined : url.searchParams.get('success') === 'true'

  const extraSettings = await settings.getMany('library.location', 'plex.friendlyName');

  const settingValues = {
    ...await settings.getSet('plex'),
    // 'plex.enable': await settings.get('plex.enable'),
    // 'plex.apiTimeout': await settings.get('plex.apiTimeout'),
    // 'plex.address': await settings.get('plex.address'),
    // 'plex.token': await settings.get('plex.token'),
    // 'plex.library.id': await settings.get('plex.library.id'),
    // 'plex.library.name': await settings.get('plex.library.name'),
    // 'plex.library.autoScan': await settings.get('plex.library.autoScan'),
    // 'plex.library.scheduled': await settings.get('plex.library.scheduled'),
    // 'plex.library.autoScanDelay': await settings.get('plex.library.autoScanDelay'),
    // 'plex.collections.enable': await settings.get('plex.collections.enable'),
    // 'plex.collections.by': await settings.get('plex.collections.by'),
    'library.location': extraSettings['library.location']
  }

  const plexDetails = async () => {
    // Declare some variables to hold whether the Plex integration is signed in and whether it might have issues
    let signedIn = false;
    let issueDetected = false;

    // Declare a variable to hold the libraries in the Plex server
    let sections: Plex.types.Sections['MediaContainer']['Directory'] = [];
    const collections: CollectionDetails[] = [];

    // Only perform plex API requests if the Plex integration is enabled and certain required values exist (address and token)
    if (settingValues['plex.enable'] === true && settingValues['plex.address']?.length > 0 && settingValues['plex.token']?.length > 0) {
      // Test the Plex connection
      const results = await Plex.testPlexConnection(settingValues['plex.address'], settingValues['plex.token']);
      // check that Plex was communicated with successfully
      if (results.success === true) {
        // Set signedIn to true
        signedIn = true;
        // Get the libraries in the Plex Server
        const results = await Plex.getLibraries(settingValues['plex.address'], settingValues['plex.token']);
        console.log(results);
        // Assign the libraries so we can process it later
        sections = results ?? [];
        // Get which collections Unabridged manages
        const collectBy = settingValues['plex.collections.by'];
        if (collectBy === CollectionBy.series) {
          // Get all series that have a collection
          const collectionsResult = await prisma.series.findMany({ where: { plexKey: { not: null } }, include: { books: true } });
          const collectionKeys: string[] = [];
          for (const c of collectionsResult) if (c.plexKey !== null) collectionKeys.push(c.plexKey);
          const machineId = settingValues['plex.machineId'];
          for (const collection of collectionsResult) {
            if (collection.plexKey === null) continue;
            const url = await Plex.collections.getCollectionWebURL(collection.plexKey, settingValues['plex.address'], machineId);
            const icon = '/api/plex/collection/icon/' + collection.plexKey;
            if (url === null || icon === undefined) continue;
            const collectionWithDetails = { ...collection, ...{ icon, url } } satisfies CollectionDetails
            for (const b of collectionWithDetails.books) b.rating = b.rating.toNumber() as unknown as Decimal;
            collections.push(collectionWithDetails)
          }
        } else {
          // TODO: Implement this
          console.error('Unimplemented collection type', collectBy);
        }
      }
      else issueDetected = true;
    }

    // Create an array that we will pass to the front-end that will hold the library options
    const filteredSections: { value: string, title: string, unset?: boolean }[] = [];
    // Check if we are signed in
    if (signedIn) {
      // We are, which means we most likely have libraries to parse. Loop through the libraries in the Plex server
      for (const section of sections) {
        // If the library type is correct, add it as a valid option
        if (section.type === 'artist') filteredSections.push({ value: section.uuid, title: section.title });
        // Otherwise add it as an un-selectable option
        else filteredSections.push({ value: section.uuid, title: `${section.title} (${helpersPublic.capitalizeFirstLetter(section.type)} Library)`, unset: true });
      }
      // If the currently selection option isn't a current option, clear our selection and add an 'Unset' option to match
      if (sections.findIndex((v) => v.uuid === settingValues['plex.library.id']) === -1) {
        settingValues['plex.library.id'] = '';
        filteredSections.push({ value: '', title: 'Unset', unset: true });
      }
    } else {
      // We are not. The selection box will be disabled, fill the current value
      // If the currently selection option isn't a current option, clear our selection and add an 'Unset' option to match
      if (settingValues['plex.library.name'] === '' || settingValues['plex.library.id'] === '') {
        filteredSections.push({ value: '', title: 'Unset', unset: true });
      } else {
        filteredSections.push({ value: settingValues['plex.library.id'], title: settingValues['plex.library.name'], unset: true });
      }
    }

    return {
      signedIn,
      issueDetected,
      name: extraSettings['plex.friendlyName'],
      sections: filteredSections,
      collections
    }
  }

  // Return the data to the front-end
  return {
    settingValues,
    plex: await plexDetails(),
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
      let address = (data.get('plex.address') ?? undefined) as undefined | string;
      if (address !== undefined) {
        if (address.endsWith('/')) address = address.substring(0, address.length - 1);
        await settings.set('plex.address', address);
      }

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
      let address = (data.get('plex.address') ?? undefined) as undefined | string;
      const token = (data.get('plex.token') ?? undefined) as undefined | string;
      const library = (data.get('plex.library.id') ?? undefined) as undefined | string;

      const constSettings = await settings.getMany('plex.address', 'plex.token', 'plex.enable');

      let results;
      if (plexEnable ?? constSettings['plex.enable']) {
        // Test the plex connection
        const results = await Plex.testPlexConnection(address ?? constSettings['plex.address'], token ?? constSettings['plex.token']);
        if (results.success === true) {
          // The connection was a success. We can save the values
          if (plexEnable !== undefined) await settings.set('plex.enable', plexEnable === 'true');
          if (address !== undefined) {
            if (address.endsWith('/')) address = address.substring(0, address.length - 1);
            await settings.set('plex.address', address);
          }
          if (token !== undefined) await settings.set('plex.token', token);
          if (library !== undefined) {
            // Get the libraries available on the Plex server
            const results = await Plex.getLibraries(address ?? await settings.get('plex.address'), token ?? await settings.get('plex.token'));
            // If libraries could not be fetched, we can't continue
            if (results === null || results.length === 0) return { action: '?/updatePlexIntegration', name: 'plex.library.id', success: false, message: 'Could not get library information' };
            // Make sure the one that was selected is both in the Plex server and is the correct type
            const index = results.findIndex((v) => v.uuid === library);
            if (index == -1) return { action: '?/updatePlexIntegration', name: 'plex.library.id', success: false, message: 'Library does not exist' };
            if (results[index].type !== 'artist') return { action: '?/updatePlexIntegration', name: 'plex.library.id', success: false, message: 'Invalid library type. Please select a valid option.' };

            // Everything looks good, save the data
            await settings.set('plex.library.id', library);
            await settings.set('plex.library.key', results[index].key);
            await settings.set('plex.library.name', results[index].title);
          }
        }
        // Message the user of the results
        return { action: '?/updatePlexIntegration', name: results.source, success: results.success, message: results.message };
      }
    }
  },
  testPlexIntegration: async () => {
    const addressAndToken = await settings.getMany('plex.address', 'plex.token');
    const results = await Plex.testPlexConnection(addressAndToken['plex.address'], addressAndToken['plex.token']);
    return { action: '?/updatePlexIntegration', invalidatedParams: false, name: results.source, success: results.success, message: results.message };
  },
  clearPlexIntegration: async ({ request }) => {
    // Debug
    
    const constSettings = await settings.getMany('system.debug', 'plex.collections.by', 'plex.address', 'plex.token', 'plex.collections.singlesKey');
    const debug = constSettings['system.debug'];

    // Get form data
    const data = await request.formData();

    if (debug) console.log('Clearing Plex Integration');

    // Delete managed collections if requested to
    const clearCollections = (data.get('plex.collections.delete') ?? undefined) as undefined | string;
    if (clearCollections !== undefined && clearCollections === 'true') {
      // Get the collect-by tag
      const collectBy = constSettings['plex.collections.by'];
      const plexURL = constSettings['plex.address'];
      const plexToken = constSettings['plex.token'];
      if (collectBy === CollectionBy.series) {
        // Remove the collections by series
        // Get all the series that have a plex key assigned
        const series = await prisma.series.findMany({ where: { plexKey: { not: null } }, select: { plexKey: true, title: debug !== 0 }});
        // Loop through the collections
        for (const s of series) {
          if (s.plexKey === null) continue;
          const result = await Plex.collections.deleteCollection(s.plexKey, plexURL, plexToken, debug);
          if (debug) console.log(`Collections: Removing '${s.title}' - ${s.plexKey} : ${result ? 'Successful' : 'Failed'}`);
        }
        // Check the singles collection
        if (constSettings['plex.collections.singlesKey'] !== '') {
          const r = await Plex.collections.deleteCollection(constSettings['plex.collections.singlesKey'], plexURL, plexToken, debug);
          if (r) await settings.set('plex.collections.singlesKey', '');
        }
      } else {
        // TODO: Implement this
        console.error('Unimplemented collection type', collectBy);
      }
    }

    // Clear all plex settings
    await settings.set('plex.enable', false);
    await settings.set('plex.address', '');
    await settings.set('plex.friendlyName', '');
    await settings.set('plex.token', '');
    await settings.set('plex.library.id', '');
    await settings.set('plex.library.key', '');
    await settings.set('plex.library.name', '');
    await settings.set('plex.collections.enable', false);

    // Clear plex correlated db entries
    try {
      if (debug) console.log('Clearing Plex Keys from db: book, series, author');
      await prisma.book.updateMany({ where: { plexKey: { not: null } }, data: { plexKey: null } });
      await prisma.series.updateMany({ where: { plexKey: { not: null } }, data: { plexKey: null } });
      await prisma.author.updateMany({ where: { plexKey: { not: null } }, data: { plexKey: null } });
    } catch (e) {
      if (debug) console.log('ERROR: Unable to clear Plex Keys');
    }

    return { action: '?/clearPlexIntegration', name: 'plex.clear', success: true, message: 'Cleared Integration' };

  },
  updatePlexAPI: async ({ request }) => {
    const data = await request.formData();

    const apiTimeout = (data.get('plex.apiTimeout') ?? undefined) as undefined | string;
    if (apiTimeout !== undefined) await settings.set('plex.apiTimeout', parseInt(apiTimeout));

    const plexScanTimeout = (data.get('plex.library.autoScan.timeout') ?? undefined) as undefined | string;
    if (plexScanTimeout !== undefined) await settings.set('plex.library.autoScan.timeout', parseInt(plexScanTimeout));
  },
  updatePlexLibrary: async ({ request }) => {

    const data = await request.formData();

    const autoScan = (data.get('plex.library.autoScan') ?? undefined) as undefined | string;
    if (autoScan !== undefined) await settings.set('plex.library.autoScan.enable', autoScan === 'true');

    const autoScanDelay = (data.get('plex.library.autoScanDelay') ?? undefined) as undefined | string;
    if (autoScanDelay !== undefined) await settings.set('plex.library.autoScan.delay', parseInt(autoScanDelay));

    const scheduled = (data.get('plex.library.scheduled') ?? undefined) as undefined | string;
    if (scheduled !== undefined) await settings.set('plex.library.autoScan.scheduled', scheduled === 'true');
  },
  updatePlexCollections: async ({ request }) => {

    const data = await request.formData();

    const collectionsEnable = (data.get('plex.collections.enable') ?? undefined) as undefined | string;
    if (collectionsEnable !== undefined) await settings.set('plex.collections.enable', collectionsEnable === 'true');

    const collectBy = (data.get('plex.collections.by') ?? undefined) as undefined | string;
    if (collectBy !== undefined) {
      if (collectBy !== CollectionBy.series) {
        return { action: '?/updatePlexCollections', name: 'plex.collections.by', success: false, message: 'Invalid collection type. Please choose a valid selection.' };
      } else await settings.set('plex.collections.by', collectBy);
    }

    const groupSingles = (data.get('plex.collections.groupSingles') ?? undefined) as undefined | string;
    if (groupSingles !== undefined) await settings.set('plex.collections.groupSingles', groupSingles === 'true');
  },
  generateCollections: async ({ request }) => {
    const result = await Plex.scanAndGenerate();
    return { action: '?/generateCollections', name: 'plex.scanAndGenerate', success: result === ScanAndGenerate.NO_ERROR, message: scanAndGenerateToStringLong(result) };
  }
}