<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { ProcessError, type PageNeedsProgress, type ProcessProgress, type UpdateProgress } from '$lib/types';
  import { processErrorToStringShort, processErrorToStringLong } from '$lib/types';
	import { getContext } from 'svelte';
  export let progress: ProcessProgress;
  const updateProgress = getContext<UpdateProgress>('updateProgress');
    
  const dismiss = async () => {
    await fetch(`/api/progress/dismiss/${progress.bookAsin}`);
    updateProgress();
  }

  const retry = async () => {
    await fetch(`/api/progress/retry/${progress.bookAsin}`);
    updateProgress();
  }

  const result = progress.result as ProcessError;
  const resultShort = processErrorToStringShort(result);
  const resultLong = processErrorToStringLong(result);

</script>

<div class="relative mx-2 my-1 flex gap-1 items-center">
  <a href="/library/books/{progress.bookAsin}" class="overflow-hidden whitespace-nowrap shrink inline-flex items-center gap-2">
    <div class="w-5 inline-flex"><img src="{progress.book.cover?.url_100}" class="rounded-md h-5 w-5" alt="{progress.book.title} Cover Image" /></div>
    <div class="truncate overflow-hidden max-w-[25rem] inline-flex items-baseline text-sm gap-1">
      <span class="font-serif font-bold truncate overflow-hidden  {result !== ProcessError.NO_ERROR ? 'line-through' : ''}" title="{progress.book.title}">{progress.book.title}</span>
    </div>
  </a>
  <div class="grow"></div>
  {#if result !== ProcessError.NO_ERROR}
    <button on:click={retry} type="button" class="group shrink-0 text-xxs border border-red-600 text-red-600 rounded-md pl-2 flex items-center gap-2 truncate overflow-hidden" title="{resultLong}">
      {resultShort}
      <div class="transition-colors duration-100 p-0.5 bg-red-600 text-white group-hover:bg-red-700" >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
          <path fill-rule="evenodd" d="M10 4.5c1.215 0 2.417.055 3.604.162a.68.68 0 01.615.597c.124 1.038.208 2.088.25 3.15l-1.689-1.69a.75.75 0 00-1.06 1.061l2.999 3a.75.75 0 001.06 0l3.001-3a.75.75 0 10-1.06-1.06l-1.748 1.747a41.31 41.31 0 00-.264-3.386 2.18 2.18 0 00-1.97-1.913 41.512 41.512 0 00-7.477 0 2.18 2.18 0 00-1.969 1.913 41.16 41.16 0 00-.16 1.61.75.75 0 101.495.12c.041-.52.093-1.038.154-1.552a.68.68 0 01.615-.597A40.012 40.012 0 0110 4.5zM5.281 9.22a.75.75 0 00-1.06 0l-3.001 3a.75.75 0 101.06 1.06l1.748-1.747c.042 1.141.13 2.27.264 3.386a2.18 2.18 0 001.97 1.913 41.533 41.533 0 007.477 0 2.18 2.18 0 001.969-1.913c.064-.534.117-1.071.16-1.61a.75.75 0 10-1.495-.12c-.041.52-.093 1.037-.154 1.552a.68.68 0 01-.615.597 40.013 40.013 0 01-7.208 0 .68.68 0 01-.615-.597 39.785 39.785 0 01-.25-3.15l1.689 1.69a.75.75 0 001.06-1.061l-2.999-3z" clip-rule="evenodd" />
        </svg>
      </div>
    </button>
  {:else}
    <!-- <div class="text-xxs bg-green-600 text-white rounded-lg px-2 py-1 float-right truncate overflow-hidden" title="{resultLong}">{resultShort}</div> -->
  {/if}
  <button on:click={dismiss} type="button" class="transition-colors duration-100 p-1 rounded-lg text-black  hover:bg-gray-200" >
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
    </svg>
  </button>
</div>


