import { json } from '@sveltejs/kit';
import type { DownloadAPI } from '$lib/types';
import { LibraryManager } from '$lib/server/cmd/index.js';

export const GET = async ({ params }) => {
  const id = params.id;

  // Check that the ID was actually submitted
  if (id === null || id === undefined) return json({ status: 404, ok: false } satisfies DownloadAPI)

  // Remove all books in the series
  await LibraryManager.cleanSeries(id);

  // Return OK
  return json({ status: 200, ok: true } satisfies DownloadAPI)
}