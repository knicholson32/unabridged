import type { BookDownloadOperationData, GenericOperationData, LibraryItemBookInfo, SyncOperationData } from "$lib/types";

export const operationStatusRequest = async (operationId: string) => {
    const response = await fetch('/api/operation/status', {
        method: 'POST',
        body: JSON.stringify(operationId),
        headers: { 'content-type': 'application/json' },
    });

    return await response.json() as GenericOperationData;
}

export const bookDownloadOSR = async (operationId: string) => {
    return await operationStatusRequest(operationId) as BookDownloadOperationData;
}

export const syncOSR = async (operationId: string) => {
    return await operationStatusRequest(operationId) as SyncOperationData;
}

export const getBookData = async (asin: string): Promise<LibraryItemBookInfo> => {
    const response = await fetch('/api/get/book', {
        method: 'POST',
        body: JSON.stringify(asin),
        headers: { 'content-type': 'application/json' },
    });

    return await response.json() as LibraryItemBookInfo
}

export const getAllBookData = async (): Promise<LibraryItemBookInfo[]> => {
    const response = await fetch('/api/get/book', {
        method: 'POST',
        body: JSON.stringify(''),
        headers: { 'content-type': 'application/json' },
    });

    return await response.json() as LibraryItemBookInfo[]
}


export const startBookDownload = async (asin: string): Promise<BookDownloadOperationData> => {
    const response = await fetch('/api/download', {
        method: 'POST',
        body: JSON.stringify(asin),
        headers: { 'content-type': 'application/json' },
    });

    return await response.json() as BookDownloadOperationData;
}

export const startSync = async (): Promise<SyncOperationData> => {
    const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
    });

    return await response.json() as SyncOperationData;
}