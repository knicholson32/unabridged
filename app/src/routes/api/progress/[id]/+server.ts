import prisma from '$lib/server/prisma';
import { error, json } from '@sveltejs/kit';
import * as helpers from '$lib/helpers';
import type { ProcessProgressAPI } from '$lib/types';

export const GET = async ({ params }) => {

  const id = params.id;

  // Check that the ID was actually submitted
  if (id === null || id === undefined) throw error(404, 'Not found');

  const progress = await prisma.processQueue.findUnique({
    where: { bookAsin: id }
  });

  // Return if the progress was not found
  if (progress === null || progress === undefined) return json({ ok: false, status: 404 } satisfies ProcessProgressAPI)

  // Delete if it is done
  if (progress.is_done === true) {
    try {
      await prisma.processQueue.delete({ where: { is_done: true, bookAsin: id } });
    } catch(e) {
      // Nothing to do
    }
  }

  return json({ ok: true, progress: progress, status: 200 } satisfies ProcessProgressAPI);
}