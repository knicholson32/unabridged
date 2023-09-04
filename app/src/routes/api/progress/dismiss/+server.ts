// Delete the done ones now that we have them
import prisma from '$lib/server/prisma';
import { json } from '@sveltejs/kit';
import * as settings from '$lib/server/settings';
import type { ProcessProgressesAPI } from '$lib/types';

export const GET = async ({}) => {
  console.log('DELETE QUEUES');
  await prisma.processQueue.deleteMany({ where: { is_done: true, in_progress: false } });
  // Check for in progress or waiting items
  const notFinished = await prisma.processQueue.count({ where: { is_done: false }});
  // If there are no more to do, we can erase the time details
  if (notFinished === 0) {
    await settings.set('progress.startTime', -1);
    await settings.set('progress.endTime', -1);
    await settings.set('progress.paused', await settings.get('progress.startPaused'));
  }
  // Return
  return json({ ok: true, status: 200 } satisfies ProcessProgressesAPI);
}