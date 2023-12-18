import { json } from '@sveltejs/kit';
import { API } from '$lib/types';
import { LibraryManager } from '$lib/server/cmd/index.js';

export const GET = async ({ params }) => {
  const asin = params.asin;

  // Check that the ID was actually submitted
  if (asin === null || asin === undefined) return API.response._400({ missingPaths: ['asin'] });

  // Cancel the book
  await LibraryManager.cancelBook(asin);

  // Return OK
  return API.response.success();
}