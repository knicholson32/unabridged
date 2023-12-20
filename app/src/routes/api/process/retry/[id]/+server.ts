import prisma from '$lib/server/prisma';
import { API, ProcessType } from '$lib/types';
import { LibraryManager } from '$lib/server/cmd/index.js';
import * as events from '$lib/server/events';

export const GET = async ({ params }) => {

  const id = params.id;

  // Check that the ID was actually submitted
  if (id === null || id === undefined) return API.response._400({ missingPaths: ['id'] });

  try {
    await prisma.processQueue.update({
      where: { id: id, type: ProcessType.BOOK },
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
    // events.emitProgress('processor.book', id, {
    //   d: false,
    //   r: false,
    // })
    await LibraryManager.eventLoop();
  } catch (e) {
    console.log(e);
    return API.response._404();
  }

  // Return
  return API.response.success();
}