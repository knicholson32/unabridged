import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as DataBase from '$lib/server/db';
import { OperationStatus, OperationType, type GenericOperationData } from '$lib/types';

// Resolves to GenericOperationData
export const POST: RequestHandler = async ({ request }) => {
    const operationId = await request.json();
    // console.log('Status', DataBase.operationStore[operationId], operationId, DataBase.operationStore);

    const status: GenericOperationData = {
        id: operationId,
        type: OperationType.Unknown,
        progress: 0,
        status: OperationStatus.Inactive,
    }

    if (operationId in DataBase.operationStore) return json(DataBase.operationStore[operationId])
    else return json(status);
};
