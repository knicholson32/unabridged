import prisma from '$lib/server/prisma';
import * as settings from '$lib/server/settings';
import { API, ProcessType } from '$lib/types';
import * as events from '$lib/server/events';

export const GET = async ({ params }) => {
  const id = params.id;

  // Check that the ID was actually submitted
  if (id === null || id === undefined) return API.response._400({ missingPaths: ['id'] });

  try {
    await prisma.processQueue.deleteMany({ where: { id: id } });
  } catch(e) {
    // Nothing to do if this fails
  }

  // Check for in progress or waiting items
  const notFinished = await prisma.processQueue.count();
  // If there are no more to do, we can erase the time details
  if (notFinished === 0) {
    await settings.set('progress.startTime', -1);
    await settings.set('progress.endTime', -1);
    await settings.set('progress.paused', await settings.get('progress.startPaused'));
  }

  // Emit the events
  events.emit('processor.invalidate', await prisma.processQueue.count({ where: { type: ProcessType.BOOK, is_done: false }}) > 0);

  // Return
  return API.response.success();
}