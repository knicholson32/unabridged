import prisma from '$lib/server/prisma';
import { error, json } from '@sveltejs/kit';
import * as helpers from '$lib/helpers';
import * as audible from '$lib/server/cmd/audible';
import type { DownloadAPI} from '$lib/types';
import type { BookDownloadError } from '$lib/server/cmd/audible/types';
import { LibraryManager } from '$lib/server/cmd/index.js';

export const GET = async ({params}) => {
  const asin = params.asin;

  // Check that the ID was actually submitted
  if (asin === null || asin === undefined) return json({ status: 404, ok: false } satisfies DownloadAPI)

  // // Clean the files that are hanging
  // await clean();

  // Get the profile from the database
  const book = await prisma.book.findUnique({ where: { asin }});

  // Return if the profile was not found
  if (book === null || book === undefined) return json({ status: 404, ok: false } satisfies DownloadAPI)

  // Check that the book isn't currently being downloaded
  if (await LibraryManager.getIsQueued(book.asin)) return json({ status: 400, ok: false, message: 'Book currently being downlaoded' } satisfies DownloadAPI)

  // Queue the book
  await LibraryManager.queueBook(book.asin);
  
  // Return OK
  return json({ status: 200, ok: true } satisfies DownloadAPI)
}