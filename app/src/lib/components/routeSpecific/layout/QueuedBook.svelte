<script lang="ts">
	import type { ProcessQueueBOOK } from '$lib/types';
  export let process: ProcessQueueBOOK;
    

  const cancel = async () => {
    await fetch(`/api/process/dismiss/book/${process.id}`);
  }

</script>

<div class="relative mx-2 my-1 flex gap-1 items-center">
  <a href="/library/books/{process.book?.bookAsin}" class="overflow-hidden whitespace-nowrap inline-flex items-center gap-2">
    <div class="w-5 inline-flex"><img src="{process.book?.book.cover?.url_100}" class="rounded-md h-5 w-5" alt="{process.book?.book.title} Cover Image" /></div>
    <div class="truncate overflow-hidden max-w-[25rem] inline-flex items-baseline gap-1">
      <span class="font-serif font-bold truncate overflow-hidden" title="{process.book?.book.title}">{process.book?.book.title}</span>
      <span class="text-xs text-gray-500 truncate overflow-hidden">By {process.book?.book.authors[0].name}</span>
    </div>
  </a>
  <div class="grow"></div>
  <button on:click={cancel} type="button" class="transition-colors duration-100 p-1 rounded-lg text-black  hover:bg-gray-200" >
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
    </svg>
  </button>
</div>