<script lang="ts">
	import { invalidate } from '$app/navigation';
	import icons from '$lib/components/icons';
	import type { PageNeedsProgress, ProcessProgress, UpdateProgress } from '$lib/types';
  import type { Prisma } from "@prisma/client";
	import { getContext } from 'svelte';

  export let progress: ProcessProgress;

  const updateProgress = getContext<UpdateProgress>('updateProgress');

  $: downloaded = progress.download_progress >= 1;
  $: waitingForDownload = progress.download_progress === 0;
  $: processed = progress.process_progress >= 1;
  $: waitingForProcess = downloaded && progress.process_progress === 0;

  $: barProgress = (downloaded ? progress.process_progress / 2 + 0.5 : progress.download_progress / 2)

  const cancel = async () => {
    await fetch(`/api/library/cancel/book/${progress.bookAsin}`);
    updateProgress();
  }

</script>

<div class="relative mx-2 my-2">
  <div class="mx-1 inline-flex overflow-hidden whitespace-nowrap gap-1">
    <div class="w-10"><img src="{progress.book.cover?.url_100}" class="rounded-md h-10 w-10" alt="{progress.book.title} Cover Image" /></div>
    <div class="truncate max-w-[18rem]">
      <span class="font-serif font-bold" title="{progress.book.title}">{progress.book.title}</span>
      <span class="block text-xs text-gray-500">By {progress.book.authors[0].name}</span>
    </div>
    <button on:click={cancel} type="button" title="Cancel" class="absolute right-0 top-0 px-1 py-1 transition-colors duration-100 rounded-lg text-black hover:text-white hover:bg-red-700" >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
      </svg>
    </button>
  </div>
  <div class="mx-1">
    <div class="flex justify-between mb-1">
      <span class="text-xs font-medium text-blue-700 dark:text-white truncate max-w-[7rem]">Downloading</span>
      <span class="text-xs font-medium text-blue-700 dark:text-white">{Math.floor(barProgress*100)}%</span>
    </div>
    <div class="px-2">
      <div class="relative w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
        <!-- Left Marker -->
        <div class="absolute z-10 {waitingForDownload ? 'bg-gray-200 text-white' : 'bg-blue-600 text-white'} border-2 border-white h-5 w-5 rounded-full top-1/2 left-0 -translate-x-[0.625rem] -translate-y-[0.625rem]">
          <div class="absolute w-3 h-3 top-1/2 left-1/2 -translate-x-[0.375rem] -translate-y-[0.375rem]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3 {waitingForDownload ? 'animate-spin' : ''}">
              {#if waitingForDownload}
                <path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clip-rule="evenodd" />
              {:else}
                <path fill-rule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clip-rule="evenodd" />
              {/if}
            </svg>
          </div>
        </div>
        <!-- Center Marker -->
        <div class="absolute z-10 {waitingForProcess || !downloaded ? 'bg-gray-200 text-white' : 'bg-blue-600 text-white'} border-2 border-white h-5 w-5 rounded-full top-1/2 left-1/2 -translate-x-[0.625rem] -translate-y-[0.625rem]">
          <div class="absolute w-3 h-3 top-1/2 left-1/2 -translate-x-[0.375rem] -translate-y-[0.375rem]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3 {waitingForProcess ? 'animate-spin' : 'rotate-45'}">
              {#if waitingForProcess}
                <path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clip-rule="evenodd" />
              {:else}
                <path fill-rule="evenodd" d="M2.24 6.8a.75.75 0 001.06-.04l1.95-2.1v8.59a.75.75 0 001.5 0V4.66l1.95 2.1a.75.75 0 101.1-1.02l-3.25-3.5a.75.75 0 00-1.1 0L2.2 5.74a.75.75 0 00.04 1.06zm8 6.4a.75.75 0 00-.04 1.06l3.25 3.5a.75.75 0 001.1 0l3.25-3.5a.75.75 0 10-1.1-1.02l-1.95 2.1V6.75a.75.75 0 00-1.5 0v8.59l-1.95-2.1a.75.75 0 00-1.06-.04z" clip-rule="evenodd" />
              {/if}
            </svg>
          </div>
        </div>

        <!-- Right Marker -->
        <div class="absolute z-10 {downloaded && processed ? 'bg-blue-600 text-white' : 'bg-gray-200 text-white'} border-2 border-white h-5 w-5 rounded-full top-1/2 right-0 translate-x-[0.625rem] -translate-y-[0.625rem]">
          <div class="absolute w-3 h-3 top-1/2 left-1/2 -translate-x-[0.375rem] -translate-y-[0.375rem]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3">
              <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
            </svg>
          </div>
        </div>

        <!-- <div class="absolute bg-gray-300 h-2.5 w-2.5 rounded-full top-0" style="right: 0%"></div> -->
        <!-- Progress Bar -->
        <div class="absolute bg-blue-600 h-2.5 rounded-full transition-width duration-500 ease-linear" style="width: {Math.floor(barProgress*100)}%"></div>
        <!-- <div class="absolute bg-blue-700 h-2.5 w-2.5 rounded-full top-0 -translate-x-[0.3125rem]" style="left: 0%"></div> -->
      </div>
    </div>
  </div>
</div>