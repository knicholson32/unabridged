<script lang="ts">
	import { enhance } from '$app/forms';
	import { icons } from '$lib/components';
	import { Submit } from '$lib/components/buttons';
	import Rating from '$lib/components/decorations/Rating.svelte';
  import * as helpers from '$lib/helpers';
	import type { GenerateAlert, PageNeedsProgress } from '$lib/types';
	import { getContext } from 'svelte';
  import * as dateFns from 'date-fns'
	import TextArea from '$lib/components/input/selectable/TextArea.svelte';
	import { invalidateAll } from '$app/navigation';
	import TextInput from '$lib/components/input/selectable/TextInput.svelte';
	import LoadingCircle from '$lib/components/decorations/LoadingCircle.svelte';
  import * as alerts from '$lib/components/alerts';
	import LoadingCircleProgress from '$lib/components/decorations/LoadingCircleProgress.svelte';

  export let data: import('./$types').PageData;
  export let form: import('./$types').ActionData;

  let showAlert = getContext<GenerateAlert>('showAlert');
    
  let updatesSubmitting: boolean = false;

  let voucherURL: string | undefined = undefined;

  $: {
    if (form !== undefined && form !== null) {
      if (form.success === true) {
        if (form.response === 'update') {
          discardChanges();
        } else if (form.response === 'download') {
          showAlert('Book downloaded');
        }
      } else {
        console.log('Form failure!');
        if (form.response === 'update') {
          showAlert('Book could not be updated', { theme: 'error'});
        } else if (form.response === 'download') {
          showAlert('Book could not be downloaded', { theme: 'error', subText: form.message});
        }
      }
    }
  }

  const rowClass = 'odd:bg-gray-100'
  const dataTitleClass = 'text-gray-800/70 align-baseline w-[1%] pr-5 pl-2 py-2 text-right';
  const dataValueClass = 'py-2 pr-2';

  const fileTitleClass = 'bg-white text-gray-800/70 align-baseline pr-5 pl-2 py-2 text-center';
  const fileDataClass = 'pr-5 pl-2 py-2'

  const coverHEX = data.book.cover?.hex_dom ?? '#FFFFFF';
  const coverBright = data.book.cover?.hex_dom_bright ?? true;
  const rating = data.book.rating as unknown as number;

  const bookRuntime = new helpers.RunTime({ min: data.book.runtime_length_min ?? 0 });
  const bookLength = bookRuntime.toFormat();
  const bookLengthTitle = bookRuntime.toDirectFormat();
  const purchaseDateObj = new Date(Number(data.book.purchase_date.valueOf()) * 1000);
  const purchaseDate = dateFns.formatDistanceToNow(purchaseDateObj, {addSuffix: true});
  const releaseDateObj = new Date(Number(data.book.release_date.valueOf()) * 1000);
  const releaseDate = dateFns.formatDistanceToNow(releaseDateObj, {addSuffix: true});

  let values = {
    subtitle: data.book.subtitle ?? '',
    description: data.book.description ?? '',
    isbn: data.book.isbn ?? '',
  }

  $: {
    data.book;
    if (data.book.downloaded === true) {
    for (const f of data.book.media) {
      if (f.extension === 'voucher') {
        voucherURL = '/api/file/' + f.id;
        break;
      }
    }
  }
    discardChanges();
  }

  let edited = {
    subtitle: false,
    description: false,
    isbn: false,
  }
  const update = (e: CustomEvent, t: 'subtitle' | 'description' | 'isbn') => {
    const newValue = e.detail as string;
    let ogValue = '';
    switch(t) {
      case 'subtitle':
        ogValue = data.book.subtitle ?? '';
        values.subtitle = newValue;
        break;
      case 'description':
        ogValue = data.book.description ?? '';
        values.description = newValue;
        break;
      case 'isbn':
        ogValue = data.book.isbn ?? '';
        values.isbn = newValue;
        break;
    }

    if (ogValue !== newValue) edited[t] = true;
    else edited[t] = false;

    // Force an update for reactive components
    edited = edited;
    values = values;
  }

  $: hasEdits = edited.subtitle || edited.description || edited.isbn;

  const discardChanges = () => {
    values.subtitle = data.book.subtitle ?? '';
    edited.subtitle = false;
    values.description = data.book.description ?? '';
    edited.description = false;
    values.isbn = data.book.isbn ?? '';
    edited.isbn = false;

    // Force an update for reactive components
    edited = edited;
    values = values;
  }



</script>

<nav class="flex border-b border-gray-200 bg-white" aria-label="Breadcrumb">
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
        <a href="/library/books" class="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700">Books</a>
      </div>
    </li>
    <li class="flex">
      <div class="flex items-center">
        <svg class="h-full w-6 flex-shrink-0 text-gray-200" viewBox="0 0 24 44" preserveAspectRatio="none" fill="currentColor" aria-hidden="true">
          <path d="M.293 0l22 22-22 22h1.414l22-22-22-22H.293z" />
        </svg>
        <a href="/library/books/{data.book.asin}" class="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700" aria-current="page">
          {data.book.title}
        </a>
      </div>
    </li>
  </ol>
</nav>

<div class="relative w-full p-6 {coverBright ? 'text-gray-800' : 'text-white'} flex flex-col align-middle items-center sm:flex-row gap-6 shadow-black/10" style="background-color: {coverHEX};">
  <div class="absolute top-6 right-6 flex flex-col gap-1">
    <a href="https://www.audible.com/pd/{data.book.asin}" target="_blank" class="group">
      <span class="inline-flex h-8 w-8 align-bottom rounded-full bg-[#FF9800]">
        <svg class="h-5 w-5 ml-1.5 mt-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" id="audible">
          <path fill="#FFFFFF" d="m24 9.874-12 7.584-12-7.58v2.046L12 19.5l12-7.58z"></path>
          <path fill="#FFFFFF" d="m16.706 12.602 1.766-1.114c-1.395-2.115-3.776-3.51-6.476-3.51S6.915 9.369 5.524 11.48h.011c.094-.087.191-.171.289-.254 3.364-2.819 8.227-2.201 10.882 1.376z"></path>
          <path fill="#FFFFFF" d="M8.453 13.316a3.693 3.693 0 0 1 2.153-.709c1.29 0 2.445.697 3.24 1.804l1.702-1.076a4.318 4.318 0 0 0-3.555-1.876 4.318 4.318 0 0 0-3.54 1.857zm11.114-2.521 1.83-1.152C19.391 6.546 15.93 4.5 11.996 4.5c-3.882 0-7.373 2.028-9.394 5.139.371-.398.851-.891 1.282-1.235 4.942-3.953 11.933-2.895 15.656 2.354l.027.037z"></path>
        </svg>
      </span>
    </a>
    {#if voucherURL !== undefined}
      <a href="{voucherURL}" title="Download voucher" class="group">
        <span class="relative inline-flex h-8 w-8 align-bottom rounded-full {data.book.cover?.hex_dom_bright ? 'text-gray-800': 'text-white'} group-hover:text-[#FF9800]">
          <!-- <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 12L11 14L15 10M12 3L13.9101 4.87147L16.5 4.20577L17.2184 6.78155L19.7942 7.5L19.1285 10.0899L21 12L19.1285 13.9101L19.7942 16.5L17.2184 17.2184L16.5 19.7942L13.9101 19.1285L12 21L10.0899 19.1285L7.5 19.7942L6.78155 17.2184L4.20577 16.5L4.87147 13.9101L3 12L4.87147 10.0899L4.20577 7.5L6.78155 6.78155L7.5 4.20577L10.0899 4.87147L12 3Z" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
          </svg> -->
          <svg viewBox="0 0 800 800" class="absolute h-10 w-10 -left-1" fill="currentColor" stroke="{data.book.cover?.hex_dom}" xmlns="http://www.w3.org/2000/svg">
            <polygon points="410,100 473.7,162.4 560,140.2 583.9,226.1 669.8,250 647.6,336.3 710,400 647.6,463.7 669.8,550 583.9,573.9 
            560,659.8 473.7,637.6 410,700 346.3,637.6 260,659.8 236.1,573.9 150.2,550 172.4,463.7 110,400 172.4,336.3 150.2,250 
            236.1,226.1 260,140.2 346.3,162.4 "/>
            <path class="st0" stroke-width="70" stroke-linecap="round" d="M310,400l66.7,66.7L510,333.3"/>
          </svg>
        </span>
      </a>
    {/if}
  </div>
  <div class="h-72 shrink-0">
    <img src="{data.book.cover?.url_500}" class="h-full rounded-lg drop-shadow-xl-centered" alt=""/>
  </div>
  <div class="flex flex-col">
    <div>
      <h1 class="font-medium text-2xl uppercase tracking-widest font-serif">
        {data.book.title}
      </h1>
    </div>
    <div class="text-xs opacity-80">By {data.book.authors.map((a) => a.name).join(', ')} | Narrated By {data.book.narrators.map((a) => a.name).join(', ')}</div>
    <div class="text-xs opacity-80 mt-1">
      {new helpers.RunTime({min: data.book.runtime_length_min ?? 0}).toFormat()} long
    </div>
    <div>
      <Rating fillColor={(coverBright ? '#000000' : '#ffffff')} ratingNumberColor={(coverBright ? 'text-gray-800' : 'text-white')} rating={rating} numReviews={data.book.num_ratings} />
    </div>
    {#if data.book.series !== null}
      {#if data.book.series_sequence !== null}
        <div class="text-xs opacity-80 mt-1">Book {data.book.series_sequence} of the <a href="/library/series/{data.book.series.id}" class="uppercase">{data.book.series.title}</a> series</div>
      {:else}
        <div class="text-xs opacity-80 mt-1">A part of the <a href="/library/series/{data.book.series.id}" class="uppercase">{data.book.series.title}</a> series</div>
      {/if}
    {/if}
    <div>
      
    </div>
  </div>
</div>


<div class="bg-white flex flex-col gap-4 py-4">
  <div class="mx-6 text-xl font-medium">Book Details</div>
  <div class="border mx-3 rounded-lg">
    <div class="rounded-lg overflow-hidden">
      <table class="text-sm divide-y divide-gray-300">
        <tr class="{rowClass}">
          <td class="{dataTitleClass} whitespace-nowrap">Title</td>
          <td class="{dataValueClass}">
            {data.book.title}
          </td>
        </tr>
        <tr class="{rowClass}">
          <td class="{dataTitleClass} whitespace-nowrap">Subtitle{edited.subtitle ? '*' : ''}</td>
          <td class="{dataValueClass}">
            <TextInput value={values.subtitle} noDataText={"No Subtitle"} on:submit={(e) => update(e, 'subtitle')}/>
          </td>
        </tr>
        <tr class="{rowClass}">
          <td class="{dataTitleClass} whitespace-nowrap">Description{edited.description ? '*' : ''}</td>
          <td class="{dataValueClass}">
            <TextArea value={values.description} noDataText={"No Description"} on:submit={(e) => update(e, 'description')} />
          </td>
        </tr>
        <tr class="{rowClass}">
          <td class="{dataTitleClass} whitespace-nowrap">Series</td>
          {#if data.book.series === null}
            <td class="{dataValueClass}">
              <span class="text-xs opacity-30">No Series</span>
            </td>
          {:else}
            <td class="{dataValueClass}">
              <a href="/library/series/{data.book.series.id}" class="group">
                {data.book.series.title}
                <span class="inline-flex align-bottom rounded-full transition-transform group-hover:-rotate-45">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-[1.25rem] h-[1.25rem]">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM6.75 9.25a.75.75 0 000 1.5h4.59l-2.1 1.95a.75.75 0 001.02 1.1l3.5-3.25a.75.75 0 000-1.1l-3.5-3.25a.75.75 0 10-1.02 1.1l2.1 1.95H6.75z" clip-rule="evenodd" />
                  </svg>
                </span>
              </a>
            </td>
          {/if}
        </tr>
        {#if data.book.series !== null}
          <tr>
            <td class="{dataTitleClass} whitespace-nowrap">Series Sequence</td>
            {#if data.book.series_sequence === null}
              <td class="{dataValueClass}">-</td>
            {:else}
              <td class="{dataValueClass}">Book {data.book.series_sequence}</td>
            {/if}
          </tr>
        {/if}
        <tr class="{rowClass}">
          {#if data.book.authors.length === 1}
            <td class="{dataTitleClass} whitespace-nowrap">Author</td>
          {:else}
            <td class="{dataTitleClass} whitespace-nowrap">Authors</td>
          {/if}
          <td class="{dataValueClass} flex space-x-1">
            {#each data.book.authors as author}
              <span class="py-0.5 px-1.5 text-xs rounded-lg {coverBright ? '' : 'text-white'}" style="background-color: {coverHEX};">{author.name}</span>
            {/each}
          </td>
        </tr>
        <tr class="{rowClass}">
          {#if data.book.authors.length === 1}
            <td class="{dataTitleClass} whitespace-nowrap">Narrator</td>
          {:else}
            <td class="{dataTitleClass} whitespace-nowrap">Narrators</td>
          {/if}
          <td class="{dataValueClass} flex space-x-1">
            {#each data.book.narrators as narrator}
              <span class="py-0.5 px-1.5 text-xs rounded-lg {coverBright ? '' : 'text-white'}" style="background-color: {coverHEX};">{narrator.name}</span>
            {/each}
          </td>
        </tr>
        <tr class="{rowClass}">
          <td class="{dataTitleClass} whitespace-nowrap">Book Type</td>
          <td class="{dataValueClass}">
            <a href="https://www.audible.com/pd/{data.book.asin}" target="_blank" class="group">
              <span class="inline-flex h-[1.25rem] px-[0.25rem] pt-[0.125rem] w-[1.25rem] align-bottom rounded-full bg-[#FF9800]">
                <svg class="h-[1rem] w-[1rem]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" id="audible">
                  <path fill="#FFFFFF" d="m24 9.874-12 7.584-12-7.58v2.046L12 19.5l12-7.58z"></path>
                  <path fill="#FFFFFF" d="m16.706 12.602 1.766-1.114c-1.395-2.115-3.776-3.51-6.476-3.51S6.915 9.369 5.524 11.48h.011c.094-.087.191-.171.289-.254 3.364-2.819 8.227-2.201 10.882 1.376z"></path>
                  <path fill="#FFFFFF" d="M8.453 13.316a3.693 3.693 0 0 1 2.153-.709c1.29 0 2.445.697 3.24 1.804l1.702-1.076a4.318 4.318 0 0 0-3.555-1.876 4.318 4.318 0 0 0-3.54 1.857zm11.114-2.521 1.83-1.152C19.391 6.546 15.93 4.5 11.996 4.5c-3.882 0-7.373 2.028-9.394 5.139.371-.398.851-.891 1.282-1.235 4.942-3.953 11.933-2.895 15.656 2.354l.027.037z"></path>
                </svg>
              </span>
              Audible
              <span class="inline-flex align-bottom rounded-full transition-transform group-hover:-rotate-45">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-[1.25rem] h-[1.25rem]">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM6.75 9.25a.75.75 0 000 1.5h4.59l-2.1 1.95a.75.75 0 001.02 1.1l3.5-3.25a.75.75 0 000-1.1l-3.5-3.25a.75.75 0 10-1.02 1.1l2.1 1.95H6.75z" clip-rule="evenodd" />
                </svg>
              </span>
            </a>
          </td>
        </tr>
        <tr class="{rowClass}">
          {#if data.book.profiles.length === 1}
            <td class="{dataTitleClass} whitespace-nowrap">Source</td>
          {:else}
            <td class="{dataTitleClass} whitespace-nowrap">Sources</td>
          {/if}
          <td class="{dataValueClass} flex space-x-1">
            {#each data.book.profiles as profile}
              <a class="mr-1" href="/accounts/{profile.id}">
                <img src="{profile.profile_image_url}" class="inline-flex align-bottom h-[1.25rem] rounded-full" alt="Profile picture for {profile.first_name} {profile.last_name}"/>
                {profile.first_name} {profile.last_name}
              </a>
            {/each}
          </td>
        </tr>
        <tr class="{rowClass}">
          <td class="{dataTitleClass} whitespace-nowrap">Length</td>
          <td class="{dataValueClass}" title="{bookLengthTitle}">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="inline-flex w-3 h-3">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {bookLength}
          </td>
        </tr>
        <tr class="{rowClass}">
          <td class="{dataTitleClass} whitespace-nowrap">Rating</td>
          <td class="{dataValueClass}">
            <Rating class="align-middle mb-[0.125rem]" rating={rating} /> from {data.book.num_ratings.toLocaleString()} reviews
          </td>
        </tr>
        <tr class="{rowClass}">
          <td class="{dataTitleClass} whitespace-nowrap">Release Date</td>
          <td class="{dataValueClass}" title="{releaseDateObj.toLocaleDateString()}">{releaseDate}</td>
        </tr>
        <tr class="{rowClass}">
          <td class="{dataTitleClass} whitespace-nowrap">Purchase Date</td>
          <td class="{dataValueClass}" title="{purchaseDateObj.toLocaleDateString()}">{purchaseDate}</td>
        </tr>
        <tr class="{rowClass}">
          <td class="{dataTitleClass} whitespace-nowrap">Chapters</td>
          <td class="{dataValueClass}">{data.book.downloaded ? data.book.chapters.length : 'Unknown'}</td>
        </tr>
        <tr class="{rowClass}">
          <td class="{dataTitleClass} whitespace-nowrap">Downloaded</td>
          <td class="{dataValueClass}">{data.book.downloaded ? 'Yes' : 'No'}</td>
        </tr>
        <tr class="{rowClass}">
          <td class="{dataTitleClass} whitespace-nowrap">Processed</td>
          <td class="{dataValueClass}">{data.book.processed ? 'Yes' : 'No'}</td>
        </tr>
        <tr class="{rowClass}">
          <td class="{dataTitleClass} whitespace-nowrap">ISBN{edited.isbn ? '*' : ''}</td>
          <td class="{dataValueClass}">
            <div class="inline-flex">
              <TextInput value={values.isbn} noDataText={"No ISBN"} on:submit={(e) => update(e, 'isbn')}/>
            </div>
            {#if data.book.isbn !== null}
              <a href="https://openlibrary.org/isbn/{data.book.isbn}" target="_blank" class="group">
              <span class="inline-flex align-bottom rounded-full transition-transform group-hover:-rotate-45">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-[1.25rem] h-[1.25rem]">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM6.75 9.25a.75.75 0 000 1.5h4.59l-2.1 1.95a.75.75 0 001.02 1.1l3.5-3.25a.75.75 0 000-1.1l-3.5-3.25a.75.75 0 10-1.02 1.1l2.1 1.95H6.75z" clip-rule="evenodd" />
                </svg>
              </span>
              </a>
            {/if}
          </td>
        </tr>
      </table>
    </div>
  </div>
</div>

{#if data.book.downloaded === true}
  <div class="bg-white flex flex-col gap-4 py-4">
    <div class="mx-6 text-xl font-medium">Files / Attachments</div>
    <div class="border mx-3 rounded-lg">
      <div class="rounded-lg overflow-hidden">
        <table class="text-sm">
          <thead>
            <tr class="{rowClass} border-b border-gray-300 bg-white">
              <th class="{fileTitleClass} w-[1%]">Icon</th>
              <th class="{fileTitleClass} !text-left">Name</th>
              <th class="{fileTitleClass} hidden md:table-cell !text-left">Description</th>
              <th class="{fileTitleClass} hidden md:table-cell">Size</th>
              <th class="{fileTitleClass}">Download</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-300">
            {#each data.book.media as file}
              <tr class="{rowClass}">
                <td class="{fileDataClass} w-[1%] whitespace-nowrap">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                    {@html helpers.extensionLogo(file.extension)}
                  </svg>
                </td>
                <td class="{fileDataClass} italic font-mono text-xs">{file.title}.{file.extension}</td>
                <td class="{fileDataClass} hidden md:table-cell text-left">{file.description}</td>
                <td class="{fileDataClass} hidden md:table-cell text-center">{helpers.numBytesToString(file.size_b)}</td>
                <td class="{fileDataClass} w-[1%] text-center">
                  <a data-sveltekit-reload href="/api/file/{file.id}?attachment">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 m-auto">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15M9 12l3 3m0 0l3-3m-3 3V2.25" />
                    </svg>
                  </a>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </div>
{/if}

<div class="flex items-center justify-end gap-x-6 border-t bg-white border-gray-900/10 px-4 py-4 sm:px-8">
  <form method="POST" action="?/download" class="flex items-center justify-end gap-x-6" use:enhance>
    <LoadingCircleProgress id={data.book.asin} />
    <button class="text-sm font-semibold leading-6 text-gray-900">Download</button>
  </form>
  <button type="button" on:click={() => {console.log(fetch(`/api/library/cancel/book/${data.book.asin}`))}} class="text-sm font-semibold leading-6 text-gray-900">Cancel</button>
  {#if data.book.downloaded}
    <button type="button" on:click={() => {console.log(fetch(`/api/library/remove/book/${data.book.asin}`))}} class="text-sm font-semibold leading-6 text-gray-900">Remove</button>
  {/if}
  <form method="POST" action="?/update" class="flex items-center justify-end gap-x-6" use:enhance={() => {
    updatesSubmitting = true;
    return async ({ update }) => {
      updatesSubmitting = false;
      await alerts.updateNotifications();
      update();
    };
  }}>
    <!-- <div class="px-4 py-6 sm:p-8">
      <div class="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">

        <div class="col-span-full">
          <label for="description" class="block text-sm font-medium leading-6 text-gray-900">Description</label>
          <div class="mt-2">
            <textarea id="description" name="description" rows="5" value="{data.book.description}" class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"></textarea>
          </div>
          <p class="mt-3 text-sm leading-6 text-gray-600">Edit this description if corrections are required</p>
        </div>

        <div class="col-span-full">
          <label for="description" class="block text-sm font-medium leading-6 text-gray-900">Description</label>
          <div class="mt-2">
            <textarea id="description" name="description" rows="5" value="{data.book.description}" class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"></textarea>
          </div>
          <p class="mt-3 text-sm leading-6 text-gray-600">Edit this description if corrections are required</p>
        </div>

      </div>
    </div> -->
    <input type="hidden" name="subtitle" value="{values.subtitle}"/>
    <input type="hidden" name="description" value="{values.description}"/>
    <input type="hidden" name="isbn" value="{values.isbn}"/>
    <button type="button" on:click={discardChanges} class="text-sm font-semibold leading-6 text-gray-900">Discard Changes</button>
    <!-- <button type="submit" class="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Save</button> -->
    <Submit submitting={updatesSubmitting} disabled={!hasEdits} actionText={"Update"} actionTextInProgress={"Updating"}/>
  </form>
</div>
