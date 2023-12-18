import type { API } from "$lib/types";

/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
  const booksInProcess = await (await fetch('/api/process/get/book')).json() as API.Response;
  const processSettings = await (await fetch('/api/process')).json() as API.Response;
  const nData = await (await fetch('/api/notification')).json() as API.Response;

  return {
    booksInProcess: booksInProcess.ok === true && booksInProcess.type === 'process.book' ? booksInProcess.processes : [],
    notifications: nData.ok === true && nData.type === 'notification' ? nData.notifications : [],
    processSettings: processSettings.ok === true && processSettings.type === 'process.settings' ? processSettings.settings : null
  };
}

/**
 * In progress:
 * 
 * [X] Essentially rip out most of the progress system
 * [X] Make a progress event for account sync
 * [ ] Delete the progress table from the DB and see what else used to use it
 * [ ] Consider if we even need the ProcessQueue to have progress info (leaning towards no)
 * [ ] If no to above, remove updates to ProcessQueue DB entry in AAXtoMP3 and Audible CLI
 * 
 * [ ] Make two endpoints for events- one for required events (like notifications), another for
 *     only when rapid-progress is required. The primary socket can be used to notify the client
 *     of a rapid-progress event starting (like account sync), and the client can auto-connect
 *     when opening the download manager
 * [ ] There is a bug where the main loading bar sometimes goes past 100%
 * 
 */