import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as audible from '$lib/server/audible';
import type { AudibleError } from '$lib/server/audible';
import * as DataBase from '$lib/server/db';
import { BookStatus, OperationType, type BookDownloadOperationData } from '$lib/types';
import { Operation } from '$lib/server/utils';

const sleep = (timeout: number) => new Promise((resolve, _) => setTimeout(resolve, timeout));

const doDownload = async (op: Operation, asin: string) => {
    // Fake doing something for a while
    for (let i = 0; i < 100; i++) {
        await sleep(50)
        op.progress = i;
    }

    // Note this book as "Downloaded" in the database
    const book = await DataBase.libraryTable.get({asin});
    book.status = BookStatus.Downloaded;
    await DataBase.libraryTable.put(book);

    // Finish the operation
    op.finish();
}

// Resolves to BookDownloadOperationData
export const POST: RequestHandler = async ({ request }) => {
    const asin = await request.json();
    console.log('Request to download asin', asin);
    
    const downloadOp = new Operation(OperationType.BookDownload);
    doDownload(downloadOp, asin);

    return json(downloadOp.data as BookDownloadOperationData);
};
