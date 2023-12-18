// Delete the done ones now that we have them
import prisma from '$lib/server/prisma';
import * as settings from '$lib/server/settings';
import { API } from '$lib/types';
import * as events from '$lib/server/events';

export const GET = async () => {
  // Get all the processes that are about to be dismissed
  const toDelete = await prisma.processQueue.findMany({ where: { is_done: true, in_progress: false }, select: { id: true } });

  // Delete the processes that can be dismissed
  await prisma.processQueue.deleteMany({ where: { is_done: true, in_progress: false } });

  // Check for in progress or waiting items
  const notFinished = await prisma.processQueue.count({ where: { is_done: false }});

  // Emit the events
  events.emit('process.dismissed', toDelete.flatMap((e) => e.id));

  // If there are no more to do, we can erase the time details
  if (notFinished === 0) {
    await settings.set('progress.startTime', -1);
    await settings.set('progress.endTime', -1);
    await settings.set('progress.paused', await settings.get('progress.startPaused'));
    events.emit('process.settings', await settings.getSet('progress'));
  }

  // Return
  return API.response.success();
}