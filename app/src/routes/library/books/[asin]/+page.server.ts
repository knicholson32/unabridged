import prisma from '$lib/server/prisma';
import { error, redirect } from '@sveltejs/kit';
import type { Decimal } from '@prisma/client/runtime/library.js';
import * as audible from '$lib/server/cmd/audible';
import { BookDownloadError, bookDownloadErrorToString } from '$lib/server/cmd/audible/types/index.js';

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
    cover: true,
    media: {
      select: {
        id: true,
        extension: true,
        title: true,
        size_b: true,
        description: true
      }
    },
    chapters: true
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

export const actions = {
  update: async ({ request, params }) => {
    const asin = params.asin;

    // Check that the ID was actually submitted
    if (asin === null || asin === undefined) throw error(404, 'Not found');

    // Get the profile from the database
    const book = await prisma.book.findUnique({
      where: { asin }, include: {
        authors: true,
        narrators: true,
        genres: true,
        series: true,
        profiles: true,
        cover: true
      }
    });

    // Return if the profile was not found
    if (book === null || book === undefined) throw error(404, 'Not found');

    const data = await request.formData();
    let subtitle = (data.get('subtitle') ?? null) as null | string;
    let description = (data.get('description') ?? null) as null | string;
    let isbn = (data.get('isbn') ?? null) as null | string;

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await prisma.book.update({
        where: { asin },
        data: {
          subtitle,
          description,
          isbn
        }
      });
      return { success: true, response: 'update' };
    } catch (e) {
      return { success: false, response: 'update' };
    }
  },
  download: async ({ request, params }) => {
    const asin = params.asin;

    // Check that the ID was actually submitted
    if (asin === null || asin === undefined) throw error(404, 'Not found');

    // Get the profile from the database
    const book = await prisma.book.findUnique({
      where: { asin }, include: {
        authors: true,
        narrators: true,
        genres: true,
        series: true,
        profiles: true,
        cover: true
      }
    });

    // Return if the profile was not found
    if (book === null || book === undefined) throw error(404, 'Not found');

    const res = await audible.cmd.download.download(book.asin);
    return { success: res === BookDownloadError.NO_ERROR, response: 'download', message: bookDownloadErrorToString(res) };
  }
}