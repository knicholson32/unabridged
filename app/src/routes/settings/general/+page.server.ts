import prisma from '$lib/server/prisma';
import { error } from '@sveltejs/kit';
import * as settings from '$lib/server/settings';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params }) => {

  const autoSubmit = await settings.get('search.autoSubmit');

  return {
    autoSubmit
  }
}

export const actions = {
  update: async ({ request }) => {

    const data = await request.formData();

    const autoSubmit = (data.get('autoSubmit') ?? undefined) as undefined | string;
    if (autoSubmit !== undefined) await settings.set('search.autoSubmit', autoSubmit === 'true');

  }
}