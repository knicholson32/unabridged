import { json } from '@sveltejs/kit';
import type { DownloadAPI } from '$lib/types';
import { LibraryManager } from '$lib/server/cmd/index.js';

export const GET = async ({ params }) => {
  const asin = params.asin;

  // Check that the ID was actually submitted
  if (asin === null || asin === undefined) return json({ status: 404, ok: false } satisfies DownloadAPI)

  // Queue the book
  await LibraryManager.cleanBook(asin);

  // Return OK
  return json({ status: 200, ok: true } satisfies DownloadAPI)
}