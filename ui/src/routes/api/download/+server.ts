import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as audible from '$lib/server/audible';
import type { AudibleError } from '$lib/server/audible';
import * as DataBase from '$lib/server/db';
import { BookStatus } from '$lib/types';

const sleep = (timeout: number) => new Promise((resolve, _) => setTimeout(resolve, timeout));

export const POST: RequestHandler = async ({ request }) => {
    const apin = await request.json();
    console.log('Request to download APIN', apin);
    const data = (await DataBase.data());

    data.downloads[apin] = {
        percentage: 0
    };

    for (let i = 0; i < 100; i++) {
        await sleep(50)
        data.downloads[apin].percentage = i;
    }

    delete data.downloads[apin];

    data.library[apin].status = BookStatus.Downloaded;
    return json({book: data.library[apin]});
};
