import { error, json } from '@sveltejs/kit';
import type { DownloadAPI } from '$lib/types';
import * as Plex from '$lib/server/plex';
import * as settings from '$lib/server/settings';
import { toBuffer } from '$lib/helpers';

export const GET = async ({ setHeaders, params }) => {
  const key = params.key;

  // Check that the ID was actually submitted
  if (key === null || key === undefined) return json({ status: 404, ok: false } satisfies DownloadAPI)

  const plexSettings = await settings.getMany('plex.address', 'plex.token', 'system.debug', 'plex.enable')
  const debug = plexSettings['system.debug'];

  // Make sure plex is enabled
  if (plexSettings['plex.enable'] === false) return json({ status: 400, ok: false, message: 'Plex is not enabled' } satisfies DownloadAPI)

  // Get the plex address
  const plexAddress = plexSettings['plex.address'];

  // Get the collection URL
  const urlObj = await Plex.collections.getCollectionThumbnailURLs([key], plexAddress, plexSettings['plex.token']);

  // Return if the profile was not found
  if (urlObj === null || !(key in urlObj)) return json({ status: 404, ok: false } satisfies DownloadAPI)
  const url = urlObj[key];

  // Initialize a variable to hold the status so we can return it if there is a parse error
  let status: number | null = null;

  let exp: Buffer;

  // Get the data
  try {
    // Make the fetch request
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Plex-Token': plexSettings['plex.token']
      }
    });

    // Print some extra data if debugging
    if (debug && response.status === 401) {
      console.log('unauthorized', response.status, response.statusText);
      return json({ status: 401, ok: false, message: 'Plex is not authorized' } satisfies DownloadAPI)
    }

    // Assign status just in case we error
    status = response.status;

    // Parse as an array buffer
    exp = toBuffer(await response.arrayBuffer());
    const contentType = response.headers.get('Content-Type') ?? 'image/jpeg';

    try {
      setHeaders({
        'Content-Type': contentType,
        'Content-Length': exp.length.toString()
      });
      return new Response(exp);
    } catch (e) {
      console.log('server error', e);
      return json({ status: 500, ok: false, message: 'Internal server error' } satisfies DownloadAPI)
    }

  } catch (e) {
    console.log('server error', e);
    return json({ status: 500, ok: false, message: 'Internal server error' } satisfies DownloadAPI)
  }
}