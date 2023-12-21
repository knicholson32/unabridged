<script lang="ts">
	import type { Prisma } from "@prisma/client";
	import { VerifyButton } from "../../buttons";
	import icons from "$lib/components/icons";

  type CollectionDetails = (Prisma.SeriesGetPayload<{ include: { books: true } }> & { icon: string, url: string });

  export let collection: CollectionDetails;
  export let trash: () => void;

</script>

<div class="flex items-center border rounded-md">
  <img src="{collection.icon}" alt="" class="w-[4.5rem] h-[4.5rem] rounded-md -m-4 mx-0"/>
  <div class="flex flex-col items-start content-start ml-2">
    <div class="text-black font-serif capitalize font-md leading-6 text-lg">{collection.title}</div>
    <div class="text-gray-400 text-xxs leading-3">Downloaded {collection.books.filter((b) => b.downloaded).length} / {collection.books.length} books</div>
    <div class="text-gray-400 text-xxs leading-3">Processed {collection.books.filter((b) => b.processed).length} / {collection.books.length} books</div>
  </div>
  <div class="grow"></div>
  <div class="flex flex-col divide-y h-16 justify-center border-l ml-2">
    <VerifyButton click={trash} class="py-1.5 w-6 grow h-full flex items-center justify-center hover:bg-gray-100">
      <svg slot="icon" xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="h-4 w-4" viewBox="0 0 16 16">
        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
        <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
      </svg>
      <svg slot="iconVerify" class="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 24 24" stroke-width="1.5" stroke="none" aria-hidden="true">
        {@html icons.exclamationCircleSolid}
      </svg>
    </VerifyButton>
  </div>
  <div class="flex flex-col divide-y h-16 justify-center border-l">
    <a href="{collection.url}" target="_blank" class="p-1.5 grow flex items-center hover:bg-gray-100 rounded-tr">
      <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" aria-hidden="true">
        {@html icons.chevronRight}
      </svg>
    </a>
    <a href="/library/series/{collection.books[0].seriesId}" target="_blank" class="p-1.5 grow flex items-center group hover:bg-gray-100 rounded-br" >
      <!-- <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" aria-hidden="true">
        {@html icons.chevronRight}
      </svg> -->
      <svg version="1.0" class="h-5 w-5 fill-black " xmlns="http://www.w3.org/2000/svg" stroke="none" fill="currentColor" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
        viewBox="0 0 123.5 123.5" xml:space="preserve">
        <path d="M24.7,5C13.3,5,4,14.3,4,25.7V120h94.3c11.4,0,20.7-9.3,20.7-20.7V5H24.7z M59.5,81l-14.6,0.7l-0.4-6
          c-3.1,4-7,6.3-11.6,6.3c-6.1,0-10.2-3.4-10.1-12.9l0.2-17.4L19,50.9v-3l14.6-2.1l1.1,0.8l-0.4,10.1v12.6c0,4.4,1.4,5.9,3.9,5.9
          c2,0,4.2-1.4,6.2-3.3l0.2-20.1l-3.9-0.9v-2.8l14.2-2.3l1.1,0.8l-0.2,10.1v20.3l3.7,0.8V81z M105.9,81h-3.5H90.7h-3.6v-3.3l3.7-0.8
          c0.1-3.5,0.1-7.8,0.1-10.9v-7.5c0-4.6-1.1-6.2-4-6.2c-1.8,0-4,0.9-6.1,2.6V66c0,3,0,7.4,0.1,11l3.4,0.7V81H81H69.2h-3.7v-3.3
          l3.9-0.8c0.1-3.5,0.1-7.8,0.1-10.8v-4.1c0-3.9-0.1-5.4-0.2-8.3L64.8,53v-2.8l14.1-4.7l1.2,0.8l0.4,5.2c3.8-4.4,7.3-5.9,11.4-5.9
          c6.2,0,10.3,4,10.3,12.3V66c0,3.1,0,7.5,0.1,10.9l3.6,0.7V81z"/>
      </svg>
    </a>
  </div>
</div>