import WebSocket from 'ws';
import fetch, { AbortError } from 'node-fetch';
import { LibraryManager } from '../cmd';
import * as types from './types';
import * as publicTypes from '$lib/types';
import * as settings from '$lib/server/settings';
import * as helpers from '$lib/server/helpers';
import * as tools from './tools';
import * as scan from './auto-scan';

export * as collections from './collections';
export * as types from './types';

/**
 * Test the Plex configuration and connection
 * @param address the Plex URL
 * @param token the Plex token
 * @param saveData whether or not to save data from this connection
 * @returns the results of the connection test
 */
export const testPlexConnection = async (address: string, token: string, saveData = true): Promise<publicTypes.ConnectionTestResult> => {
  // Set the default source (if we don't have a better source to blame for the issue)
  const defaultSource: settings.TypeName = 'plex.address';

  // Get debug
  const debug = await settings.get('system.debug');

  // Get the plex URL and make sure it makes sense
  let plexURL = helpers.removeTrailingSlashes(address);
  if (plexURL === '') return { success: false,source: 'plex.address',  message: 'Plex URL is not set. Enter a valid URL.' };
  if (!plexURL.startsWith('http')) return { success: false, source: 'plex.address', message: 'Plex URL must start with \'http\' or \'https\'.' };

  // Get the plex token and make sure it exists
  const plexToken = token;
  if (plexToken === '') return { success: false, source: 'plex.token', message: 'Plex token is not set. Sign in or input a valid token.' };

  // Create an abort controller so we can kill the fetch after a couple seconds (or whatever is configured)
  const controller = new AbortController();
  const apiTimeout = await tools.getAPITimeout();
  const timeout = setTimeout(() => {
    controller.abort();
  }, apiTimeout);

  // Try to fetch data about the plex server
  try {
    // Make a fetch with the plex token to the base URL
    const response = await fetch(`${plexURL}/`, {
      method: 'get',
      headers: {
        'Accept': 'application/json',
        'X-Plex-Token': plexToken
      },
      signal: controller.signal
    });

    if (debug > 2) console.log('response', response);

    // Check for unauthorized
    if (response.status === 401) return { success: false, source: 'plex.token', message: 'Unauthorized.' };

    // Check for a non-ok status code
    if (response.status !== 200) return { success: false, source: 'plex.address', message: 'Invalid response code: ' + response.status + ', ' + response.statusText };

    // Decode the response as base data
    const base = await response.json() as types.Base;

    if (debug > 2) console.log('base', base);

    // Check to see that the base data makes sense
    if (base === undefined || base.MediaContainer === undefined) {
      // It does not. Log an error
      console.error('ERROR: Received:', JSON.stringify(base));
      return { success: false, source: 'plex.address', message: 'Could not fetch data from the server. See logs for more info.' };
    }

    if (base.MediaContainer.myPlexUsername === undefined) {
      // It does not. Log an error
      console.error('ERROR: Received:', JSON.stringify(base));
      return { success: false, source: 'plex.address', message: 'The plex server has no username associated. Please claim the server.' };
    }

    // It does. Save data based on the new connection if required
    if (saveData) {
      // Save friendly name
      await settings.set('plex.friendlyName', base.MediaContainer.friendlyName ?? '');
      // Save server ID
      const serverIdentity = await tools.getServerIdentity(address, token);
      if (serverIdentity !== null) await settings.set('plex.machineId', serverIdentity.MediaContainer.machineIdentifier);
    }

    // Test the websocket connection
    const connectTest = new Promise<void>((resolve, reject) => {
      if(debug) console.log(helpers.convertToWebsocketURL(plexURL) + '/:/websockets/notifications');
      const ws = new WebSocket(helpers.convertToWebsocketURL(plexURL) + '/:/websockets/notifications', { headers: { 'X-Plex-Token': plexToken } });
      const timeout = setTimeout(() => {
        ws.terminate();
        reject('timeout waiting for connection');
      }, 3000);
      // Reject on failed connection
      ws.on('error', (error) => {
        clearTimeout(timeout);
        ws.terminate();
        if(debug) console.log('websocket join error', error);
        reject(error.message);
      });
      // Resolve on succeeded connections
      ws.on('open', () => {
        clearTimeout(timeout);
        ws.close();
        resolve();
      });
    });

    // Try the websocket test
    try {
      await connectTest;
    } catch (e) {
      console.log(e);
      return { success: false, source: 'plex.address', message: 'Could not connect to Plex API Websocket: ' + e };
    }

    // Return success
    return { success: true, source: defaultSource, message: `Success. Account '${base.MediaContainer.myPlexUsername}' detected.` };
  } catch (e) {
    if (e instanceof AbortError) {
      return { success: false, source: 'plex.address', message: 'Host did not respond. Aborted.' };
    } else {
      // There was a network or parse error
      const err = e as Error;
      console.error(err.message);
      return { success: false, source: 'plex.address', message: err.message };
    }
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Get libraries from the Plex server
 * @param plexURL the Plex URL
 * @param plexToken the Plex token
 * @returns the libraries from the server
 */
export const getLibraries = async (plexURL: string, plexToken: string): Promise<null | types.Directory[]> => {
  const results = await tools.resource('/library/sections', types.Method.GET, {}, plexURL, plexToken);
  if (results === null || results.status !== 200 || results.value === null || results.value === undefined) return null;
  const typedResults = results.value as types.Sections;
  if (typedResults.MediaContainer === undefined || typedResults.MediaContainer.Directory === undefined) return null;
  return typedResults.MediaContainer.Directory;
}

/**
 * Reset the Plex subsystem. Should be ran on system start.
 */
export const reset = async () => {
  await settings.set('plex.library.autoScan.inProgress', false);
  await settings.set('plex.library.autoScan.nextRun', -1);
  if (global.plex === undefined) global.plex = { generalTimeout: undefined };
  if (global.plex.generalTimeout !== undefined) clearTimeout(global.plex.generalTimeout);
}

/**
 * Scan the Plex Library and, if able, generate the collections
 */
export const scanAndGenerate = async (): Promise<publicTypes.ScanAndGenerate> => {
  // Get settings
  let plexSettings = await settings.getSet('plex');

  if (plexSettings['plex.enable'] === false) return publicTypes.ScanAndGenerate.PLEX_DISABLED;
  if (plexSettings['plex.library.autoScan.enable'] === false) return publicTypes.ScanAndGenerate.AUTO_SCAN_DISABLED;
  if (plexSettings['plex.library.key'] === '') return publicTypes.ScanAndGenerate.NO_LIBRARY_CONFIGURED;
  if (plexSettings['plex.library.autoScan.inProgress'] === true) return publicTypes.ScanAndGenerate.ALREADY_IN_PROGRESS;

  // We are now in-progress
  await settings.set('plex.library.autoScan.inProgress', true);
  await settings.set('plex.library.autoScan.progress', 0);
  await settings.set('plex.library.collection.progress', 0);

  // Clear the timeouts
  if (global.plex === undefined) global.plex = { generalTimeout: undefined };
  if (global.plex.generalTimeout !== undefined) clearTimeout(global.plex.generalTimeout);

  // Surround with a try-catch so we don't de-sync params if there is an unexpected issue
  try {
    // Test the plex connection
    const result = await testPlexConnection(plexSettings['plex.address'], plexSettings['plex.token'], false);
    if (result.success === false) {
      // It failed, exit
      await settings.set('plex.library.autoScan.inProgress', false);
      return publicTypes.ScanAndGenerate.NO_CONNECTION_TO_PLEX;
    }

    // Scan the library files
    console.log('start scan');
    const scanResult = await scan.scanLibraryFiles();
    if (scanResult !== publicTypes.ScanAndGenerate.NO_ERROR) {
      // We were unable to scan the Plex library. This is an error.
      console.log('Unable to scan Plex library:', scanResult);
      await settings.set('plex.library.autoScan.inProgress', false);
      return scanResult;
    }
    // Set as done with the scan
    await settings.set('plex.library.autoScan.progress', 1);
    console.log('scan done');

    
    // Check to see if we have the permission and tools to collect also
    if (plexSettings['plex.collections.enable'] === true && plexSettings['plex.library.key'] !== '') {
      // Delay for 1 second to give Plex time to catch up
      await helpers.delay(200);
      console.log('collecting');
      const collectionsResult = await scan.generateCollections();
      if (collectionsResult !== publicTypes.ScanAndGenerate.NO_ERROR) {
        // We were unable to generate the collections. This is an error.
        console.log('Unable to generate collections:', collectionsResult);
        await settings.set('plex.library.autoScan.inProgress', false);
        return collectionsResult;
      }
      // Set as done with the generation
      await settings.set('plex.library.collection.progress', 1);
      console.log('done collecting');
      // Set progress as finished
      await settings.set('plex.library.autoScan.inProgress', false);
      return publicTypes.ScanAndGenerate.NO_ERROR;
    } else {
      // Set progress as finished
      await settings.set('plex.library.autoScan.inProgress', false);
      return publicTypes.ScanAndGenerate.NO_ERROR_COLLECTIONS_DISABLED;
    }
  } catch (e) {
    console.log('ERROR', e);
    await settings.set('plex.library.autoScan.inProgress', false);
    return publicTypes.ScanAndGenerate.UNKNOWN_ERROR;
  }
}

/**
 * Trigger a scheduled library scan, after the correct delay. This function returns a promise that will resolve when the autoScan is complete.
 */
export const triggerAutoScan = async (): Promise<publicTypes.ScanAndGenerate> => {
  // Get settings
  let plexSettings = await settings.getSet('plex');

  // Block scope the first half so we can reuse variables (we will be doing many of the same checks)
  {
    // Check that we have permission to do this sync
    if (plexSettings['plex.enable'] === false) return publicTypes.ScanAndGenerate.PLEX_DISABLED;
    if(plexSettings['plex.library.autoScan.enable'] === false) return publicTypes.ScanAndGenerate.AUTO_SCAN_DISABLED;
    if(plexSettings['plex.library.autoScan.scheduled'] === true) return publicTypes.ScanAndGenerate.AUTO_SCAN_ONLY_ALLOWED_DURING_CRON;

    // Check if there is one running right now. If so, don't schedule but also don't resolve the schedule request.
    if (plexSettings['plex.library.autoScan.inProgress'] === true) return publicTypes.ScanAndGenerate.ALREADY_IN_PROGRESS;

    // Test the plex connection
    const result = await testPlexConnection(plexSettings['plex.address'], plexSettings['plex.token'], false);
    if (result.success === false) return publicTypes.ScanAndGenerate.NO_CONNECTION_TO_PLEX;
  }

  // Set the schedule time
  const scheduleTime = Math.floor(Date.now() / 1000) + plexSettings['plex.library.autoScan.delay'];
  await settings.set('plex.library.autoScan.nextRun', scheduleTime);

  // Wait for the autoScan delay to expire
  await helpers.delay(plexSettings['plex.library.autoScan.delay'] * 1000);

  // Get the settings again (they might have changed)
  plexSettings = await settings.getSet('plex');

  // Block scope the second half of this function
  {
    // Check that we have permission to do this sync
    if (plexSettings['plex.enable'] === false) return publicTypes.ScanAndGenerate.PLEX_DISABLED;
    if (plexSettings['plex.library.autoScan.enable'] === false) return publicTypes.ScanAndGenerate.AUTO_SCAN_DISABLED;
    if (plexSettings['plex.library.autoScan.scheduled'] === true) return publicTypes.ScanAndGenerate.AUTO_SCAN_ONLY_ALLOWED_DURING_CRON;

    // Check that there are no books processing (IE. the processor is idle)
    if(LibraryManager.getNoneWorking() === false) return publicTypes.ScanAndGenerate.BOOKS_STILL_PROCESSING;

    // Test the plex connection
    const result = await testPlexConnection(plexSettings['plex.address'], plexSettings['plex.token'], false);
    if (result.success === false) return publicTypes.ScanAndGenerate.NO_CONNECTION_TO_PLEX;

    // Check if there is one running right now. If so, don't schedule but also don't resolve the schedule request.
    if (plexSettings['plex.library.autoScan.inProgress'] === true) return publicTypes.ScanAndGenerate.ALREADY_IN_PROGRESS;
  }

  console.log('scheduler trigger')
  // We are now running, so no need to record when the next run is
  await settings.set('plex.library.autoScan.nextRun', -1);

  // Perform the scan and generate
  return await scanAndGenerate();
}