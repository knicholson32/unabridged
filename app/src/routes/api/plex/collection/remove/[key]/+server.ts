import { json } from '@sveltejs/kit';
import type { DownloadAPI } from '$lib/types';
import * as Plex from '$lib/server/plex';

export const GET = async ({ params }) => {
  const key = params.key;

  // Check that the ID was actually submitted
  if (key === null || key === undefined) return json({ status: 404, ok: false } satisfies DownloadAPI)

  // Delete the collection
  await Plex.deleteCollection(key);

  // Return OK
  return json({ status: 200, ok: true } satisfies DownloadAPI)
}