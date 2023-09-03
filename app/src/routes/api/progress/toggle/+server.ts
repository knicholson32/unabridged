import { json } from '@sveltejs/kit';
import * as settings from '$lib/server/settings';
import { LibraryManager } from '$lib/server/cmd/index.js';

export const GET = async ({}) => {
  const paused = await settings.get('progress.paused');
  await settings.set('progress.paused', !paused);
  if (paused) LibraryManager.eventLoop();
  return json({ ok: true, paused: !paused });
}