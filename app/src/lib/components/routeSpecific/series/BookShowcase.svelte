<script lang="ts">
	import { Bullet } from "$lib/components/decorations";
	import Rating from "$lib/components/decorations/Rating.svelte";
  import * as helpers from '$lib/helpers';
	import type { Prisma } from "@prisma/client";
	import { getContext } from "svelte";



  type Book = Prisma.BookGetPayload<{
    include: {
      authors: true,
      genres: true,
      narrators: true
      cover: true
    }
  }>;
  
  export let book: Book;

  const updateProgress = getContext<() => Promise<void>>('updateProgress');
  const openManager = getContext<() => void>('openManager');

  const download = async () => {
    await fetch(`/api/library/download/book/${book.asin}`)
    await updateProgress();
    openManager()
  }

  let rating = book.rating as unknown as number;

  let authors = book.authors.map((a) => a.name).join(', ');
  let narrators = book.narrators.map((a) => a.name).join(', ');

  let description = book.description ?? '';
  // https://stackoverflow.com/questions/28385473/check-for-space-after-full-stop
  description = description.replace(/\.([^\.\s])/g, '. $1').replaceAll('.  ', '. ').replaceAll('\n', ' ');
  // d news.The Ru

  // style=" background-image: url('{book.cover?.url_500}'); background-size: contain; background-position: center;"

</script>


<div class="relative w-full flex flex-col ">
  <div class="absolute left-0 right-0 top-0 bottom-0 shadow-md rounded-xl overflow-hidden bg-white">
    <div class="absolute left-0 right-0 top-0 bottom-0 brightness-200 saturate-100 opacity-30" style=" background-color: {book.cover?.hex_dom};" />
  </div>
  <div class="relative flex w-full h-full pl-4">
    <div class="flex-grow-0 hidden sm:block">
      <div class="w-52 relative">
        <div class="absolute -top-4 shadow-lg rounded-lg overflow-hidden">
          <a href="/library/books/{book.asin}">
            <img class="" src="{book.cover?.url_1000}" alt="">
          </a>
        </div>
      </div>
    </div>
    <div class="flex-grow w-[1%] p-4 flex flex-col">
      <p class="text-black relative font-bold font-serif text-lg whitespace-nowrap">
        <a href="/library/books/{book.asin}">
          <img class="inline-flex sm:hidden w-9 rounded-md mr-1" src="{book.cover?.url_100}" alt="">
          {book.title}
        </a>
        <span class="text-xxs leading-7 font-sans font-normal text-gray-700 align-baseline ml-1">Book {book.series_sequence}</span>
        <span class="absolute right-0 top-0 flex">
          {#if book.downloaded && book.processed}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 m-1">
              <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
            </svg>
          {:else}
            <button on:click={download} class="px-1 py-1 text-gray-700 transition-colors duration-200 rounded-lg dark:text-gray-300 hover:bg-gray-100/70 dark:hover:text-gray-700" >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
                <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
              </svg>

            </button>
          {/if}
        </span>

      </p>
      <p class="font-normal font-sans text-xxs text-gray-700">by {authors}, Narrated by {narrators}</p>
      {#if book.runtime_length_min !== null}
        <p class="font-normal font-sans text-xxs text-gray-700">{new helpers.RunTime({min: book.runtime_length_min}).toFormat()} long</p>
      {/if}
      <Rating rating={rating} numReviews={book.num_ratings}/>
      <p title="{description}" class="pt-0.5 text-xs h-[6.25rem] text-justify overflow-y-auto text-ellipsis">{description}</p>
      <p class="flex space-x-1 pt-1 overflow-x-auto flex-nowrap select-none">
        {#each book.genres as genre}
          <span class="inline-flex whitespace-nowrap px-1.5 py-0.5 items-center text-xs font-normal rounded-full text-gray-800 gap-x-2 bg-white/60 dark:bg-gray-800">{genre.tag}</span>
        {/each}
      </p>
    </div>
  </div>
  <!-- <div class="w-full h-10 mt-2 border-t border-gray-100 px-4 flex align-middle items-center justify-center">
    <p>Menu</p>
  </div> -->
</div>


