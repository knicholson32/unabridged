import prisma from '$lib/server/prisma';
import { error, json } from '@sveltejs/kit';
import * as settings from '$lib/server/settings';
import type { ProcessProgressAPI } from '$lib/types';

export const GET = async ({ params }) => {

  const id = params.id;

  // Check that the ID was actually submitted
  if (id === null || id === undefined) throw error(404, 'Not found');

  const progress = await prisma.processQueue.findUnique({
    where: { bookAsin: id },
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
  if (progress === null || progress === undefined) return json({ ok: false, status: 404 } satisfies ProcessProgressAPI)

  // Get whether or not the processor is paused
  const paused = !await settings.get('progress.running');

  return json({ ok: true, progress: progress, status: 200, paused } satisfies ProcessProgressAPI);
}