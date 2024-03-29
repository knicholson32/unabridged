<script lang="ts">
	import { enhance } from '$app/forms';
	import { fade } from 'svelte/transition';
	import { cubicInOut } from 'svelte/easing';
	import { intlFormatDistance } from 'date-fns';
	import * as events from '$lib/events';
	import type { ActionData } from './$types.js';
	import { type GenerateAlert, Event, SourceType } from '$lib/types';
	import { getContext, onMount } from 'svelte';
	import { Submit } from '$lib/components/buttons';
	import { Bullet, LoadingCircle } from '$lib/components/decorations';
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
	let profileAddCanceling = false;
	let profileAdding = false;
	let linkClicked = false;
	let linkedPasted = false;
	let namedSource = false;
	let cancelProfileAddButton: Submit;
	let ownershipCheckbox: HTMLInputElement;
	let nosharingCheckbox: HTMLInputElement;
	let acknowledgedItems = false;
	const verifyCheckboxes = () => {
		acknowledgedItems = ownershipCheckbox.checked && nosharingCheckbox.checked;
	};

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
	const closeAddProfileDialog = () => {
		console.log('CLOSING!');
		addProfileDialogOpen = false;
		profileAddCanceling = false;
		linkClicked = false;
		linkedPasted = false;
		acknowledgedItems = false;
		resetFormStates();
	};

	const resetFormStates = () => {};

	const dialogFly = (node: HTMLElement) => {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		// Entering: "ease-out duration-300"
		//   From: "opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
		//   To: "opacity-100 translate-y-0 sm:scale-100"
		// Leaving: "ease-in duration-200"
		//   From: "opacity-100 translate-y-0 sm:scale-100"
		//   To: "opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
		return {
			delay: 0,
			duration: 300,
			easing: cubicInOut,
			css: (t: number) => `
          opacity: ${t * 100}%;
          transform: translateY(${(1 - t) * 5}%) scale(${0.95 + t * 0.05});
        `
		};
	};

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

	<ul
		role="list"
		class="divide-y divide-gray-100 overflow-hidden bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl"
	>
		{#each { length: data.sources.length } as _, i}
			<li class="relative flex justify-between gap-x-6 px-4 py-5 hover:bg-gray-50 sm:px-6">
				<div class="flex min-w-0 gap-x-4">
					<img
						class="h-12 w-12 flex-none rounded-full bg-gray-50"
						src={data.sources[i].profile_image_url}
						alt={data.sources[i].name}
					/>
					<div class="min-w-0 flex-auto">
						<p class="text-sm font-semibold leading-6 text-gray-900">
							<a href="/sources/{data.sources[i].id}">
								<span class="absolute inset-x-0 -top-px bottom-0" />
								{data.sources[i].name}
								{#if data.sources[i].type === SourceType.AUDIBLE}
									<span
										class="inline-flex flex-shrink-0 items-center rounded-full bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20"
										>Audible</span
									>
								{/if}
							</a>
						</p>
						<!-- <p class="mt-1 flex text-xs leading-5 text-gray-500">
              <a href="mailto:{data.sources[i].email}" class="relative truncate hover:underline">{data.sources[i].email}</a>
            </p> -->
					</div>
				</div>
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
			</li>
			<LoadingCircle
				progress={progresses[data.sources[i].id].value}
				spin={progresses[data.sources[i].id].spin}
			/>
		{/each}
	</ul>
</div>

{#if addProfileDialogOpen}
	<dialog
		class="relative z-30"
		aria-labelledby="modal-title"
		open={addProfileDialogOpen}
		aria-modal="true"
	>
		<!-- DONE
      Background backdrop, show/hide based on modal state.

      Entering: "ease-out duration-300"
        From: "opacity-0"
        To: "opacity-100"
      Leaving: "ease-in duration-200"
        From: "opacity-100"
        To: "opacity-0"
    -->
		<div
			transition:fade={{ duration: 300, easing: cubicInOut }}
			class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
		/>

		<div class="fixed inset-0 z-40 overflow-y-auto">
			<div class="flex min-h-full items-end justify-center p-0 text-center sm:items-center sm:p-0">
				<!-- DONE
          Modal panel, show/hide based on modal state.

          Entering: "ease-out duration-300"
            From: "opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            To: "opacity-100 translate-y-0 sm:scale-100"
          Leaving: "ease-in duration-200"
            From: "opacity-100 translate-y-0 sm:scale-100"
            To: "opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
        -->
				<div transition:dialogFly class="relative overflow-hidden bg-white shadow sm:rounded-lg">
					<button
						type="button"
						on:click={() => cancelProfileAddButton.click()}
						class="relative float-right top-3 right-3 h-5 w-5 group rounded-md text-black/30 hover:text-gray-500 focus:outline-none focus:ring-0"
					>
						<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
							<path
								d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
							/>
						</svg>
						<span class="sr-only">Close</span>
					</button>
					<form
						method="POST"
						action="?/urlresponse"
						use:enhance={() => {
							profileAdding = true;
							return async ({ update }) => {
								update();
								if (form !== undefined && form?.success === false) {
									resetFormStates();
								}
								profileAdding = false;
							};
						}}
					>
						<div class="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
							<div class="sm:flex sm:items-center">
								<div
									class="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#FF9800] border-2 border-[#FF9800] sm:mx-0 sm:h-10 sm:w-10"
								>
									<svg
										class="h-7 w-7 relative"
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										id="audible"
									>
										<path fill="#FFFFFF" d="m24 9.874-12 7.584-12-7.58v2.046L12 19.5l12-7.58z" />
										<path
											fill="#FFFFFF"
											d="m16.706 12.602 1.766-1.114c-1.395-2.115-3.776-3.51-6.476-3.51S6.915 9.369 5.524 11.48h.011c.094-.087.191-.171.289-.254 3.364-2.819 8.227-2.201 10.882 1.376z"
										/>
										<path
											fill="#FFFFFF"
											d="M8.453 13.316a3.693 3.693 0 0 1 2.153-.709c1.29 0 2.445.697 3.24 1.804l1.702-1.076a4.318 4.318 0 0 0-3.555-1.876 4.318 4.318 0 0 0-3.54 1.857zm11.114-2.521 1.83-1.152C19.391 6.546 15.93 4.5 11.996 4.5c-3.882 0-7.373 2.028-9.394 5.139.371-.398.851-.891 1.282-1.235 4.942-3.953 11.933-2.895 15.656 2.354l.027.037z"
										/>
									</svg>
								</div>
								<div class="mt-auto text-center sm:ml-4 sm:mt-0 sm:text-left select-none">
									<h3 class="text-lg font-semibold leading-6 text-gray-900" id="modal-title">
										Add an Audible account
									</h3>
								</div>
							</div>
							<div class="mt-5 text-center sm:text-left select-none">
								<fieldset>
									<legend class="text-base font-semibold leading-7 text-gray-900"
										>Instructions</legend
									>
									<p class="truncate text-sm text-gray-500">
										Please read and understand the following steps
									</p>
									<div class="space-y-5 mt-4">
										<div class="relative flex items-center">
											<Bullet value={1} done={linkClicked} />
											<div class="ml-3 text-sm leading-6 text-gray-500 text-justify sm:text-left">
												<span class="font-medium text-gray-900">Click the sign-in link</span> and
												sign in
												<p class="text-gray-400">
													The process will fail <span class="font-medium underline"
														>which is expected</span
													>
												</p>
											</div>
										</div>
									</div>
									<div class="mt-2 block">
										<input type="hidden" name="url" value={form?.url} />
										<a
											on:click={() => (linkClicked = true)}
											href={form?.url}
											target="_blank"
											class="inline-flex rounded-md bg-white w-full h-9 max-w-sm items-center px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
										>
											<p class="shrink-0">Sign In</p>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 20 20"
												fill="currentColor"
												class="shrink-0 ml-1 w-5 h-5"
											>
												<path
													d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z"
												/>
												<path
													d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z"
												/>
											</svg>
											<p class="truncate text-gray-300 ml-1">{form?.url}</p>
										</a>
									</div>
									<div class="space-y-5 mt-4 select-none">
										<div class="relative flex items-center">
											<Bullet value={2} done={linkedPasted} />
											<div class="ml-3 text-sm leading-6 text-gray-500 text-justify sm:text-left">
												<span class="font-medium text-gray-900">Copy the resulting URL</span> and
												paste it below
												<p class="text-gray-400">The page should show a 404 error</p>
											</div>
										</div>
									</div>
									<div class="text-center sm:text-left">
										<div class="relative mt-2 rounded-md shadow-sm">
											<div
												class="pointer-events-none absolute inset-y-0 left-0 max-w-sm flex items-center pl-3"
											>
												<svg
													class="h-5 w-5 text-gray-400"
													xmlns="http://www.w3.org/2000/svg"
													viewBox="0 0 20 20"
													fill="currentColor"
												>
													<path
														d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z"
													/>
													<path
														d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z"
													/>
												</svg>
											</div>
											<input
												required
												on:input={() => (linkedPasted = true)}
												type="url"
												name="urlresponse"
												id="urlresponse"
												class="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
												placeholder="https://www.amazon.com/ap/maplanding/..."
											/>
										</div>
									</div>
									<div class="space-y-5 mt-4 select-none">
										<div class="relative flex items-center">
											<Bullet value={3} done={namedSource} />
											<div class="ml-3 text-sm leading-6 text-gray-500 text-justify sm:text-left">
												<span class="font-medium text-gray-900">Name</span> this source
											</div>
										</div>
									</div>
									<div class="text-center sm:text-left">
										<div class="relative mt-2 rounded-md shadow-sm">
											<div
												class="pointer-events-none absolute inset-y-0 left-0 max-w-sm flex items-center pl-3"
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													fill="none"
													viewBox="0 0 24 24"
													stroke-width="1.5"
													stroke="currentColor"
													data-slot="icon"
													class="w-5 h-5"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
													/>
												</svg>
											</div>
											<input
												on:input={() => (namedSource = true)}
												type="name"
												name="name"
												id="name"
												class="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
												placeholder="My Audible Account"
											/>
										</div>
									</div>
									<div class="space-y-5 mt-4 select-none">
										<div class="relative flex items-center">
											<Bullet value={4} done={acknowledgedItems} />
											<div class="ml-3 text-sm leading-6 text-gray-500 text-justify sm:text-left">
												<span class="font-medium text-gray-900">Acknowledge</span> the required items
											</div>
										</div>
									</div>
									<div class="text-center sm:mx-2 sm:text-left select-none">
										<fieldset>
											<div class="space-y-5 mt-4">
												<div class="relative flex items-start">
													<div class="flex h-6 items-center">
														<input
															required
															on:input={verifyCheckboxes}
															bind:this={ownershipCheckbox}
															id="ownership"
															aria-describedby="ownership-description"
															name="ownership"
															type="checkbox"
															class="h-4 w-4 rounded border-gray-300 text-green-600 focus:outline-none focus:ring-0"
														/>
													</div>
													<div class="ml-3 text-sm leading-6">
														<label for="ownership" class="text-gray-500"
															><span class="font-medium text-gray-900">I own this account </span>and
															the audiobooks within</label
														>
													</div>
												</div>
												<div class="relative flex items-start">
													<div class="flex h-6 items-center">
														<input
															required
															on:input={verifyCheckboxes}
															bind:this={nosharingCheckbox}
															id="nosharing"
															aria-describedby="comments-description"
															name="nosharing"
															type="checkbox"
															class="h-4 w-4 rounded border-gray-300 text-green-600 focus:outline-none focus:ring-0"
														/>
													</div>
													<div class="ml-3 text-sm leading-6">
														<label for="nosharing" class="font-medium text-gray-900"
															>I don't intend to share these books with others</label
														>
													</div>
												</div>
											</div>
										</fieldset>
									</div>
								</fieldset>
							</div>
						</div>
						<div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 items-center">
							<Submit
								disabled={!acknowledgedItems || !linkedPasted || !linkClicked}
								class="w-full sm:w-auto"
								theme={{ primary: 'green', done: 'green' }}
								actionText="Create"
								actionTextInProgress="Creating"
								submitting={profileAdding}
								failed={form?.success === false && form?.response === 'urlresponse'}
							/>
							<form
								class="sm:mr-3 mt-2 sm:mt-0"
								method="POST"
								action="?/cancel"
								use:enhance={() => {
									profileAddCanceling = true;
									return async ({ update }) => {
										profileAddCanceling = false;
										update();
									};
								}}
							>
								<Submit
									class="w-full sm:w-auto"
									bind:this={cancelProfileAddButton}
									theme={{ primary: 'white', done: 'white' }}
									actionText="Cancel"
									actionTextInProgress="Canceling"
									submitting={profileAddCanceling}
								/>
							</form>
							{#if form?.success === false && form?.message}
								<div
									class="bg-red-500 text-white sm:px-2 grow sm:mr-3 mt-2 sm:mt-0 rounded-md h-9 align-middle line-h leading-9 text-xs"
								>
									{form?.message}
								</div>
							{/if}
						</div>
					</form>
				</div>
			</div>
		</div>
	</dialog>
{/if}
