// import { error } from '@sveltejs/kit';
import type { PageData, PageLoad } from './$types';
import * as DataBase from '$lib/server/db';

export const load: PageLoad = async (): PageData => {
    const data = {
        books: await DataBase.libraryTable.scan()
    }
    return data;
};