<script lang="ts">
	import { beforeNavigate } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { getContext } from 'svelte';
	import type { GenerateAlert } from '$lib/types';
	import { reportFormError } from '$lib/helpers/forms';
	import Submit from '$lib/components/buttons/Submit.svelte';
	import * as Settings from '$lib/components/routeSpecific/settings';
	import { timeZonesNames } from '@vvo/tzdb';

	export let data: import('./$types').PageData;
	export let form: import('./$types').ActionData;
	const showAlert = getContext<GenerateAlert | undefined>('showAlert');

	// Search
	let searchUpdate: () => {};
	let searchUnsavedChanges = false;
	let autoSubmit = data.settingValues['search.autoSubmit'];

	// Localization
	let localizationUpdate: () => {};
	let localizationUnsavedChanges = false;
	let timezone = data.settingValues['general.timezone'];

	// Notifications
	let notifyUpdate: () => {};
	let notifyUnsavedChanges = false;
	let notifyTesting = false;
	let ntfyEnable = data.settingValues['notify.ntfy.enable'];
	let ntfyUrl = data.settingValues['notify.ntfy.url'];
	let ntfyToken = data.settingValues['notify.ntfy.token'];
	let linkAddress = data.settingValues['notify.linkAddress'];
	$: ntfyNothingSaved = data.settingValues['notify.ntfy.url'] === '';

	// Utilities
	beforeNavigate(({ cancel }) => {
		if (searchUnsavedChanges || localizationUnsavedChanges || notifyUnsavedChanges) {
			if (
				!confirm(
					'Are you sure you want to leave this page? You have unsaved changes that will be lost.'
				)
			) {
				cancel();
			}
		}
	});
</script>

<!-- Search -->
<Settings.List class="" {form} action="?/updateSearch" bind:unsavedChanges={searchUnsavedChanges} bind:update={searchUpdate}>
	<span slot="title">Search</span>
	<span slot="description">Configure how searching is performed.</span>

	<Settings.Switch name="search.autoSubmit" title="Search While Typing" update={searchUpdate} bind:value={autoSubmit} hoverTitle={'Whether or not to refresh the library search as the user is typing the search query'}/>
</Settings.List>

<!-- Localization -->
<Settings.List class="" {form} action="?/updateLocalization" bind:unsavedChanges={localizationUnsavedChanges} bind:update={localizationUpdate}>
	<span slot="title">Localization</span>
	<span slot="description">Configure localization info for Unabridged.</span>

	<Settings.Select {form} name="general.timezone" title="Local Timezone" update={localizationUpdate} bind:value={timezone} options={timeZonesNames.concat('UTC')}/>
</Settings.List>

<!-- Notifications -->
<Settings.List class="" {form} action="?/updateNotifications" bind:unsavedChanges={notifyUnsavedChanges} bind:update={notifyUpdate}>
	<span slot="title">Notifications</span>
	<span slot="description">
		Send a push notification through <a href="https://ntfy.sh" target="_blank" class="font-medium text-indigo-600 hover:text-indigo-500">ntfy</a>
		when an account fails to sync or a book fails to download, and a summary when the books Auto
		Download queued are done. Subscribe to the topic in the ntfy app to receive them.
	</span>
	<span slot="button" class="inline-flex">
		<form
			method="POST"
			action="?/testNotifications"
			class="relative inline-flex items-center gap-2"
			use:enhance={() => {
				notifyTesting = true;
				return async ({ result, update }) => {
					notifyTesting = false;
					if (reportFormError(result, showAlert, 'Test')) return;
					update({ reset: false });
				};
			}}
		>
			<Submit
				class="w-full sm:w-auto"
				theme={{ primary: 'white', done: 'white', fail: 'white' }}
				actionText="Send Test"
				doneText="Sent"
				actionTextInProgress="Sending"
				submitting={notifyTesting}
				disabled={notifyUnsavedChanges || ntfyNothingSaved}
				hoverTitle={ntfyNothingSaved
					? 'Save a topic URL first'
					: notifyUnsavedChanges
					? 'Save changes before testing'
					: 'Send a test notification to the saved topic (even if notifications are off)'}
				failed={form?.success === false && form?.action === '?/updateNotifications'}
			/>
		</form>
	</span>

	<Settings.Switch name="notify.ntfy.enable" {form} title="Enable Notifications" update={notifyUpdate} bind:value={ntfyEnable} hoverTitle="Whether Unabridged sends notifications to the ntfy topic"/>
	<Settings.Input name="notify.ntfy.url" {form} title="Topic URL" mono={true} update={notifyUpdate} bind:value={ntfyUrl} placeholder="https://ntfy.sh/my-topic" hoverTitle="The ntfy server and topic, as one URL. On the public ntfy.sh server anyone who knows the topic name can read it, so pick one that is hard to guess."/>
	<Settings.Password name="notify.ntfy.token" {form} title="Access Token" update={notifyUpdate} bind:value={ntfyToken} hoverTitle="An ntfy access token (tk_...), for topics that need one to publish. Leave blank for an open topic."/>
	<Settings.Input name="notify.linkAddress" {form} title="Unabridged URL" mono={true} update={notifyUpdate} bind:value={linkAddress} placeholder="https://unabridged.example.com" hoverTitle="The address you open Unabridged at. Tapping a notification opens the account or book it is about. Leave blank for notifications without links."/>
</Settings.List>

<div>
	<h2 class="text-base font-semibold leading-7 text-gray-900">Version Information</h2>
	<p class="mt-1 text-sm leading-6 text-gray-500">
		Unabridged commit
		<a class="font-mono" href="https://github.com/knicholson32/unabridged/commit/{data.version}" target="_blank">@{data.version.substring(0, 7)}</a>
	</p>
</div>
