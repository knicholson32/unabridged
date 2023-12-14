import * as settings from '$lib/server/settings';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params }) => {
  return {
    settingValues: {
      'search.autoSubmit': await settings.get('search.autoSubmit'),
      'general.timezone': await settings.get('general.timezone'),
    },
    version: process.env.GIT_COMMIT ?? 'Unknown'
  }
}

export const actions = {
  updateSearch: async ({ request }) => {

    const data = await request.formData();

    const autoSubmit = (data.get('search.autoSubmit') ?? undefined) as undefined | string;
    if (autoSubmit !== undefined) await settings.set('search.autoSubmit', autoSubmit === 'true');
  },
  updateLocalization: async ({ request }) => {

    const data = await request.formData();

    const timezone = (data.get('general.timezone') ?? undefined) as undefined | string;
    if (timezone !== undefined) await settings.set('general.timezone', timezone);
  }
}