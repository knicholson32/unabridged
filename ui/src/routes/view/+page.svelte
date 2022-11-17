<script lang="ts">
    import type { PageData } from './$types';
    import type { LibraryItemBookInfo } from '$lib/types';
	import BookList from './book.list.svelte';

    export let data: PageData;
	const books : LibraryItemBookInfo[] = [];
    for (let book of Object.values(data)) books.push(book);

    let syncButtonLocked = false;

    const sync = async () => {
        if (!syncButtonLocked) {
            syncButtonLocked = true;
            const response = await fetch('/api/sync', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
            });
            syncButtonLocked = false;
        }
    };
</script>

<div class="bg-white">
    <button class="text-sm font-medium block px-3 py-2 rounded-md { syncButtonLocked ? 'bg-sky-500 text-white' : 'bg-slate-100'}" on:click={sync}>Sync</button>
    <br><br>
    <BookList {books} />
</div>
