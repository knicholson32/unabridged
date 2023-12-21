import prisma from '$lib/server/prisma';
import { error, redirect } from '@sveltejs/kit';
import type { Decimal } from '@prisma/client/runtime/library.js';
import * as settings from '$lib/server/settings';
import { SourceType } from '$lib/types/index.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params, fetch }) => {


  const id = params.id;

  // Check that the ID was actually submitted
  if (id === null || id === undefined) throw error(404, 'Not found');

  // Get the profile from the database
  const source = await prisma.source.findUnique({
    where: { id },
    include: {
      audible: true
    }
  });

  // Return if the profile was not found
  if (source === null || source === undefined) throw error(404, 'Not found');


  if (source.type === SourceType.AUDIBLE) throw redirect(301, `/sources/audible/${id}`);
}