import prisma from '$lib/server/prisma';
import { error, json } from '@sveltejs/kit';
import { ProcessType, type ProcessProgressesAPI } from '$lib/types';
import { LibraryManager } from '$lib/server/cmd/index.js';

export const GET = async ({ params }) => {

  const asin = params.asin;

  // Check that the ID was actually submitted
  if (asin === null || asin === undefined) throw error(404, 'Not found');

  const id = await prisma.processQueue.findFirst({ where: { type: ProcessType.BOOK, book: { bookAsin: asin } } });
  if (id === null) throw error(404, 'Not found');

  try {
    await prisma.processQueue.update({
      where: { id: id.id},
      data: {
        in_progress: false,
        is_done: false,
        try_after_time: null,
        result: null,
        book: {
          update: {
            download_progress: 0,
            process_progress: 0,
            total_mb: null,
            downloaded_mb: null,
            speed: null,
          }
        }
      }
    });
    await LibraryManager.eventLoop();
  } catch (e) {
    console.log(e);
    return json({ ok: true, status: 400 } satisfies ProcessProgressesAPI);
  }

  // Return
  return json({ ok: true, status: 200 } satisfies ProcessProgressesAPI);
}