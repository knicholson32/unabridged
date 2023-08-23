import prisma from '$lib/server/prisma';
import { error, redirect } from '@sveltejs/kit';
import type { Decimal } from '@prisma/client/runtime/library.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params }) => {

  const title = params.title;

  // Check that the ID was actually submitted
  if (title === null || title === undefined) throw error(404, 'Not found');

  // Get the profile from the database
  const series = await prisma.series.findUnique({ where: { title }, include: { 
    books: {
      include: {
        authors: true,
        genres: true,
        narrators: true,
        cover: true
      }
    }
  }});

  // Return if the profile was not found
  if (series === null || series === undefined) throw error(404, 'Not found');
  for (const book of series.books) book.rating = book.rating.toNumber() as unknown as Decimal;

  series.books.sort((a, b) => {
    if (a.series_sequence !== null && b.series_sequence !== null) return (a.series_sequence > b.series_sequence) ? 1 : -1;
    if (a.series_sequence !== null && b.series_sequence === null) return -1;
    if (a.series_sequence === null && b.series_sequence !== null) return 1;
    return a.title.localeCompare(b.title);
  });

  return {
    series
  };

  // if (params.id === 'hello-world') {
  //     return {
  //         title: 'Hello world!',
  //         content: 'Welcome to our blog. Lorem ipsum dolor sit amet...'
  //     };
  // }

  // throw error(404, 'Not found');
}