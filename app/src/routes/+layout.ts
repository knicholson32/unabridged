import type { NotificationAPI, ProcessProgressesAPI } from "$lib/types";

/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
  const progress = await (await fetch('/api/progress')).json() as ProcessProgressesAPI;
  const nData = await (await fetch('/api/notification')).json() as NotificationAPI;

  return {
    progresses: progress.progresses ?? [],
    notifications: nData.notifications ?? [],
    processPaused: progress.paused ?? false,
    elapsed_s: progress.elapsed_s ?? -1
  };
}