<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { EscapeOrClickOutside, accordion } from '$lib/components/events';
	import { fade } from 'svelte/transition';
	import { cubicInOut } from 'svelte/easing';
	import { countryCodes } from '$lib/types';
	import { Submit, Switch } from '$lib/components/buttons';
	import Number from '$lib/components/decorations/Number.svelte';
	import Accordion from '$lib/components/decorations/Accordion.svelte';
	import { toISOStringTZ } from '$lib/helpers';
	import { intlFormatDistance } from 'date-fns';
	import { invalidate } from '$app/navigation';
	import icons from '$lib/components/icons';
	import { type GenerateAlert, Event } from '$lib/types';
	import * as helpers from '$lib/helpers';
	import * as events from '$lib/events';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import LoadingCircle from '$lib/components/decorations/LoadingCircle.svelte';

	export let data: import('./$types').PageData;
	export let form: import('./$types').ActionData;

	let showAlert = getContext<GenerateAlert>('showAlert');

	$: {
		if (form !== undefined) {
			if (form?.success === true) {
			} else {
				console.log('Form failure!');
				if (form?.response === 'sync') {
					// showAlert('Profile sync error', { subText: form?.message, theme: 'error' });
				} else if (form?.response === 'deregister') {
					showAlert('Source deletion error', { subText: form?.message, theme: 'error' });
				}
			}
		}
	}
	$: {
		if (browser && form?.invalidate && data.source.profile_image_url) {
			form.invalidate = false;
			console.log('INVALIDATE');
			invalidate('/');
		}
	}

	// let counter = 0;
	// const makeAlert = async () => {
	//   await alerts.createNotification({
	//     id: uuidv4(),
	//     icon_path: null,
	//     icon_color: null,
	//     theme: 'info' satisfies ModalTheme,
	//     text: 'Info notification',
	//     sub_text: 'With some subtext',
	//     linger_time: 0,
	//     needs_clearing: true,
	//     auto_open: true,
	//     issuer: 'general' satisfies Issuer,
	//     identifier: null,
	//   });
	//   await alerts.createNotification({
	//     id: uuidv4(),
	//     icon_path: null,
	//     icon_color: null,
	//     theme: 'ok' satisfies ModalTheme,
	//     text: 'OK notification',
	//     sub_text: 'With some subtext',
	//     linger_time: 0,
	//     needs_clearing: true,
	//     auto_open: true,
	//     issuer: 'general' satisfies Issuer,
	//     identifier: null,
	//   });
	//   await alerts.createNotification({
	//     id: uuidv4(),
	//     icon_path: null,
	//     icon_color: null,
	//     theme: 'warning' satisfies ModalTheme,
	//     text: 'Warning notification',
	//     sub_text: 'With some subtext',
	//     linger_time: 0,
	//     needs_clearing: true,
	//     auto_open: true,
	//     issuer: 'general' satisfies Issuer,
	//     identifier: null,
	//   });
	//   await alerts.createNotification({
	//     id: uuidv4(),
	//     icon_path: null,
	//     icon_color: null,
	//     theme: 'error' satisfies ModalTheme,
	//     text: 'Error notification',
	//     sub_text: 'With some subtext',
	//     linger_time: 0,
	//     needs_clearing: true,
	//     auto_open: true,
	//     issuer: 'general' satisfies Issuer,
	//     identifier: null,
	//   });
	//   showAlert('Info alert', {
	//     subText: 'With some subtext',
	//     theme: 'info'
	//   })
	//   showAlert('OK alert', {
	//     subText: 'With some subtext',
	//     theme: 'ok'
	//   })
	//   showAlert('Warning alert', {
	//     subText: 'With some subtext',
	//     theme: 'warning'
	//   })
	//   showAlert('Error alert', {
	//     subText: 'With some subtext',
	//     theme: 'error'
	//   })
	//   // if (counter % 2 === 0)
	//   //   showAlert('My alert!', {subText: 'This is my subtext. Alert ' + counter, linger_ms: 0, iconPath: icons.warning, iconColor: 'text-red-400'});
	//   // else
	//   //   showAlert('My alert! ' + counter, {linger_ms: 0, iconPath: icons.info});
	//   // counter ++;
	// }

	// -----------------------------------------------------------------------------------------------
	// Profile Sync
	// -----------------------------------------------------------------------------------------------

	let syncingProgress = 0;
	let profileSyncing = false;

	onMount(() =>
		events.onProgress('basic.account.sync', data.source.id, (data) => {
			if (data.t === Event.Progress.Basic.Stage.START) {
				profileSyncing = true;
				syncingProgress = 0;
			} else if (data.t === Event.Progress.Basic.Stage.IN_PROGRESS) {
				profileSyncing = true;
				syncingProgress = data.p;
			} else if (data.t === Event.Progress.Basic.Stage.DONE) {
				profileSyncing = false;
				syncingProgress = 1;
			}
		})
	);

	// const fetchSyncProgress = async () => {
	//   let progressResp: ProgressAPI = await (await fetch(`/api/progress/specific/${data.profile.id}/sync`)).json() as ProgressAPI;
	//   if (progressResp.ok === true && progressResp.progress !== undefined) {
	//     console.log(Date.now(), progressResp.progress.progress, progressResp.progress.message);
	//     syncingProgress = progressResp.progress.progress;
	//   };
	//   if (syncingProgress === 1) syncingDone(true);
	// }

	// const syncingDone = (skipUpdate = false) => {
	//   if(!skipUpdate) fetchSyncProgress();
	//   profileSyncing = false;
	//   clearInterval(syncingInterval);
	// }

	// const startSyncing = () => {
	//   syncingProgress = 0;
	//   profileSyncing = true;
	//   console.log(`/api/progress/specific/${data.profile.id}-sync`);
	//   syncingInterval = setInterval(fetchSyncProgress, 250);
	//   fetchSyncProgress();
	// }

	// onMount(() => {
	//   if (data.syncing.val === true) {
	//     startSyncing();
	//   }
	//   return () => syncingDone(true);
	// })

	// -----------------------------------------------------------------------------------------------
	// Profile Data
	// -----------------------------------------------------------------------------------------------

	let profile_picture: HTMLImageElement;
	let name: string = data.source.name;
	let email: string;
	let country: HTMLSelectElement;
	let description: string;
	let profileSubmitting: boolean = false;
	let profileDeleting: boolean = false;
	let profileSync: Submit;
	let profileAutoSync = data.source.auto_sync;

	let lastSyncPretty =
		data.source.last_sync === null
			? 'Never'
			: intlFormatDistance(new Date(data.source.last_sync * 1000), new Date());
	let lastSyncSpecific =
		data.source.last_sync === null ? 'Never' : toISOStringTZ(data.source.last_sync * 1000, data.tz);
	let interval = setInterval(() => {
		lastSyncPretty =
			data.source.last_sync === null
				? 'Never'
				: intlFormatDistance(new Date(data.source.last_sync * 1000), new Date());
	}, 1000);

	// Clear interval for last-synced
	onMount(() => clearInterval(interval));

	const resetProfileDataForm = () => {
		name = '';
		email = '';
		country.selectedIndex = countryCodes.findIndex(
			(code) => code.code === data.source.audible?.locale_code
		);
		description = '';
	};

	// -----------------------------------------------------------------------------------------------
	// Profile Picture Dialog
	// -----------------------------------------------------------------------------------------------

	let uploadProfilePictureVisible = false;
	let profilePictureSubmitting = false;
	let profilePictureTooBigWarningVisible = false;

	const openProfilePictureDialog = () => {
		uploadProfilePictureVisible = true;
		profilePictureTooBigWarningVisible = false;
	};
	const closeProfilePictureDialog = () => (uploadProfilePictureVisible = false);

	let profilePictureInput: HTMLInputElement;
	let profilePicturePreview: HTMLImageElement;
	let profilePictureSubmit: Submit;

	const profilePictureChanged = () => {
		if (profilePictureInput.files === null || profilePictureInput.files.length !== 1) return;
		const file = profilePictureInput.files[0];

		if (file.size / 1000000 > 50) {
			profilePictureTooBigWarningVisible = true;
			profilePictureSubmit.disable(true);
			return;
		} else profilePictureTooBigWarningVisible = false;

		const reader = new FileReader();
		reader.addEventListener('load', function () {
			if (reader.result === null || typeof reader.result !== 'string') return;
			profilePicturePreview.setAttribute('src', reader.result);
			profilePictureSubmit.disable(false);
		});
		reader.readAsDataURL(file);
	};

	// -----------------------------------------------------------------------------------------------
	// Delete Profile Dialog
	// -----------------------------------------------------------------------------------------------
	let deleteDialogVisible = false;
	const closeDeleteDialog = () => {
		deleteDialogVisible = false;
	};
	const openDeleteDialog = () => {
		deleteDialogVisible = true;
	};
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

	let num_downloaded: number;
	let total_run_time_min: number;
	let downloaded_run_time_min: number;
	// let total_run_time_hr_part: number;
	// let total_run_time_min_part: number;
	// let downloaded_run_time_hr: number;
	// let downloaded_run_time_min: number;

	let total: helpers.RunTime;
	let downloaded: helpers.RunTime;

	let notAuthorized = false;

	data.promise.authenticated.then((data) => {
		console.log('authed', data);
		if (data === null) return;
		notAuthorized = !data;
	});

	$: {
		num_downloaded = 0;
		total_run_time_min = 0;
		downloaded_run_time_min = 0;
		for (const book of data.source.books) {
			if (book.downloaded) {
				num_downloaded += 1;
				downloaded_run_time_min += book.runtime_length_min ?? 0;
			}
			total_run_time_min += book.runtime_length_min ?? 0;
		}

		total = new helpers.RunTime({ min: total_run_time_min });
		downloaded = new helpers.RunTime({ min: downloaded_run_time_min });
	}
</script>
<div class="grow bg-gray-100 h-full w-full">
	<nav class="flex border-b border-gray-200 bg-white" aria-label="Breadcrumb">
		<ol role="list" class="mx-auto flex w-full space-x-4 px-4 sm:px-6 lg:px-8">
			<li class="flex">
				<div class="flex items-center">
					<a href="/" class="text-gray-400 hover:text-gray-500">
						<svg
							class="h-5 w-5 flex-shrink-0"
							viewBox="0 0 20 20"
							fill="currentColor"
							aria-hidden="true"
						>
							<path
								fill-rule="evenodd"
								d="M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-3a1 1 0 00-1-1H9a1 1 0 00-1 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-6H3a1 1 0 01-.707-1.707l7-7z"
								clip-rule="evenodd"
							/>
						</svg>
						<span class="sr-only">Home</span>
					</a>
				</div>
			</li>
			<li class="flex">
				<div class="flex items-center">
					<svg
						class="h-full w-6 flex-shrink-0 text-gray-200"
						viewBox="0 0 24 44"
						preserveAspectRatio="none"
						fill="currentColor"
						aria-hidden="true"
					>
						<path d="M.293 0l22 22-22 22h1.414l22-22-22-22H.293z" />
					</svg>
					<a href="/sources" class="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700"
						>Sources</a
					>
				</div>
			</li>
			<li class="flex">
				<div class="flex items-center">
					<svg
						class="h-full w-6 flex-shrink-0 text-gray-200"
						viewBox="0 0 24 44"
						preserveAspectRatio="none"
						fill="currentColor"
						aria-hidden="true"
					>
						<path d="M.293 0l22 22-22 22h1.414l22-22-22-22H.293z" />
					</svg>
					<a
						href="/sources/audible/{data.source.id}"
						class="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700"
						aria-current="page">{data.source.name}</a
					>
				</div>
			</li>
		</ol>
	</nav>

	<div class="overflow-hidden relative w-full h-60 md:h-36">
		<div class="absolute left-0 right-0 top-0 bottom-0">
			<div class="absolute -left-6 grid grid-rows-5 md:grid-rows-3 grid-flow-col">
				{#each data.source.books as book}
					<div class="h-12 w-12">
						<img class=" bg-gray-300" src={book.cover?.url_50} alt="" />
					</div>
				{/each}
			</div>
		</div>
		<div class="absolute left-0 right-0 top-0 bottom-0 bg-black bg-opacity-[0.85]" />
		<div
			class="absolute left-0 right-0 top-0 bottom-0 flex items-center justify-between space-x-6 p-6"
		>
			<div class="flex-1 truncate">
				<div class="flex items-center space-x-3">
					<h3 class="truncate text-lg md:text-base font-semibold leading-6 text-white">
						{data.source.name}
					</h3>
					<span class="inline-flex flex-shrink-0 items-center rounded-full bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
						Audible
					</span>
				</div>
				{#if data.source.audible?.email !== undefined}
					<p class="mt-1 truncate text-sm text-gray-500">{data.source.audible?.email}</p>
				{/if}
			</div>
			<img
				class="h-20 w-20 md:h-10 md:w-10 flex-shrink-0 rounded-full bg-gray-100"
				src="{data.source.profile_image_url}/128"
				alt=""
			/>
		</div>
	</div>

	{#await data.promise.authenticated}
	{:then authenticated}
		<div in:accordion={{ heightRem: 12, duration: 500 }} class="w-full bg-red-600 text-white overflow-hidden">
			{#if authenticated === false}
				<div class="h-12 flex justify-center items-center text-center">
					Account is not logged in. Please log in again.
				</div>
			{/if}
		</div>
	{/await}

	<div class="p-5">
		<div class="space-y-10 divide-y divide-gray-900/10">
			<div class="">
				<h3 class="text-base font-semibold leading-6 text-gray-900">Account Tools</h3>
				<dl class="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
					<div
						class="relative overflow-hidden rounded-lg bg-white px-4 pb-12 pt-5 shadow sm:px-6 sm:pt-6"
					>
						<dt>
							<div class="absolute rounded-md bg-indigo-500 p-3">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
									class="w-6 h-6 text-white"
								>
									<path
										d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z"
									/>
									<path
										d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z"
									/>
								</svg>
							</div>
							<p class="ml-16 truncate text-sm font-medium text-gray-500">
								Profile Library
								<span
									on:click={profileSync.click}
									on:keypress={profileSync.click}
									title={lastSyncSpecific}
									tabindex="0"
									role="button"
									class="inline-flex select-none cursor-pointer ml-1 text-xs items-baseline rounded-full px-2.5 py-0.5 font-medium bg-gray-100 text-gray-500 md:mt-2 lg:mt-0"
								>
									<svg
										class="w-3 h-3 m-auto -ml-[0.3rem] mr-1"
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fill-rule="evenodd"
											d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z"
											clip-rule="evenodd"
										/>
									</svg>
									{lastSyncPretty}
								</span>
							</p>
						</dt>
						<dd class="ml-16 flex items-baseline pb-6 sm:pb-7">
							<p class="text-2xl font-semibold text-gray-900">
								<Number value={data.source.books.length} /> Books
							</p>
							<p class="ml-2 flex items-baseline text-sm font-semibold text-gray-400">
								<Number value={total.hours} />hr
							</p>
							<div class="absolute inset-x-0 bottom-0 bg-gray-50 px-4 py-4 sm:px-6">
								<div class="text-sm inline m-auto">
									<a href="#" class="font-medium text-indigo-600 hover:text-indigo-500"
										>View all<span class="sr-only"> Total Subscribers stats</span></a
									>
								</div>
								<div
									class="text-sm flex space-x-3 divide-x divide-gray-900/10 absolute -translate-y-1/2 top-1/2 right-4"
								>
									<form
										class="m-auto"
										method="POST"
										action="?/auto_sync"
										use:enhance={() => {
											return async ({ update }) => {
												update();
											};
										}}
									>
										<Switch
											title={'Auto Sync'}
											value={data.source.auto_sync}
											type={'submit'}
											valueName={'auto-sync'}
										/>
									</form>
									<form
										class="pl-3"
										method="POST"
										action="?/sync"
										use:enhance={() => {
											profileSyncing = true;
											return async ({ update }) => {
												// showAlert('Profile sync complete', {linger_ms: 4000, iconPath: icons.ok, iconColor: 'text-gray-400'});
												update();
											};
										}}
									>
										<Submit
											bind:this={profileSync}
											submitting={profileSyncing}
											progress={syncingProgress}
											failed={form?.success === false && form?.response === 'sync'}
											actionText={'Sync'}
											actionTextInProgress={'Syncing'}
										/>
									</form>
								</div>
							</div>
						</dd>
					</div>

					<div
						class="relative overflow-hidden rounded-lg bg-white px-4 pb-12 pt-5 shadow sm:px-6 sm:pt-6"
					>
						<dt>
							<div class="absolute rounded-md bg-indigo-500 p-3">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
									class="w-6 h-6 text-white"
								>
									<path
										d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z"
									/>
									<path
										d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z"
									/>
								</svg>
							</div>
							<p class="ml-16 truncate text-sm font-medium text-gray-500">Books Downloaded</p>
						</dt>
						<dd class="ml-16 flex items-baseline pb-6 sm:pb-7">
							<p class="text-2xl font-semibold text-gray-900">{num_downloaded}</p>
							<p class="ml-2 flex items-baseline text-sm font-semibold text-gray-400">
								of {data.source.books.length}
								<span
									class="inline-flex ml-2 text-xs items-baseline rounded-full px-2.5 py-0.5 font-medium bg-green-100 text-green-800 md:mt-2 lg:mt-0"
								>
									{data.source.books.length === 0
										? 0
										: ((num_downloaded * 100) / data.source.books.length).toPrecision(1)}%
								</span>
							</p>
							<div class="absolute inset-x-0 bottom-0 bg-gray-50 px-4 py-4 sm:px-6">
								<div class="text-sm inline">
									<a href="#" class="font-medium text-indigo-600 hover:text-indigo-500"
										>View all<span class="sr-only"> Total Subscribers stats</span></a
									>
								</div>
							</div>
						</dd>
					</div>
				</dl>
			</div>

			<div class="grid grid-cols-1 gap-x-8 gap-y-8 pt-10 md:grid-cols-3">
				<div class="px-4 sm:px-0">
					<h2 class="text-base font-semibold leading-7 text-gray-900">Personal Information</h2>
					<p class="mt-1 text-sm leading-6 text-gray-600">
						Update information as-need to make using Unabridged more effective. This information is
						used locally only.
					</p>
				</div>

				<form
					method="POST"
					action="?/update"
					class="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2"
					use:enhance={() => {
						profileSubmitting = true;
						return async ({ update }) => {
							profileSubmitting = false;
							showAlert(`Profile modified`, {
								linger_ms: 8000,
								iconPath: icons.fingerPrint,
								iconColor: 'text-gray-400'
							});
							update();
						};
					}}
				>
					<div class="px-4 py-6 sm:p-8">
						<div class="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
							<div class="col-span-full">
								<label for="photo" class="block text-sm font-medium leading-6 text-gray-900"
									>Photo</label
								>
								<div class="mt-2 flex items-center gap-x-3">
									<!-- <svg class="h-12 w-12 text-gray-300" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd" d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" clip-rule="evenodd" />
                  </svg> -->
									<img
										bind:this={profile_picture}
										src="{data.source.profile_image_url}/128"
										class="h-24 w-24 rounded-full"
										alt="Profile picture for {data.source.name} - {data.source.audible?.email}"
									/>
									<button
										on:click={openProfilePictureDialog}
										type="button"
										class="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
										>Change</button
									>
								</div>
							</div>

							<div class="sm:col-span-3">
								<label for="name" class="block text-sm font-medium leading-6 text-gray-900"
									>Account Name</label
								>
								<div class="mt-2">
									<input
										bind:value={name}
										type="text"
										name="name"
										id="name"
										autocomplete="given-name"
										class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
									/>
								</div>
							</div>

							<div class="sm:col-span-4">
								<label for="email" class="block text-sm font-medium leading-6 text-gray-900"
									>Email address</label
								>
								<div class="mt-2">
									<input
										value={data.source.audible?.email ?? 'unset'}
										id="email"
										name="disabled"
										type="email"
										disabled
										autocomplete="email"
										class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
									/>
								</div>
							</div>

							<div class="sm:col-span-4">
								<label for="country" class="block text-sm font-medium leading-6 text-gray-900"
									>Country</label
								>
								<div class="mt-2">
									<select
										bind:this={country}
										id="country"
										name="country"
										autocomplete="country-name"
										class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:max-w-xs sm:text-sm sm:leading-6"
									>
										<!-- <option value="" disabled>{countryCodes.find(code => code.code === data.profile.locale_code)?.name}</option> -->
										{#each countryCodes as code}
											<option
												value={code.code}
												selected={data.source.audible?.locale_code === code.code}
												>{code.name}</option
											>
										{/each}
									</select>
								</div>
							</div>

							<div class="col-span-full">
								<label for="about" class="block text-sm font-medium leading-6 text-gray-900"
									>About</label
								>
								<div class="mt-2">
									<textarea
										bind:value={description}
										placeholder={data.source.description}
										id="about"
										name="about"
										rows="3"
										class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
									/>
								</div>
								<p class="mt-3 text-sm leading-6 text-gray-600">
									Write some details about this account
								</p>
							</div>
						</div>
					</div>
					<div
						class="flex items-center justify-end gap-x-6 border-t border-gray-900/10 px-4 py-4 sm:px-8"
					>
						<button
							on:click={resetProfileDataForm}
							type="button"
							class="text-sm font-semibold leading-6 text-gray-900">Cancel</button
						>
						<Submit submitting={profileSubmitting} />
					</div>
				</form>
			</div>

			<div class="grid grid-cols-1 gap-x-8 gap-y-8 pt-10 md:grid-cols-3">
				<div class="px-4 sm:px-0">
					<h2 class="text-base font-semibold leading-7 text-gray-900">Delete Account</h2>
					<p class="mt-1 text-sm leading-6 text-gray-600">
						This cannot be undone. Downloaded books will remain in the library.
					</p>
				</div>

				<form class="md:col-span-2">
					<div class="flex items-center justify-center gap-x-6 py-4 px-10 h-full">
						<!-- <button type="submit" class="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Save</button> -->
						<button
							on:click={openDeleteDialog}
							type="button"
							class="inline-flex !w-full !ml-0 justify-center rounded-md bg-red-600 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto"
							>Delete</button
						>
					</div>
				</form>
			</div>
		</div>
	</div>

	{#if uploadProfilePictureVisible}
		<dialog
			class="relative z-30"
			aria-labelledby="modal-title"
			open={uploadProfilePictureVisible}
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
				<div
					class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0"
				>
					<!-- DONE
            Modal panel, show/hide based on modal state.

            Entering: "ease-out duration-300"
              From: "opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              To: "opacity-100 translate-y-0 sm:scale-100"
            Leaving: "ease-in duration-200"
              From: "opacity-100 translate-y-0 sm:scale-100"
              To: "opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          -->
					<div
						transition:dialogFly
						use:EscapeOrClickOutside={{ callback: closeProfilePictureDialog }}
						class="overflow-hidden relative bg-white shadow sm:rounded-lg"
					>
						<button
							on:click={closeProfilePictureDialog}
							type="button"
							class="relative float-right top-2 right-2 h-5 w-5 group rounded-md text-black/30 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
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
							action="?/upload"
							use:enhance={() => {
								profilePictureSubmitting = true;
								return async ({ update }) => {
									profilePictureSubmitting = false;
									showAlert(`Profile modified`, {
										linger_ms: 8000,
										iconPath: icons.fingerPrint,
										iconColor: 'text-gray-400'
									});
									closeProfilePictureDialog();
									console.log($page.url.pathname);
									// update();
								};
							}}
						>
							<h3 class="pt-2 text-base font-semibold leading-6 text-gray-900 mb-4">
								Profile Picture
							</h3>
							<Accordion
								heightRem={1.5}
								visible={profilePictureTooBigWarningVisible}
								class="bg-red-500 text-white text-xs px-4 py-1 text-center"
								>File size too big. Max size is 50MB.</Accordion
							>
							<div class="px-4 pt-2 pb-5 sm:p-6">
								<div class="flex items-center space-x-3">
									<div class="shrink-0">
										<img
											bind:this={profilePicturePreview}
											class="h-20 w-20 object-cover rounded-full"
											src="{data.source.profile_image_url}/128"
											alt="Current profile"
										/>
									</div>
									<label class="block">
										<span class="sr-only">Choose profile photo</span>
										<input
											required={true}
											type="file"
											bind:this={profilePictureInput}
											on:change={profilePictureChanged}
											accept="image/*"
											name="image"
											class="block w-full text-sm text-slate-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:cursor-pointer
                      file:text-sm file:font-semibold
                      file:bg-indigo-50 file:text-indigo-700
                      hover:file:bg-indigo-100
                    "
										/>
									</label>
								</div>
							</div>
							<div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
								<!-- <button bind:this={profilePictureSubmit} disabled class="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:ml-3 sm:w-auto disabled:text-gray-200 cursor-not-allowed disabled:bg-gray-800 disabled:hover:bg-gray-800">Upload</button> -->
								<Submit
									disabled={true}
									class="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:ml-3 sm:w-auto"
									bind:this={profilePictureSubmit}
									submitting={profilePictureSubmitting}
									actionText={'Upload'}
									actionTextInProgress={'Uploading'}
								/>
								<button
									on:click={closeProfilePictureDialog}
									type="button"
									class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
									>Cancel</button
								>
							</div>
						</form>
					</div>
				</div>
			</div>
		</dialog>
	{/if}

	{#if deleteDialogVisible}
		<dialog
			class="relative z-30"
			aria-labelledby="modal-title"
			open={deleteDialogVisible}
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
				<div
					class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0"
				>
					<!-- DONE
            Modal panel, show/hide based on modal state.

            Entering: "ease-out duration-300"
              From: "opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              To: "opacity-100 translate-y-0 sm:scale-100"
            Leaving: "ease-in duration-200"
              From: "opacity-100 translate-y-0 sm:scale-100"
              To: "opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          -->
					<div
						transition:dialogFly
						use:EscapeOrClickOutside={{ callback: closeDeleteDialog }}
						class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg"
					>
						<div class="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
							<div class="sm:flex sm:items-start">
								<div
									class="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10"
								>
									<svg
										class="h-6 w-6 text-red-600"
										fill="none"
										viewBox="0 0 24 24"
										stroke-width="1.5"
										stroke="currentColor"
										aria-hidden="true"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
										/>
									</svg>
								</div>
								<div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
									<h3 class="text-base font-semibold leading-6 text-gray-900" id="modal-title">
										Delete account
									</h3>
									<div class="mt-2">
										<p class="text-sm text-gray-500">
											Are you sure you want to delete this account? This action cannot be undone.
										</p>
									</div>
								</div>
							</div>
						</div>
						<div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
							<form
								method="POST"
								action="?/deregister"
								use:enhance={() => {
									profileDeleting = true;
									return async ({ update }) => {
										profileDeleting = false;
										closeDeleteDialog();
										update();
									};
								}}
							>
								<input name="id" value={data.source.id} type="hidden" />
								<!-- <button class="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto">Delete</button> -->
								<Submit
									bind:this={profileSync}
									theme={{ primary: 'red' }}
									class="w-full justify-center rounded-md sm:ml-3 sm:w-auto"
									submitting={profileDeleting}
									actionText={'Delete'}
									actionTextInProgress={'Deleting'}
								/>
							</form>
							<button
								on:click={closeDeleteDialog}
								type="button"
								class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
								>Cancel</button
							>
						</div>
					</div>
				</div>
			</div>
		</dialog>
	{/if}
</div>

<!-- {form?.success} -->
