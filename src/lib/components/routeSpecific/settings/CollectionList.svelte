<script lang="ts">
	import type { Prisma } from '@prisma/client';
	import { Collection } from '.';

	type CollectionDetails = (Prisma.SeriesGetPayload<{ include: { books: true } }> & {
		icon: string;
		url: string;
	})[];
	export let collections: CollectionDetails;

	const deleteCollection = async (id: string) => {
		const collectionIdx = collections.findIndex((c) => c.id === id);
		if (collectionIdx === -1) return;
		const collection = collections[collectionIdx];
		const t = await fetch('/api/plex/collection/remove/' + collection.plexKey);
		if (t.status === 200) {
			collections.splice(collectionIdx, 1);
			collections = collections;
		}
	};
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 grid-rows-2 gap-3">
	<!-- {#each collections as collection} -->
	{#each collections as collection (collection)}
		<Collection {collection} trash={() => deleteCollection(collection.id)} />
	{/each}
</div>
