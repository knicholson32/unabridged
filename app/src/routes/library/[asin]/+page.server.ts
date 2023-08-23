import prisma from '$lib/server/prisma';
import { error, redirect } from '@sveltejs/kit';
import type { Decimal } from '@prisma/client/runtime/library.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params }) => {

  const asin = params.asin;

  // Check that the ID was actually submitted
  if (asin === null || asin === undefined) throw error(404, 'Not found');

  // Get the profile from the database
  const book = await prisma.book.findUnique({ where: { asin }, include: { 
    authors: true,
    narrators: true,
    genres: true,
    series: true,
    profiles: true,
  }});

  // Return if the profile was not found
  if (book === null || book === undefined) throw error(404, 'Not found');

  book.rating = book.rating.toNumber() as unknown as Decimal;

  return {
    book
  };

  // if (params.id === 'hello-world') {
  //     return {
  //         title: 'Hello world!',
  //         content: 'Welcome to our blog. Lorem ipsum dolor sit amet...'
  //     };
  // }

  // throw error(404, 'Not found');
}