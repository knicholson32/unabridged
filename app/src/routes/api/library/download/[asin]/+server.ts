import prisma from '$lib/server/prisma';
import { error, json } from '@sveltejs/kit';
import * as helpers from '$lib/helpers';
import * as audible from '$lib/server/cmd/audible';
import type { DownloadAPI} from '$lib/types';
import type { BookDownloadError } from '$lib/server/cmd/audible/types';
import { downloadPromises } from './downloads';

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

  // Check that there aren't too many books being downloaded
  if (Object.keys(downloadPromises).length > 5) return json({ status: 400, ok: false, message: 'Too many currently downloading books' } satisfies DownloadAPI)

  // Check that the book isn't currently being downloaded
  if (asin in downloadPromises) return json({ status: 400, ok: false, message: 'Book currently being downlaoded' } satisfies DownloadAPI)

  // Return if the profile was not found
  if (book === null || book === undefined) throw error(404, 'Not found');

  // Issue the request
  const p = audible.cmd.download.download(book.asin);
  downloadPromises[asin] = p;
  p.finally(() => {
    console.log('removal', asin);
    delete downloadPromises[asin];
  })
  
  // Return OK
  return json({ status: 200, ok: true } satisfies DownloadAPI)
}