<script lang="ts">
	import { enhance } from '$app/forms';
	import { intlFormatDistance } from 'date-fns';
	import * as events from '$lib/events';
	import type { ActionData } from './$types.js';
	import { type GenerateAlert, Event, SourceType } from '$lib/types';
	import { getContext, onMount } from 'svelte';
	import { LoadingCircle } from '$lib/components/decorations';
	import AudibleLoginDialog from '$lib/components/routeSpecific/sources/AudibleLoginDialog.svelte';
	import accordion from '$lib/components/events/accordion.js';
	export let data: import('./$types').PageData;
	export let form: ActionData;

	let showAlert = getContext<GenerateAlert>('showAlert');

	const monthNames = [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December'
	];

	const dateFormatter = (
		ts: number | null,
		includeTime = true,
		invalidString = 'Never'
	): string => {
		if (ts === null) return 'Never';
		const d = new Date(ts * 1000);
		if (includeTime)
			return `${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} at ${d
				.getHours()
				.toString()
				.padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
		else return `${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
	};

	let waitingForAdd = false;
	let addProfileDialogOpen = false;

	let cancelAdd: () => void;

	let progresses: { [key: string]: { spin: boolean; value: number } } = {};
	for (const s of data.sources) progresses[s.id] = { spin: false, value: 0 };

	$: {
		if (form !== undefined && form !== null) {
			progresses = {};
			for (const s of data.sources) progresses[s.id] = { spin: false, value: 0 };

			if (form.success === true) {
				if (form.response === 'add') {
					openAddProfileDialog();
				} else if (form.response === 'cancel') {
					closeAddProfileDialog();
				} else if (form.response === 'urlresponse') {
					closeAddProfileDialog();
				}
			} else {
				console.log('Form failure!');
				if (form?.response === 'add') {
					closeAddProfileDialog();
					showAlert('Profile add error', { subText: form?.message, theme: 'error' });
				} else if (form?.response === 'urlresponse' && form?.fatal === true) {
					console.log(form);
					closeAddProfileDialog();
					showAlert('Profile add error', { subText: form?.message, theme: 'error' });
				}
			}
		}
		// if (form?.success === true) {
		//   if (form.response === 'add') {
		//     addProfileDialogOpen = true;
		//   } else if (form.response === 'cancel') {
		//     closeAddProfileDialog();
		//   }
		// } else {
		//   if (form?.response !== 'urlresponse') {
		//     closeAddProfileDialog();
		//   }
		// }
	}
	const openAddProfileDialog = () => (addProfileDialogOpen = true);
	const closeAddProfileDialog = () => (addProfileDialogOpen = false);

	onMount(() => {
		return events.onProgress('basic.account.sync', null, (id, data) => {
			if (progresses[id] === undefined) progresses[id] = { spin: false, value: 0 };
			console.log(data);
			if (data.t === Event.Progress.Basic.Stage.START) {
				console.log('received start');
				progresses[id] = { spin: true, value: 0 };
			} else if (data.t === Event.Progress.Basic.Stage.IN_PROGRESS) {
				console.log('received in_progress');
				progresses[id] = { spin: false, value: data.p };
			} else if (data.t === Event.Progress.Basic.Stage.DONE) {
				progresses[id] = { spin: false, value: 0 };
			}
		});
	});
</script>

<div class="p-5 grow bg-gray-100 h-full w-full">
	<form
		method="POST"
		action="?/add"
		use:enhance={({ cancel }) => {
			cancelAdd = cancel;
			waitingForAdd = true;
			return async ({ update }) => {
				waitingForAdd = false;
				update();
			};
		}}
	>
		<button
			class="inline-flex px-3 !ml-0 justify-center rounded-md bg-indigo-600 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:ml-3 sm:w-auto"
			>Add Profile</button
		>
	</form>

	<br />

	<br />

	<!-- <dialog open={form?.success && form?.response === 'sync'}>
    {form?.stats?.numCreated} books created, {form?.stats?.numUpdated} books updated
  </dialog> -->

	<!-- <dialog open={form?.success && form?.response === 'add' && !closed}>
      <article>
        <header>
          <a href="#close" aria-label="Close" class="close" on:click={() => closed = true}>X</a>
          Success
        </header>
        <a href="{form?.url}" target="_blank">link</a>
        <form method="POST" action="?/urlresponse">
          <input name="url">
          <button>Enter</button>
        </form>
      </article>
  </dialog> -->

	<div class="divide-y flex flex-col gap-3 divide-gray-100 overflow-hidden">
		{#each { length: data.sources.length } as _, i}
			<div class="relative flex flex-col justify-between gap-x-6 bg-white rounded-md hover:bg-gray-50 w-full">
				<div class="flex flex-row gap-2 items-center px-4 py-5 w-full">
					<div class="flex items-center min-w-0 gap-4">
						<img
							class="h-12 w-12 flex-none rounded-full bg-gray-50"
							src={data.sources[i].profile_image_url}
							alt={data.sources[i].name}
						/>
						<div class="min-w-0 flex-auto">
							<p class="text-sm font-semibold leading-6 text-gray-900">
								<a href="/sources/{data.sources[i].id}" class="flex gap-4 items-center">
									<span class="absolute inset-x-0 -top-px bottom-0" />
									{data.sources[i].name}
									{#if data.sources[i].type === SourceType.AUDIBLE}
										<span class="h-5 inline-flex flex-shrink-0 items-center rounded-full bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
											Audible
										</span>
									{/if}
								</a>
							</p>
						</div>
						{#if data.sources[i].type === 'audible' && data.sources[i].authenticated !== null}
							{#await data.sources[i].authenticated}
								<LoadingCircle progress={0} spin={true} spinnerOnly={true} theme={{primary: 'white'}}/>
							{:then authenticated}
								{#if authenticated === false}
								<p class="text-sm font-semibold leading-6">
									<span class="h-5 inline-flex flex-shrink-0 items-center rounded-full bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
										Not Logged In
									</span>
								</p>
								{/if}
							{/await}
						{/if}
					</div>
					<div class="grow"></div>
					<div class="flex shrink-0 items-center gap-x-4">
						<!-- <div class="mt-1 flex items-center gap-x-1.5">
							<div class="flex-none rounded-full bg-emerald-500/20 p-1">
								<div class="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
							</div>
							<p class="text-xs leading-5 text-gray-500">Online</p>
						</div> -->
						<div class="hidden sm:flex sm:flex-col sm:items-end">
							<p class="text-sm leading-6 text-gray-900">
								{data.sources[i].num_downloaded} / {data.sources[i].num_books}<span
									class="text-xs leading-5 text-gray-500 pl-1">in library</span
								>
							</p>
							{#if data.sources[i].last_sync === null}
								<p class="mt-1 text-xs leading-5 text-gray-500">Never synced</p>
							{:else}
								<p class="mt-1 text-xs leading-5 text-gray-500">
									Synced <time
										datetime={new Date((data.sources[i].last_sync ?? 0) * 1000).toISOString()}
										>{intlFormatDistance(
											new Date((data.sources[i].last_sync ?? 0) * 1000),
											new Date()
										)}</time
									>
								</p>
							{/if}
						</div>

						<svg
							class="h-5 w-5 flex-none text-gray-400"
							viewBox="0 0 20 20"
							fill="currentColor"
							aria-hidden="true"
						>
							<path
								fill-rule="evenodd"
								d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>

{#if addProfileDialogOpen}
	<AudibleLoginDialog mode="add" {form} />
{/if}
