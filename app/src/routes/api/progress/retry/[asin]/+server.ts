import prisma from '$lib/server/prisma';
import { error, json } from '@sveltejs/kit';
import type { ProcessProgressesAPI } from '$lib/types';
import { LibraryManager } from '$lib/server/cmd/index.js';

export const GET = async ({ params }) => {

  const asin = params.asin;

  // Check that the ID was actually submitted
  if (asin === null || asin === undefined) throw error(404, 'Not found');

  try {
    await prisma.processQueue.update({
      where: { bookAsin: asin },
      data: {
        in_progress: false,
        is_done: false,
        download_progress: 0,
        process_progress: 0,
        total_mb: null,
        downloaded_mb: null,
        result: null,
        speed: null,
        try_after_time: null
      }
    });
    LibraryManager.eventLoop();
  } catch (e) {
    return json({ ok: true, status: 400 } satisfies ProcessProgressesAPI);
  }

  // Return
  return json({ ok: true, status: 200 } satisfies ProcessProgressesAPI);
}