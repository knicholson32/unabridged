import { LibraryManager } from '$lib/server/cmd';

// Start the library manager
LibraryManager.start();

// /** @type {import('@sveltejs/kit').HandleServerError} */
// export async function handleError({ error, event }) {
//   // example integration with https://sentry.io/
//   // Sentry.captureException(error, { extra: { event, errorId } });

//   console.log('hook error', error, event);
//   console.log(await LibraryManager.getProgress('abc123'));
// }
