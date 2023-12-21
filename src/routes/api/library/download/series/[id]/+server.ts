import prisma from '$lib/server/prisma';
import { json } from '@sveltejs/kit';
import { API } from '$lib/types';
import { LibraryManager } from '$lib/server/cmd/index.js';

export const GET = async ({ params }) => {
  const id = params.id;

  // Check that the ID was actually submitted
  if (id === null || id === undefined) return API.response._400({ missingPaths: ['id'] });

  // // Clean the files that are hanging
  // await clean();

  // Get the profile from the database
  const series = await prisma.series.findUnique({ where: { id }, include: { books: true } });

  // Return if the profile was not found
  if (series === null || series === undefined) return API.response._404();

  const books: string[] = []
  // Add the books that aren't downloaded or aren't processed
  for (const book of series.books) if (book.processed === false || book.downloaded === false) books.push(book.asin);

  // Queue the book
  await LibraryManager.queueBooks(books);

  // Return OK
  return API.response.success();
}