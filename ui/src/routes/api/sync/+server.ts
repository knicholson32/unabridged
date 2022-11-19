import type { RequestHandler } from './$types';
import { sync } from '$lib/server/audible';
import { OperationType, type SyncOperationData } from '$lib/types';
import { Operation } from '$lib/server/utils';
import { json } from '@sveltejs/kit';

// Resolves to SyncOperationData
export const POST: RequestHandler = async () => {
    console.log('Running Sync Function on Server');
    
    const syncOp = new Operation(OperationType.Sync);

    // Async function executed without await so it runs in background
    syncOp.execute(sync);

    return json(syncOp.data as SyncOperationData);
};