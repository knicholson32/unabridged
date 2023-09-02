import prisma from '$lib/server/prisma';
import { error, json } from '@sveltejs/kit';
import * as helpers from '$lib/helpers';
import type { ProcessProgressesAPI } from '$lib/types';

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

  // Return
  return json({ ok: true, progresses: progresses, status: 200 } satisfies ProcessProgressesAPI);
}