import * as fs from 'node:fs/promises';
import * as helpers from '$lib/server/helpers';
import * as helpersPublic from '$lib/helpers';
import * as settings from '$lib/server/settings';
import { CollectionBy, type GenerateAlert, type URLAlert } from '$lib/types';
import * as Plex from '$lib/server/plex';
import { PlexOauth } from 'plex-oauth'
import { redirect } from '@sveltejs/kit';
import { getContext } from 'svelte';
import prisma from '$lib/server/prisma';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params, url }) => {

  // const plexSignInSuccess: boolean | undefined = url.searchParams.get('success') === null ? undefined : url.searchParams.get('success') === 'true'


  const settingValues = {
    'plex.enable': await settings.get('plex.enable'),
    'plex.apiTimeout': await settings.get('plex.apiTimeout'),
    'plex.address': await settings.get('plex.address'),
    'plex.token': await helpers.decrypt(await settings.get('plex.token')),
    'plex.library.id': await settings.get('plex.library.id'),
    'plex.library.name': await settings.get('plex.library.name'),
    'plex.library.autoScan': await settings.get('plex.library.autoScan'),
    'plex.library.scheduled': await settings.get('plex.library.scheduled'),
    'plex.library.autoScanDelay': await settings.get('plex.library.autoScanDelay'),
    'plex.collections.enable': await settings.get('plex.collections.enable'),
    'plex.collections.by': await settings.get('plex.collections.by'),
    'library.location': await settings.get('library.location')
  }

  // Declare some variables to hold whether the Plex integration is signed in and whether it might have issues
  let signedIn = false;
  let issueDetected = false;

  // Declare a variable to hold the libraries in the Plex server
  let sections: Plex.types.Sections['MediaContainer']['Directory'] = [];

  // Only perform plex API requests if the Plex integration is enabled and certain required values exist (address and token)
  if (settingValues['plex.enable'] === true && settingValues['plex.address']?.length > 0 && settingValues['plex.token']?.length > 0) {
    // Test the Plex connection
    const results = await Plex.testPlexConnection(settingValues['plex.address'], settingValues['plex.token']);
    // check that Plex was communicated with successfully
    if (results.success === true) {
      // Set signedIn to true
      signedIn = true;
      // Get the libraries in the Plex Server
      const results = await Plex.getSections(settingValues['plex.address'], settingValues['plex.token']);
      // Assign the libraries so we can process it later
      sections = results?.MediaContainer.Directory?? [];
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

  // Return the data to the front-end
  return {
    settingValues,
    plex: {
      signedIn,
      issueDetected,
      name: await settings.get('plex.friendlyName'),
      sections: filteredSections
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
      const library = (data.get('plex.library.id') ?? undefined) as undefined | string;

      let results;
      if (plexEnable ?? await settings.get('plex.enable')) {
        // Test the plex connection
        const results = await Plex.testPlexConnection(address ?? await settings.get('plex.address'), token ?? await helpers.decrypt(await settings.get('plex.token')));
        if (results.success === true) {
          // The connection was a success. We can save the values
          if (plexEnable !== undefined) await settings.set('plex.enable', plexEnable === 'true');
          if (address !== undefined) await settings.set('plex.address', address);
          if (token !== undefined) await settings.set('plex.token', await helpers.encrypt(token));
          if (library !== undefined) {
            // Get the libraries available on the Plex server
            const results = await Plex.getSections(address ?? await settings.get('plex.address'), token ?? await helpers.decrypt(await settings.get('plex.token')));
            // If libraries could not be fetched, we can't continue
            if (results === null || results.MediaContainer.Directory.length === 0) return { action: '?/updatePlexIntegration', name: 'plex.library.id', success: false, message: 'Could not get library information' };
            // Make sure the one that was selected is both in the Plex server and is the correct type
            const index = results.MediaContainer.Directory.findIndex((v) => v.uuid === library);
            if (index == -1) return { action: '?/updatePlexIntegration', name: 'plex.library.id', success: false, message: 'Library does not exist' };
            if (results.MediaContainer.Directory[index].type !== 'artist') return { action: '?/updatePlexIntegration', name: 'plex.library.id', success: false, message: 'Invalid library type. Please select a valid option.' };

            // Everything looks good, save the data
            await settings.set('plex.library.id', library);
            await settings.set('plex.library.key', results.MediaContainer.Directory[index].key);
            await settings.set('plex.library.name', results.MediaContainer.Directory[index].title);
          }
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
    await settings.set('plex.library.id', '');
    await settings.set('plex.library.key', '');
    await settings.set('plex.library.name', '');
    await settings.set('plex.collections.enable', false);
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
  },
  test: async ({ request }) => {
    const data = await request.formData();
    const asin = (data.get('asin') ?? undefined) as undefined | string;

    const series = await prisma.series.findMany({
      where: {
        books: {
          some: {
            processed: true
          }
        }
      },
      include: {
        books: true
      }
    });
    for (const s of series) {
      console.log('collect', await Plex.collectBySeries(s));
    }

    // // const books = await prisma.book.findMany({ where: { processed: true } });
    // let counter = 0;
    // let failed = 0;
    // // for (const b of books) {
    // //   const r = await Plex.matchBookToPlexEntry(b.asin);
    // //   console.log('result', b.asin, r);
    // //   if (r === true) counter++
    // //   else failed++
    // //   // if (counter > 10) break;
    // // }
    // console.log('succeeded', counter, 'failed', failed);

    // const series = await prisma.series.findMany({
    //   where: {
    //     books: {
    //       some: {
    //         processed: true
    //       }
    //     }
    //   },
    //   include: {
    //     books: true
    //   }
    // });

    // for (const s of series) {
    //   for (const book of s.books) {
    //     const r = await Plex.matchBookToPlexEntry(book.asin);
    //     console.log('result', book.asin, r);
    //     if (r !== null) counter++
    //     else failed++
    //   }

    //   console.log(s);



    // }

  }
}