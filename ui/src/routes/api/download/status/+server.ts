import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as audible from '$lib/server/audible';
import type { AudibleError } from '$lib/server/audible';
import * as DataBase from '$lib/server/db';
import { BookStatus } from '$lib/types';

export const POST: RequestHandler = async ({ request }) => {
    const apin = await request.json();
    const downloads = (await DataBase.data()).downloads;

    return json(downloads[apin]);
};
