import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as db from '$lib/server/db';
import type { LibraryItemBookInfo } from '$lib/server/db';
import {Exec} from '$lib/server/utils'
import os from 'os';

// check the available memory
const userHomeDir = os.homedir();

export const POST: RequestHandler = async ({ request }) => {
    const { a, b } = await request.json();
    // console.log((await db.data()).library);
    // (await db.data()).library.push({
    //   arn: 'test123!'
    // } as LibraryItemBookInfo);
    // db.write();
    console.log(await(await (new Exec('pwd').execute())).stdout);
    console.log(userHomeDir);
    return json(a + b);
};
