<script lang="ts">
	import Rating from '$lib/components/decorations/Rating.svelte';
	import BookShowcase from '$lib/components/routeSpecific/series/BookShowcase.svelte';
	import { EscapeOrClickOutside, UpDownEnter } from '$lib/events';
  import * as helpers from '$lib/helpers';
	import { cubicOut } from 'svelte/easing';
	import { fade, scale } from 'svelte/transition';

  export let data: import('./$types').PageData;

  let seriesMenuVisible = false;
  let seriesMenuButton: HTMLButtonElement;

  const toggleSeriesMenu = () => seriesMenuVisible = !seriesMenuVisible;
  const closeSeriesMenu = () => seriesMenuVisible = false;

  const removeAll = () => {
    const agree = confirm('Are you sure you want to delete all books in this series?');
    if (agree) {
      closeSeriesMenu();
      fetch(`/api/library/remove/series/${data.series.id}`);
    }
  }

  const downloadAll = () => {
    const agree = confirm('Are you sure you want to download all remaining books in this series?');
    if (agree) {
      closeSeriesMenu();
      fetch(`/api/library/download/series/${data.series.id}`);
    }
  }


  const coverHEX = data.series.books[0].cover?.hex_dom ?? '#FFFFFF';
  const coverBright = data.series.books[0].cover?.hex_dom_bright ?? true;

</script>

<nav class="flex border-b border-gray-200 bg-white z-50" aria-label="Breadcrumb">
  <ol role="list" class="mx-auto flex w-full max-w-screen-xl space-x-4 px-4 sm:px-6 lg:px-8">
    <li class="flex">
      <div class="flex items-center">
        <a href="/" class="text-gray-400 hover:text-gray-500">
          <svg class="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-3a1 1 0 00-1-1H9a1 1 0 00-1 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-6H3a1 1 0 01-.707-1.707l7-7z" clip-rule="evenodd" />
          </svg>
          <span class="sr-only">Home</span>
        </a>
      </div>
    </li>
    <li class="flex">
      <div class="flex items-center">
        <svg class="h-full w-6 flex-shrink-0 text-gray-200" viewBox="0 0 24 44" preserveAspectRatio="none" fill="currentColor" aria-hidden="true">
          <path d="M.293 0l22 22-22 22h1.414l22-22-22-22H.293z" />
        </svg>
        <a href="/library" class="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700">Library</a>
      </div>
    </li>
    <li class="flex">
      <div class="flex items-center">
        <svg class="h-full w-6 flex-shrink-0 text-gray-200" viewBox="0 0 24 44" preserveAspectRatio="none" fill="currentColor" aria-hidden="true">
          <path d="M.293 0l22 22-22 22h1.414l22-22-22-22H.293z" />
        </svg>
        <a href="/library" class="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700">Series</a>
      </div>
    </li>
    <li class="flex">
      <div class="flex items-center">
        <svg class="h-full w-6 flex-shrink-0 text-gray-200" viewBox="0 0 24 44" preserveAspectRatio="none" fill="currentColor" aria-hidden="true">
          <path d="M.293 0l22 22-22 22h1.414l22-22-22-22H.293z" />
        </svg>
        <a href="/library/series/{data.series.id}" class="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700" aria-current="page">
          {data.series.title}
        </a>
      </div>
    </li>
  </ol>
</nav>

<div class="">

  <div class="relative flex flex-col p-4 {coverBright ? 'text-gray-800' : 'text-white'}" style="background-color: {coverHEX};">
    <div class="absolute right-4 top-4 {coverBright ? '' : 'dark'}">
      <div class="relative">
        <button on:click={toggleSeriesMenu} bind:this={seriesMenuButton} class="px-1 py-1 text-gray-700 transition-colors duration-200 rounded-lg dark:text-gray-300 hover:bg-gray-100/70 dark:hover:text-gray-700" >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
          </svg>
        </button>

        <!--
            Dropdown menu, show/hide based on menu state.

            Entering: "transition ease-out duration-100"
              From: "transform opacity-0 scale-95"
              To: "transform opacity-100 scale-100"
            Leaving: "transition ease-in duration-75"
              From: "transform opacity-100 scale-100"
              To: "transform opacity-0 scale-95"
          -->
        {#if seriesMenuVisible}
          <!-- <div class="absolute right-0 z-10 mt-2.5 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none" role="menu" aria-orientation="vertical" aria-labelledby="user-menu-button" tabindex="-1"> -->
          <div in:scale="{{duration: 100, opacity: 0.95, start: 0.95, easing: cubicOut}}" out:scale="{{duration: 75, opacity: 0.95, start: 0.95, easing: cubicOut}}" use:EscapeOrClickOutside={{except: seriesMenuButton, callback: closeSeriesMenu}} class="absolute right-0 z-10 mt-2.5 w-32 origin-top-right" role="menu" aria-orientation="vertical" aria-labelledby="options-menu-button" tabindex="-1">
            <div in:fade="{{duration: 100, easing: cubicOut}}" out:fade="{{duration: 75, easing: cubicOut}}" class="divide-y divide-gray-200 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none antialiase">
              <div class="py-1" role="none">
                {#if !data.series.books.every((b) => b.downloaded === true && b.processed === true)}
                  <button on:click={downloadAll} class="unstyled text-left font-medium w-full hover:bg-gray-100 hover:text-gray-900 text-gray-700 block px-4 py-2 text-sm !no-underline" role="menuitem" tabindex="-1">
                    Download All
                  </button>
                {/if}
                {#if !data.series.books.every((b) => b.downloaded === false && b.processed === false)}
                <button on:click={removeAll} class="unstyled text-left font-medium w-full hover:bg-gray-100 hover:text-gray-900 text-gray-700 block px-4 py-2 text-sm !no-underline" role="menuitem" tabindex="-1">
                  Remove All
                </button>
                {/if}
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
    <div>
      <h1 class="font-medium text-2xl uppercase tracking-widest font-serif">
        {data.series.title}
        <span class="block sm:inline-flex font-sans text-sm text-opacity-30">{data.series.books.filter((b) => b.downloaded === true && b.processed === true).length}/{data.series.books.length} {helpers.basicPlural('Book', data.series.books.length)} Downloaded</span>
      </h1>
    </div>
    <div class="text-xs opacity-80">By {data.authors.join(', ')} | Narrated By {data.narrators.join(', ')}</div>
    <div class="text-xs opacity-80 mt-1">
      about {new helpers.RunTime({min: data.runTimeMinutes}).toFormat()} long
    </div>
    <div>
      <Rating fillColor={(coverBright ? '#000000' : '#ffffff')} ratingNumberColor={(coverBright ? 'text-gray-800' : 'text-white')} rating={data.weightedAvgRating.value} numReviews={data.weightedAvgRating.totalReviews} />
    </div>
  </div>

  <div class="mt-4 grid grid-cols-1 lg:grid-cols-1 xl:grid-cols-2 p-4 gap-4 sm:gap-12">
    {#each data.series.books as book}
      <BookShowcase book={book}/>
    {/each}
  </div>

</div>