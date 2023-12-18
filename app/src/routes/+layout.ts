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

