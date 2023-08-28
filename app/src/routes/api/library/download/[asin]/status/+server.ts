import prisma from '$lib/server/prisma';
import { error, json } from '@sveltejs/kit';
import * as helpers from '$lib/helpers';
import * as audible from '$lib/server/cmd/audible';
import type { DownloadStatusAPI } from '$lib/types';
import type { BookDownloadError } from '$lib/server/cmd/audible/types';
import { downloadPromises } from '../downloads';

export const GET = async ({ params }) => {
  const asin = params.asin;

  // Check that the ID was actually submitted
  if (asin === null || asin === undefined) return json({ status: 404, ok: false, inProgress: false } satisfies DownloadStatusAPI)

  // Get the profile from the database
  const book = await prisma.book.findUnique({ where: { asin } });

  // Return if the profile was not found
  if (book === null || book === undefined) return json({ status: 404, ok: false, inProgress: false } satisfies DownloadStatusAPI)

  if (asin in downloadPromises) {
    try {
      const progress = await prisma.progress.findUnique({
        where: { id_type: { id: asin, type: 'download' } },
        select: {
          id: false,
          type: true,
          progress: true,
          status: true,
          message: true,
          ref: true,
          speed_mb_s: true,
          total_mb: true,
          downloaded_mb: true
        }
      });
      return json({ status: 200, ok: true, inProgress: true, progress: progress ?? undefined } satisfies DownloadStatusAPI)
    } catch(e) {
      return json({ status: 200, ok: true, inProgress: true } satisfies DownloadStatusAPI)
    }
  } else {
    return json({ status: 200, ok: true, inProgress: false } satisfies DownloadStatusAPI)
  }
}