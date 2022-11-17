import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import * as DataBase from '$lib/server/db';
import type { LibraryItemBookInfo } from '$lib/types';

export const load: PageLoad = async () => {
    // try {
    //     return json({ response: await audible.sync() });
    // } catch (err) {
    //     return json(JSON.stringify((err as Error).message));
    // }
    
    const data = (await DataBase.data()).library;

    const result: { [index: string] : LibraryItemBookInfo } = {};

    for (let i = 0; i < 6; i++) {
        const key = Object.keys(data)[i]
        result[key] = data[key];
    }
    
    return result;
};