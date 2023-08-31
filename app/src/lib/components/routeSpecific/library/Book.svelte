<script lang="ts">
	import icons from '$lib/components/icons';
  import * as helpers from '$lib/helpers';
  import type { Prisma } from "@prisma/client";

  type Book = Prisma.BookGetPayload<{
    include: {
      authors: true,
      genres: true,
      series: true,
      narrators: true,
      cover: true,
      profiles: {
        select: {
          first_name: true,
          last_name: true,
          profile_image_url: true,
          id: true
        }
      }
    }
  }>;

  export let subTitle: 'runtime' | 'series' = 'runtime';

  export let groupBy: 'series' | 'author';
  export let tableXPadding = 'px-4';
  export let tableXPaddingLeft = 'pl-4 pr-4';
  // export let maxWidth = 'max-w-[250px]';

  let maxWidthTitle = {
    total: 'max-w-[14rem]',
    text: 'max-w-[10.75rem]'
  }

  export let book: Book;

  export let truncateNum = 25;

</script>


<tr>
  <td class="{tableXPaddingLeft} {maxWidthTitle.total} py-2 text-sm font-medium whitespace-nowrap inline-flex space-x-3">
    <a href="/library/books/{book.asin}">
      <img src="{book.cover?.url_100}" class="h-10 rounded-sm" alt="Book cover for {book.title}" />
    </a>
    <div class="{maxWidthTitle.text} truncate">
      <a href="/library/books/{book.asin}">
        <h2 title="{book.title}" class="font-medium text-gray-800 text-ellipsis overflow-hidden dark:text-white">{helpers.truncateString(book.title, truncateNum)}</h2>
      </a>
      {#if subTitle === 'runtime'}
        {#if book.runtime_length_min !== null}
          <p title="Playback time of {new helpers.RunTime({min: book.runtime_length_min}).toDirectFormat()}" class="text-sm font-normal text-gray-600 text-ellipsis overflow-hidden dark:text-gray-400">
            {(new helpers.RunTime({min: book.runtime_length_min})).toFormat()}
          </p>
        {/if}
      {:else if subTitle === 'series'}
        {#if book.series !== null}
          <p class="text-sm font-normal text-ellipsis overflow-hidden text-gray-600 dark:text-gray-400">
            {helpers.truncateString(book.series.title, truncateNum - 5)}
          </p>
        {/if}
      {/if}
    </div>
  </td>
  <td class="{tableXPadding} py-2 w-min text-sm whitespace-nowrap text-center hidden md:table-cell">
    {#if book.series_sequence !== null}
      {book.series_sequence}
    {:else}
      -
    {/if}
  </td>
  <td title="{book.genres.map(g => g.tag).join(', ')}" class="max-w-[150px] hidden lg:table-cell max-h-3 {tableXPadding} py-2 text-sm font-medium whitespace-nowrap table-cell truncate space-x-1">
    {#each book.genres as genre}
      <span class="inline-flex px-1.5 py-0.5 items-center text-xs font-normal rounded-full text-emerald-500 gap-x-2 bg-emerald-100/60 dark:bg-gray-800">{genre.tag}</span>
    {/each}
  </td>
  <td class="{tableXPadding} py-2 text-sm whitespace-nowrap">
    <div class="max-w-[150px]">
      {#if book.subtitle === null && book.description === null}
        <h4 title="By {book.authors[0]?.name ?? 'unknown'}" class="text-gray-700 dark:text-gray-200 overflow-hidden truncate">By {book.authors[0]?.name ?? 'unknown'}</h4>
        <p title="Narrated by {book.narrators[0]?.name ?? 'unknown'}" class="text-gray-500 dark:text-gray-400 overflow-hidden truncate">
          Narrated by {book.narrators[0]?.name ?? 'unknown'}
        </p>
      {:else if book.subtitle === null && book.description !== null}
        <h4 title="By {book.authors[0]?.name ?? 'unknown'}" class="text-gray-700 dark:text-gray-200 overflow-hidden truncate">By {book.authors[0]?.name ?? 'unknown'}</h4>
        <p title="{book.description}" class="text-gray-500 dark:text-gray-400 overflow-hidden truncate">
          {book.description}
        </p>
      {:else if book.subtitle !== null && book.description === null}
        <h4 title="{book.subtitle}" class="text-gray-700 dark:text-gray-200 overflow-hidden truncate">{book.subtitle}</h4>
        <p title="{book.authors[0]?.name ?? 'unknown'}" class="text-gray-500 dark:text-gray-400 overflow-hidden truncate">
          {book.authors[0]?.name ?? 'unknown'}
        </p>
      {:else}
        <h4 title="{book.subtitle}" class="text-gray-700 dark:text-gray-200 overflow-hidden truncate">{book.subtitle}</h4>
        <p title="{book.description}" class="text-gray-500 dark:text-gray-400 overflow-hidden truncate">
          {book.description}
        </p>
      {/if}
    </div>
  </td>
  <td class="{tableXPadding} py-2 text-sm whitespace-nowrap text-center">
    {#if book.downloaded}
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
        {@html icons.ok}
      </svg>
    {:else}
      <button type="button" on:click={() => {console.log(fetch(`/api/library/download/book/${book.asin}`))}}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
          {@html icons.download}
        </svg>
      </button>
    {/if}
  </td>
  <td class="{tableXPadding} py-2 text-sm whitespace-nowrap text-center">
    <div class="flex items-center justify-center">
      {#each book.profiles as profile}
        <a href="/accounts/{profile.id}" class="object-cover w-6 h-6 -mx-1 border-2 border-white rounded-full overflow-hidden dark:border-gray-700 shrink-0"><img src="{profile.profile_image_url}/128" alt="" /></a>
      {/each}
      <!-- <img class="object-cover w-6 h-6 -mx-1 border-2 border-white rounded-full dark:border-gray-700 shrink-0" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=256&q=80" alt="" />
      <img class="object-cover w-6 h-6 -mx-1 border-2 border-white rounded-full dark:border-gray-700 shrink-0" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=256&q=80" alt="" />
      <img class="object-cover w-6 h-6 -mx-1 border-2 border-white rounded-full dark:border-gray-700 shrink-0" src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1256&q=80" alt="" />
      <img class="object-cover w-6 h-6 -mx-1 border-2 border-white rounded-full dark:border-gray-700 shrink-0" src="https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=256&q=80" alt="" />
      <p class="flex items-center justify-center w-6 h-6 -mx-1 text-xs text-blue-600 bg-blue-100 border-2 border-white rounded-full">
        +4
      </p> -->
    </div>
  </td>
  <td class="{tableXPadding} py-2 text-sm whitespace-nowrap">
    <button class="px-1 py-1 text-gray-500 transition-colors duration-200 rounded-lg dark:text-gray-300 hover:bg-gray-100" >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
      </svg>
    </button>
  </td>
</tr>