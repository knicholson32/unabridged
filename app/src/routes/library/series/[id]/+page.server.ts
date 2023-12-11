import prisma from '$lib/server/prisma';
import { error, redirect } from '@sveltejs/kit';
import type { Decimal } from '@prisma/client/runtime/library.js';
import * as Plex from '$lib/server/plex';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params }) => {

  const id = params.id;

  // Check that the ID was actually submitted
  if (id === null || id === undefined) throw error(404, 'Not found');

  // Get the profile from the database
  const series = await prisma.series.findUnique({ where: { id }, include: { 
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


  let authors: string[] = [];
  let narrators: string[] = [];
  let runTimeMinutes = 0;
  let ratingVal = 0;
  let numReviews = 0;
  for (const book of series.books) numReviews += book.num_ratings;

  for (const book of series.books) {
    runTimeMinutes += book.runtime_length_min ?? 0;
    for (const author of book.authors) if (authors.find((a) => a === author.name) === undefined) authors.push(author.name);
    for (const narrator of book.narrators) if (narrators.find((n) => n === narrator.name) === undefined) narrators.push(narrator.name);
    const rating = book.rating as unknown as number;
    ratingVal = ratingVal + ((rating * book.num_ratings) / numReviews);
  }

  const collectionURL = series.plexKey === null ? null : await Plex.getCollectionWebURL(series.plexKey);
  console.log(collectionURL);

  return {
    series,
    collectionURL,
    authors,
    narrators,
    weightedAvgRating: {
      value: ratingVal,
      totalReviews: numReviews
    },
    runTimeMinutes
  };

  // if (params.id === 'hello-world') {
  //     return {
  //         title: 'Hello world!',
  //         content: 'Welcome to our blog. Lorem ipsum dolor sit amet...'
  //     };
  // }

  // throw error(404, 'Not found');
}