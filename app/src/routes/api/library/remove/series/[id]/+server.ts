import { json } from '@sveltejs/kit';
import { API } from '$lib/types';
import { LibraryManager } from '$lib/server/cmd/index.js';

export const GET = async ({ params }) => {
  const id = params.id;

  // Check that the ID was actually submitted
  if (id === null || id === undefined) return API.response._400({ missingPaths: ['id'] });

  // Remove all books in the series
  await LibraryManager.cleanSeries(id);

  // Return OK
  return API.response.success();
}