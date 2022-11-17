<script lang="ts">
    import type { LibraryItemBookInfo } from '$lib/types';
    import Book from './book.list.item.svelte';
	export let books: LibraryItemBookInfo[];
</script>

<ul class="divide-y divide-slate-100">
    {#each books as book}
	    <svelte:component this={Book} {book} />
    {/each}
</ul>