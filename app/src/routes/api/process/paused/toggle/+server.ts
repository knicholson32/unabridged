import * as settings from '$lib/server/settings';
import { LibraryManager } from '$lib/server/cmd/index.js';
import { API } from '$lib/types';
import * as events from '$lib/server/events';

export const GET = async ({}) => {
  const paused = await settings.get('progress.paused');
  await settings.set('progress.paused', !paused);
  events.emit('process.settings', await settings.getSet('progress'));
  if (paused) LibraryManager.eventLoop();

  return API.response.success({ bool: !paused });
}