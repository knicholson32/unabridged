import prisma from '$lib/server/prisma';
import { json } from '@sveltejs/kit';
import * as settings from '$lib/server/settings';
import type { API } from '$lib/types';
import { compressJSON } from '$lib/server/helpers/index.js';

export const GET = async ({ request, setHeaders }) => {

  const processSettings = await settings.getSet('progress');
  
  const resp = compressJSON(request, { ok: true, settings: processSettings, status: 200, type: 'process.settings' } satisfies API.Process.Settings);

  setHeaders(resp.headers);
  return new Response(resp.data);
}