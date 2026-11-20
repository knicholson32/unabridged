<script lang="ts">
  import { fade, scale } from 'svelte/transition';
	import { cubicOut, cubicInOut, linear, cubicIn } from 'svelte/easing';
	import { EscapeOrClickOutside } from '../events';
	import AbsScanProgress from '$lib/components/routeSpecific/layout/AbsScanProgress.svelte';
  import StatusBar from '$lib/components/routeSpecific/layout/StatusBar.svelte';
  import StatusBarEmpty from '$lib/components/routeSpecific/layout/StatusBarEmpty.svelte';
  import QueuedBook from '$lib/components/routeSpecific/layout/QueuedBook.svelte';
  import * as helpers from '$lib/helpers';
  import FinishedBook from '$lib/components/routeSpecific/layout/FinishedBook.svelte';
	import { onMount, setContext } from 'svelte';
  import { API, Event, type ProcessQueueBOOK } from '$lib/types';
  import * as events from '$lib/events';


  // -----------------------------------------------------------------------------------------------
	// Download Manager
	// -----------------------------------------------------------------------------------------------

	// Opening & Closing -----------------------------------------------------------------------------
	export let downloadManagerVisible = false;
	export let showDownloadManagerButton: HTMLButtonElement;
	let downloadManagerRemovalFunctions: (() => void)[] = [];
	const showDownloadManager = async () => {
		// Only open the manager if it is closed currently
		if (downloadManagerVisible === true) return;

		// Check if we need to refresh data
		if (Date.now() - lastRefresh > 500) await refreshProcessData();

		// Clear any lingering functions from the last open
		for (const func of downloadManagerRemovalFunctions) func();
		downloadManagerRemovalFunctions = [];

		// processor.book -----------------------------------------------------------------
		downloadManagerRemovalFunctions.push(
			events.onProgress('processor.book', null, (id, data) => {
				// Check if that book exists. If not, we don't have the data to do anything about it.
				// The `process.book.queued` event must fire first.
				if (!(id in processBookMap)) return;
				// console.log('progress', data);

				// Assign the running and done flags
				processBookMap[id].in_progress = data.r;
				processBookMap[id].is_done = data.d;

				const book = processBookMap[id].book;

				// Update the book statistics after these changes
				updateBookStatistics();

				// Only continue if the book exists
				if (book === null) return;

				// Assign properties based on the type of progress update message
				if (data.t === Event.Progress.Processor.BOOK.Task.DOWNLOAD) {
					book.download_progress = data.p;
					book.process_progress = 0;
					book.speed = data.s ?? null;
					book.downloaded_mb = data.mb ?? null;
					book.total_mb = data.tb ?? null;
				} else if (data.t === Event.Progress.Processor.BOOK.Task.PROCESS) {
					book.download_progress = 1;
					book.process_progress = data.p;
					book.speed = data.s ?? null;
				}

				// Update the book statistics after these changes
				updateBookStatistics();
			})
		);

		// Interval -----------------------------------------------------------------------
		calculateTimeInterval = setInterval(displayElapsedTime, 1000);
		downloadManagerRemovalFunctions.push(() => clearInterval(calculateTimeInterval));

		// Open the manager
		downloadManagerVisible = true;
	};
	const closeDownloadManager = () => {
		// Close the manager
		downloadManagerVisible = false;
		// Clear any callbacks or interval functions
		for (const func of downloadManagerRemovalFunctions) func();
		downloadManagerRemovalFunctions = [];
		// Clear interval
		clearInterval(calculateTimeInterval);
	};
	export const toggleDownloadManager = () => {
		if (downloadManagerVisible) closeDownloadManager();
		else showDownloadManager();
	};

	// setContext('openManager', showDownloadManager);

	// Buttons ---------------------------------------------------------------------------------------
	let processPaused = false;
	const togglePause = async () => {
		const response = (await (await fetch('/api/process/paused/toggle')).json()) as API.Response;
		if (response.ok == true && response.type === 'boolean') processPaused = response.value;
	};

	const dismissAll = async () => await fetch('/api/process/dismiss/book');

	// Timing ----------------------------------------------------------------------------------------
	let timeElapsing = false;
	let startTime = -1;
	let staticTime = 0;
	let elapsedTime = '00:00:00';
	let absScanScheduledTime = -1;
	let calculateTimeInterval: number;
	const displayElapsedTime = () => {
		if (timeElapsing === true)
			elapsedTime = new helpers.RunTime({
				s: Math.floor(Date.now() / 1000) - startTime
			}).toDirectFormatFull();
		else elapsedTime = new helpers.RunTime({ s: staticTime }).toDirectFormatFull();
	};

	// Process Settings ------------------------------------------------------------------------------
	const updateProcessSettings = (data: API.Types.ProcessSettings) => {
		if (data['progress.endTime'] === -1) {
			if (data['progress.startTime'] === -1) {
				timeElapsing = false;
				staticTime = 0;
			} else {
				timeElapsing = true;
				staticTime = -1;
				startTime = data['progress.startTime'];
			}
		} else {
			timeElapsing = false;
			staticTime = data['progress.endTime'] - data['progress.startTime'];
		}
		processPaused = data['progress.paused'];
		displayElapsedTime();
	};

	// Process Data ----------------------------------------------------------------------------------

	// Create an object that will hold the client copy of the process system
	const processBookMap: { [key: string]: ProcessQueueBOOK } = {};

  // TODO: See if this functionality can be restored. Right now it is not pre-populated.
  export let booksInProcessRaw: API.Response = { ok: false, status: 400, message: 'Unset' };
  // const booksInProcessRaw = (await (await fetch('/api/process/get/book')).json()) as API.Response;
	const booksInProcess = booksInProcessRaw.ok === true && booksInProcessRaw.type === 'process.book' ? booksInProcessRaw.processes: [];
	const processSettings = booksInProcessRaw.ok === true && booksInProcessRaw.type === 'process.book' ? booksInProcessRaw.settings: null;

	// Populate the process book object with initial values from the API call
	for (const book of booksInProcess) processBookMap[book.id] = book;
	// if (processSettings !== null) updateProcessSettings(processSettings);

	let lastRefresh = Date.now();
	export const refreshProcessData = async () => {
		const booksInProcess = (await (await fetch('/api/process/get/book')).json()) as API.Response;
		if (booksInProcess.ok !== true || booksInProcess.type !== 'process.book') return;
		for (const key of Object.keys(processBookMap)) delete processBookMap[key];
		for (const book of booksInProcess.processes) processBookMap[book.id] = book;
		updateProcessSettings(booksInProcess.settings);
		updateBookStatistics();
		lastRefresh = Date.now();
	};

	const processorInvalidated = (isActive: boolean) => {
		downloadManagerBlue = isActive;
		if (downloadManagerVisible === true) refreshProcessData();
	};

	// Create some variables to hold common statistics that the front-end will use
	let booksAsArray: ProcessQueueBOOK[] = [];
	let booksDone = 0;
	let booksNotDone = 0;
	let booksInProgress = 0;
	let booksWaiting = 0;
	let totalBooks = 0;
	export let downloadManagerBlue = false;

	// When we get process updates this function can be ran to update the statistics
	const updateBookStatistics = () => {
		booksAsArray = Object.keys(processBookMap).map((key) => processBookMap[key]);
		booksDone = booksAsArray.filter((b) => b.is_done === true).length;
		booksNotDone = booksAsArray.filter((b) => b.is_done === false).length;
		booksInProgress = booksAsArray.filter((b) => b.in_progress === true).length;
		booksWaiting = booksAsArray.filter(
			(b) => b.in_progress === false && b.is_done === false
		).length;
		totalBooks = booksAsArray.length;

		downloadManagerBlue = booksNotDone > 0;
	};

	// Initialize the statistics based on the initial data from the API request
	// updateBookStatistics();

	// // On mount (initial load after DOM is available)
	// onMount(() => {
	// 	console.log('events mount');
	// 	events.onMount();

	// 	const removalFunctions: (() => void)[] = [];

	// 	// processor.settings -------------------------------------------------------------
	// 	removalFunctions.push(events.on('processor.settings', updateProcessSettings));

	// 	// processor.invalidate -----------------------------------------------------------
	// 	removalFunctions.push(events.on('processor.invalidate', processorInvalidated));

	// 	// abs.scan.scheduled -------------------------------------------------------------
	// 	removalFunctions.push(events.on('abs.scan.scheduled', (time) => (absScanScheduledTime = time)));

	// 	// Add the function to close the download manager because that will release
	// 	// all the callbacks associated with it
	// 	removalFunctions.push(closeDownloadManager);

	// 	return () => {
	// 		for (const remove of removalFunctions) remove();
	// 		clearInterval(calculateTimeInterval);
	// 	};
	// });


</script>

<!-- fixed origin-top-right top-16 right-2 left-2 z-10  -->
<div
  class="overflow-hidden overflow-y-scroll max-h-[calc(100vh-5rem) mt-2.5 sm:absolute sm:top-auto sm:overflow-y-visible sm:left-auto sm:right-0 sm:w-[30rem] rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
  in:scale={{ duration: 100, opacity: 0.95, start: 0.95, easing: cubicOut }}
  out:scale={{ duration: 75, opacity: 0.95, start: 0.95, easing: cubicOut }}
  use:EscapeOrClickOutside={{
    except: showDownloadManagerButton,
    callback: closeDownloadManager
  }}
  role="menu"
  aria-orientation="vertical"
  aria-labelledby="options-menu-button"
  tabindex="-1"
>
  <div
    in:fade={{ duration: 100, easing: cubicOut }}
    out:fade={{ duration: 75, easing: cubicOut }}
    class=" antialiase"
  >
    <div class="absolute right-2 top-2 flex gap-1">
      <AbsScanProgress scheduled={absScanScheduledTime} />
      <button on:click={togglePause} type="button" class="px-1 py-1 text-gray-500 transition-colors duration-200 rounded-lg dark:text-gray-300 hover:bg-gray-100" >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
          {#if processPaused}
            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
          {:else}
            <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z" />
          {/if}
        </svg>
      </button>
      <button on:click={closeDownloadManager} type="button" class="px-1 py-1 text-gray-500 transition-colors duration-200 rounded-lg dark:text-gray-300 hover:bg-gray-100">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5" >
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      </button>
    </div>

    <div class="pt-3 flex flex-col">
      <div class="px-3 flex flex-col gap-1 pb-1">
        <div class="font-bold text-lg">Download Manager</div>
        <div class="flex gap-2">
          <div class="font-mono grow text-center sm:text-left sm:pl-2">
            {booksWaiting}<span class="block sm:inline-block text-center sm:text-left sm:ml-1 text-xxs text-gray-600 font-sans" >Queued</span>
          </div>
          <div class="border-l grow-0" />
          <div class="font-mono grow text-center sm:text-left sm:pl-2">
            {booksInProgress}<span class="block sm:inline-block text-center sm:text-left sm:ml-1 text-xxs text-gray-600 font-sans" >In Progress</span>
          </div>
          <div class="border-l grow-0" />
          <div class="font-mono grow text-center sm:text-left sm:pl-2">
            {booksDone}<span class="block sm:inline-block text-center sm:text-left sm:ml-1 text-xxs text-gray-600 font-sans" >Finished</span>
          </div>
          <div class="border-l grow-0" />
          <div class="font-mono grow text-center sm:text-left sm:pl-2">
            {elapsedTime}<span class="block sm:inline-block text-center sm:text-left sm:ml-1 text-xxs text-gray-600 font-sans" >Elapsed</span>
          </div>
        </div>
        <div class="mx-2 mt-1">
          <div class="relative w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div
              class="absolute bg-blue-600 h-2.5 rounded-full transition-width duration-500"
              style="width: {(booksDone / totalBooks) * 100}%"
            />
          </div>
          <div class="flex justify-between mb-1">
            <span
              class="text-xs font-medium text-blue-700 dark:text-white truncate max-w-[7rem]"
              >{booksDone} <span class="text-xxs">of</span> {totalBooks}</span
            >
            <span class="text-xs font-medium text-blue-700 dark:text-white"
              >{helpers.round(
                (isNaN(booksDone / totalBooks) ? 0 : booksDone / totalBooks) * 100,
                0
              )}%</span
            >
          </div>
        </div>
      </div>

      <!-- TODO: Resolve this -->
      {#if booksAsArray.length > 0}
        {#if booksInProgress > 0}
          <div class="border-b my-1" />
          <div class="flex flex-col" role="none">
            {#each booksAsArray.filter((b) => b.in_progress === true) as p (p.id)}
              <StatusBar process={p} />
            {/each}
          </div>
        {:else}
          <div class="border-b my-1" />
          <div class="flex flex-col" role="none">
            <StatusBarEmpty />
          </div>
        {/if}
        {#if booksWaiting > 0}
          <div class="border-b-4 border-double my-1" />
          <div class="mx-3 flex flex-row gap-1 items-center">
            <div class="font-bold text-lg">Queue</div>
            <div class="font-mono grow pl-2 text-sm">
              {booksWaiting}<span class="ml-1 text-xs text-gray-600 font-sans">{helpers.basicPlural('Book', booksWaiting)} Waiting{processPaused ? ' - Paused' : ''}</span>
            </div>
          </div>
          <ul class="flex flex-col max-h-56 overflow-y-scroll overflow-hidden bg-white" role="none">
            {#each booksAsArray.filter((p) => p.in_progress === false && p.is_done === false) as p (p.id)}
              <li class="odd:bg-gray-100"><QueuedBook process={p} /></li>
            {/each}
          </ul>
        {/if}
        {#if booksDone > 0}
          <div class="border-b-4 border-double my-1" />
          <div class="relative py-1 pl-3 pr-2 flex flex-row gap-1 items-center">
            <div class="font-bold text-lg">Finished</div>
            <div class="font-mono pl-2 text-sm">{booksDone}<span class="ml-1 text-xs text-gray-600 font-sans">{helpers.basicPlural('Book', booksDone)} Done</span>
            </div>
            <div class="grow" />
            <button on:click={dismissAll} type="button" class="transition-colors duration-100 text-xxs rounded-md py-1 px-2 font-mono text-gray-600 border border-gray-400 hover:text-black hover:border-black">
              Dismiss All
            </button>
          </div>
          <ul class="flex flex-col max-h-56 overflow-y-scroll overflow-hidden bg-white" role="none">
            {#each booksAsArray.filter((p) => p.is_done === true) as p (p.id)}
              <li class="odd:bg-gray-100"><FinishedBook process={p} /></li>
            {/each}
          </ul>
        {/if}
      {/if}
    </div>
  </div>
</div>