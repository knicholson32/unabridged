import { json } from '@sveltejs/kit';
import { API } from '$lib/types';
import * as Plex from '$lib/server/plex';
import * as settings from '$lib/server/settings';

export const GET = async ({ params }) => {
  const key = params.key;

  // Check that the ID was actually submitted
  if (key === null || key === undefined) return API.response._400({ missingPaths: ['key'] });

  const plexSettings = await settings.getMany('plex.address', 'plex.token', 'system.debug')

  // Delete the collection
  await Plex.collections.deleteCollection(key, plexSettings['plex.address'], plexSettings['plex.token'], plexSettings['system.debug']);

  // Return OK
  return API.response.success();
}