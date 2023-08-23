<script lang="ts">
	import BookShowcase from '$lib/components/routeSpecific/series/BookShowcase.svelte';

  export let data: import('./$types').PageData;

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
        <a href="/library/series/{data.series.title}" class="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700" aria-current="page">
          {data.series.title}
        </a>
      </div>
    </li>
  </ol>
</nav>

<div class="">

  <div class="relative h-48">
    <div class="absolute left-0 right-0 top-0 h-48 overflow-hidden">
      <div class="absolute left-0 right-0 top-0 h-48 blur-2xl">
        <div class="absolute -left-24 -right-24 -top-24 h-96 brightness-100" style="background-color: {data.series.books[0].cover?.hex_dom};" />
      </div>
    </div>
  </div>

  <!-- <div class="w-full mb-48"></div> -->

  <!-- <div class="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span px-4 py-6 sm:p-8">
    <div class="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">

      <div class="sm:col-span-3">
        <label for="first-name" class="block text-sm font-medium leading-6 text-gray-900">First name</label>
        <div class="mt-2">
        </div>
      </div>

      <div class="sm:col-span-3">
        <label for="last-name" class="block text-sm font-medium leading-6 text-gray-900">Last name</label>
        <div class="mt-2">
        </div>
      </div>

      <div class="sm:col-span-4">
        <label for="email" class="block text-sm font-medium leading-6 text-gray-900">Email address</label>
        <div class="mt-2">
        </div>
      </div>

      <div class="sm:col-span-4">
        <label for="country" class="block text-sm font-medium leading-6 text-gray-900">Country</label>
        <div class="mt-2">
        </div>
      </div>

      <div class="col-span-full">
        <label for="about" class="block text-sm font-medium leading-6 text-gray-900">About</label>
        <div class="mt-2">
        </div>
        <p class="mt-3 text-sm leading-6 text-gray-600">Write some details about this account</p>
      </div>
      
    </div>
  </div>
  <div class="flex items-center justify-end gap-x-6 border-t border-gray-900/10 px-4 py-4 sm:px-8">
  </div> -->

  <div class="grid grid-cols-1 lg:grid-cols-1 xl:grid-cols-2 p-4 gap-4 sm:gap-12">
    {#each data.series.books as book}
      <BookShowcase book={book}/>
    {/each}
  </div>

</div>