import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as DataBase from '$lib/server/db';

// Resolves to LibraryItemBookInfo || LibraryItemBookInfo[]
export const POST: RequestHandler = async ({ request }) => {
    const asin = await request.json();

    if (asin !== '') return json(await DataBase.libraryTable.get({ asin }));
    else return json(await DataBase.libraryTable.scan());
};
