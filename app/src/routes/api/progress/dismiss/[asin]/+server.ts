// Delete the done ones now that we have them

import prisma from '$lib/server/prisma';
import { error, json } from '@sveltejs/kit';
import * as settings from '$lib/server/settings';
import type { ProcessProgressesAPI } from '$lib/types';

export const GET = async ({ params }) => {

  const asin = params.asin;

  // Check that the ID was actually submitted
  if (asin === null || asin === undefined) throw error(404, 'Not found');

  console.log('DISMISS', asin);

  try {
    await prisma.processQueue.delete({
      where: { bookAsin: asin }
    });
  } catch(e) {
    // Nothing to do if this fails
  }

  // Check for in progress or waiting items
  const notFinished = await prisma.processQueue.count();
  // If there are no more to do, we can erase the time details
  if (notFinished === 0) {
    await settings.set('progress.startTime', -1);
    await settings.set('progress.endTime', -1);
  }

  // Return
  return json({ ok: true, status: 200 } satisfies ProcessProgressesAPI);
}