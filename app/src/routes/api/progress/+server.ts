import prisma from '$lib/server/prisma';
import { error, json } from '@sveltejs/kit';
import * as helpers from '$lib/helpers';
import type { ProcessProgressesAPI } from '$lib/types';
import * as settings from '$lib/server/settings';

export const GET = async ({ params }) => {

  const progresses = await prisma.processQueue.findMany({
    where: {
      OR: [
        { in_progress: true },
        { in_progress: false },
        { is_done: true }
      ]
    },
    include: {
      book: {
        select: {
          title: true,
          authors: true,
          genres: true,
          cover: {
            select: {
              url_100: true
            }
          }
        }
      }
    }
  });

  // Return if the progress was not found
  if (progresses === null || progresses === undefined) return json({ ok: false, status: 404 } satisfies ProcessProgressesAPI)

  // Get whether or not the processor is paused
  const paused = await settings.get('progress.paused');

  const startTime = await settings.get('progress.startTime');
  const endTime = await settings.get('progress.endTime');

  let elapsed_s: number = -1;
  if (startTime !== -1) {
    if (endTime !== -1) {
      elapsed_s = endTime - startTime;
    } else {
      elapsed_s = Math.floor(Date.now() / 1000) - startTime;
    }
  }

  // Return
  return json({ ok: true, progresses: progresses, status: 200, paused, elapsed_s } satisfies ProcessProgressesAPI);
}