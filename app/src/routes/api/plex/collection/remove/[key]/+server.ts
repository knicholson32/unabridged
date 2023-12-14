import { json } from '@sveltejs/kit';
import type { DownloadAPI } from '$lib/types';
import * as Plex from '$lib/server/plex';
import * as settings from '$lib/server/settings';

export const GET = async ({ params }) => {
  const key = params.key;

  // Check that the ID was actually submitted
  if (key === null || key === undefined) return json({ status: 404, ok: false } satisfies DownloadAPI)

  const plexSettings = await settings.getMany('plex.address', 'plex.token', 'system.debug')

  // Delete the collection
  await Plex.collections.deleteCollection(key, plexSettings['plex.address'], plexSettings['plex.token'], plexSettings['system.debug']);

  // Return OK
  return json({ status: 200, ok: true } satisfies DownloadAPI)
}