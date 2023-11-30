import type * as types from './types';
import type * as publicTypes from '$lib/types';
import * as settings from '$lib/server/settings';
import * as helpers from '$lib/server/helpers';
import fetch, { AbortError } from 'node-fetch';

export * as types from './types';


const getAPITimeout = async () => {
  const apiTimeout = await settings.get('plex.apiTimeout');
  if (apiTimeout > 10000) return 10000;
  return apiTimeout;
}


// AbortController was added in node v14.17.0 globally
const AbortController = globalThis.AbortController || await import('abort-controller')

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



  const controller = new AbortController();
  const apiTimeout = await getAPITimeout();
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

    if (debug > 1) console.log('response', response);

    // Check for unauthorized
    if (response.status === 401) return { success: false, source: 'plex.token', message: 'Unauthorized.' };

    // Check for a non-ok status code
    if (response.status !== 200) return { success: false, source: 'plex.address', message: 'Invalid response code: ' + response.status + ', ' + response.statusText };

    // Decode the response as base data
    const base = await response.json() as types.Base;

    if (debug > 1) console.log('base', base);

    // Check to see that the base data makes sense
    if (base === undefined || base.MediaContainer === undefined || base.MediaContainer.myPlexUsername === undefined) {
      // It does not. Log an error
      console.error('ERROR: Received:', JSON.stringify(base));
      return { success: false, source: 'plex.address', message: 'Could not fetch data from the server. See logs for more info.' };
    }

    // It does. Save data based on the new connection if required
    if (saveData) await settings.set('plex.friendlyName', base.MediaContainer.friendlyName ?? '');

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


export const get = async (resource: string, plexURL?: string, plexToken?: string): Promise<null | unknown> => {
  if (await settings.get('plex.enable') !== true) return null;
  if (plexToken === undefined) plexToken = await helpers.decrypt(await settings.get('plex.token'));
  if (plexURL === undefined) plexURL = await settings.get('plex.address');
  if (plexToken === '') return null;

  if (plexURL.endsWith('/')) plexURL = plexURL.substring(0, plexURL.length - 1);

  try {
    const response = await fetch(`${plexURL}${resource}`, {
      method: 'get',
      headers: {
        'Accept': 'application/json',
        'X-Plex-Token': plexToken
      }
    });

    return await response.json();
  } catch (e) {
    const err = e as Error;
    console.error(err.message);
    return null;
  }
}

export const getServerInformation = async () : Promise<null | types.Base> => {
  const results = await get('/');
  if (results === null) return null;
  return results as unknown as types.Base;
}


export const getSections = async (plexURL?: string, plexToken?: string): Promise<null | types.Sections> => {
  const results = get('/library/sections', plexURL, plexToken);
  if (results === null) return null;
  return results as unknown as types.Sections;
}