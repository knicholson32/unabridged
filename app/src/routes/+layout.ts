import type { API } from "$lib/types";

/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
  const booksInProcess = await (await fetch('/api/process/get/book')).json() as API.Response;
  const nData = await (await fetch('/api/notification')).json() as API.Response;

  return {
    booksInProcess: booksInProcess.ok === true && booksInProcess.type === 'process.book' ? booksInProcess.processes : [],
    processSettings: booksInProcess.ok === true && booksInProcess.type === 'process.book' ? booksInProcess.settings : null,
    notifications: nData.ok === true && nData.type === 'notification' ? nData.notifications : []
  };
}