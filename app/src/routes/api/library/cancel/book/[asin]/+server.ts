import prisma from '$lib/server/prisma';
import { error, json } from '@sveltejs/kit';
import * as helpers from '$lib/helpers';
import * as audible from '$lib/server/cmd/audible';
import type { DownloadAPI } from '$lib/types';
import type { BookDownloadError } from '$lib/server/cmd/audible/types';
import { LibraryManager } from '$lib/server/cmd/index.js';

export const GET = async ({ params }) => {
  const asin = params.asin;

  // Check that the ID was actually submitted
  if (asin === null || asin === undefined) return json({ status: 404, ok: false } satisfies DownloadAPI)

  // Queue the book
  await LibraryManager.cancelBook(asin);

  // Return OK
  return json({ status: 200, ok: true } satisfies DownloadAPI)
}