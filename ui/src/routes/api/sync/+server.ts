import type { RequestHandler } from './$types';
import { sync } from '$lib/server/audible';

export const POST: RequestHandler = async () => {
    console.log('Running Sync Function on Server');
    await sync();
    console.log('Sync Function Done');
    return new Response();
}