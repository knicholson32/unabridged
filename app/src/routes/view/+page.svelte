<script lang="ts">
    import type { PageData } from './$types';
    import { OperationStatus, type LibraryItemBookInfo, type SyncOperationData } from '$lib/types';
    import BookList from './book.list.svelte';
    import * as requests from '$lib/client/requests';

    export let data: PageData;
    let books = data.books as LibraryItemBookInfo[];

    let syncActive = false;
    let syncProgress = 0;
    let operationStatusTimeout = 0;
    let operation: SyncOperationData;

    const sleep = (timeout: number) =>
        new Promise((resolve, _) => setTimeout(resolve, timeout));

    const monitorSync = async () => {
        while (syncActive && operationStatusTimeout < 250) {
            await sleep(1000);
            await (async () => {
                operation = await requests.syncOSR(operation.id);

                // Not started yet or doesnt exist
                if (operation.status === OperationStatus.Inactive) {
                    syncProgress = 0;
                    operationStatusTimeout++;
                }

                // Currently Active
                else if (operation.status === OperationStatus.Active) {
                    syncProgress = Math.floor(operation.progress);
                }

                // Done
                else if (operation.status === OperationStatus.Done) {
                    console.log('done');
                    syncProgress = 100;
                    syncActive = false;
                }
            })();
        }

        books = await requests.getAllBookData();
    };

    const sync = async () => {
        if (!syncActive) {
            syncActive = true;
            console.log('Starting Sync');
            operation = await requests.startSync();
            
            operationStatusTimeout = 0;
            monitorSync();
        }
    };
</script>

<div class="bg-white">
    <button
        class="test block rounded-md px-3 py-2 text-sm font-medium {syncActive
            ? 'bg-sky-500 text-white'
            : 'bg-slate-100'}"
        on:click={sync}>{'Sync ' + syncProgress + '%'}
    </button>
    <br/><br/>
    <BookList {books} />
</div>
