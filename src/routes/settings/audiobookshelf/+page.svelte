<script lang="ts">
	import { beforeNavigate, invalidate } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { icons } from '$lib/components';
	import Submit from '$lib/components/buttons/Submit.svelte';
	import * as Settings from '$lib/components/routeSpecific/settings';

	export let data: import('./$types').PageData;
	export let form: import('./$types').ActionData;

	// Integration
	let testing = false;
	let integrationUpdate: () => {};
	let integrationUnsavedChanges = false;
	let enable = data.settingValues['abs.enable'];
	let address = data.settingValues['abs.address'];
	let linkAddress = data.settingValues['abs.linkAddress'];
	let apiKey = data.settingValues['abs.apiKey'];
	let library = data.settingValues['abs.library.id'];
	let folder = data.settingValues['abs.library.folderId'];
	let libraryIDSaved = data.settingValues['abs.library.id'];

	// Scanning
	let scanUpdate: () => {};
	let scanUnsavedChanges = false;
	let scanEnable = data.settingValues['abs.scan.enable'];
	let scanScheduled = data.settingValues['abs.scan.scheduled'];
	let scanDelay = data.settingValues['abs.scan.delay'];

	// API
	let apiUpdate: () => {};
	let apiUnsavedChanges = false;
	let apiTimeout = data.settingValues['abs.apiTimeout'];
	let scanTimeout = data.settingValues['abs.scan.timeout'];

	beforeNavigate(({ cancel }) => {
		if (integrationUnsavedChanges || scanUnsavedChanges || apiUnsavedChanges) {
			if (!confirm('Are you sure you want to leave this page? You have unsaved changes that will be lost.'))
				cancel();
		}
	});

	$: {
		if (form?.success === true && form.action === '?/clearIntegration') {
			form = null;
			enable = false;
			address = '';
			linkAddress = '';
			apiKey = '';
			library = '';
			folder = '';
		}
		libraryIDSaved = data.settingValues['abs.library.id'];
	}

	$: nothingSaved = data.settingValues['abs.address'] === '' && data.settingValues['abs.apiKey'] === '';
	$: notConnected = data.abs.connected === false;
</script>

<!-- Audiobookshelf Integration -->
<Settings.List
	class=""
	{form}
	action="?/updateIntegration"
	bind:unsavedChanges={integrationUnsavedChanges}
	bind:update={integrationUpdate}
>
	<span slot="title" class="relative inline-flex items-center">
		Audiobookshelf Integration
		{#if data.abs.issue !== null || (data.abs.connected && libraryIDSaved === '')}
			<span
				class="absolute flex h-3 w-3 -right-4 sm:right-auto sm:-left-4"
				title={data.abs.issue ?? 'No Audiobookshelf library is selected.'}
			>
				<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
				<span class="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
			</span>
		{/if}
	</span>
	<span slot="description" class="block">
		<span class="block">
			Connect Unabridged to Audiobookshelf so new books are scanned in and linked. Create an API key
			in Audiobookshelf under <span class="font-medium">Settings → API Keys</span>, for an admin user.
		</span>
		{#if data.abs.connected}
			<span class="block mt-1">
				Connected to
				<a
					href={data.settingValues['abs.linkAddress'] || data.settingValues['abs.address']}
					target="_blank"
					class="inline-flex items-center font-mono border border-gray-300 rounded px-1"
				>
					Audiobookshelf {data.abs.serverVersion}
					<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="ml-1 w-4 h-4">
						{@html icons.arrowTopRightOnSquare}
					</svg>
				</a>
				as <span class="font-mono">{data.abs.username}</span>
			</span>
		{:else if data.abs.issue !== null}
			<span class="block mt-1 text-red-600">{data.abs.issue}</span>
		{/if}
	</span>
	<span slot="button" class="inline-flex">
		<form
			method="POST"
			action="?/testIntegration"
			class="relative inline-flex items-center gap-2"
			use:enhance={() => {
				testing = true;
				return async ({ update }) => {
					testing = false;
					update({ reset: false });
				};
			}}
		>
			<Submit
				class="w-full sm:w-auto"
				theme={{ primary: 'white', done: 'white', fail: 'white' }}
				actionText="Test"
				doneText="Success"
				actionTextInProgress="Testing"
				submitting={testing}
				disabled={integrationUnsavedChanges || nothingSaved}
				hoverTitle={nothingSaved
					? 'No settings to test'
					: integrationUnsavedChanges
					? 'Save changes before testing'
					: 'Test the saved Audiobookshelf settings'}
				failed={form?.success === false && form?.action === '?/updateIntegration'}
			/>
		</form>
	</span>

	<Settings.Switch
		name="abs.enable"
		{form}
		title="Enable Audiobookshelf"
		update={integrationUpdate}
		bind:value={enable}
		hoverTitle="Whether Unabridged talks to Audiobookshelf. Saving with this on tests the connection first."
	/>

	<Settings.Input
		name="abs.address"
		{form}
		title="Server URL"
		mono={true}
		update={integrationUpdate}
		bind:value={address}
		placeholder="http://audiobookshelf:80"
		hoverTitle="The Audiobookshelf URL as Unabridged reaches it, including any base path"
	/>

	<Settings.Input
		name="abs.linkAddress"
		{form}
		title="Link URL"
		mono={true}
		update={integrationUpdate}
		bind:value={linkAddress}
		placeholder="Same as Server URL"
		hoverTitle="The Audiobookshelf URL your browser uses, for 'Open in Audiobookshelf' links. Leave blank if it is the same as the Server URL (it often is not when both run in Docker)."
	/>

	<Settings.Password
		name="abs.apiKey"
		{form}
		title="API Key"
		update={integrationUpdate}
		bind:value={apiKey}
		hoverTitle="An Audiobookshelf API key belonging to an admin user (needed to scan libraries)"
	/>

	<Settings.Select
		{form}
		name="abs.library.id"
		badge={libraryIDSaved === '' && data.abs.connected}
		title="Library"
		update={integrationUpdate}
		bind:value={library}
		disabled={notConnected}
		hoverTitle={notConnected
			? 'Connect to Audiobookshelf first: enable it, enter the URL and API key, and save.'
			: 'The Audiobookshelf library that holds the folder Unabridged saves books to'}
		options={data.abs.libraries}
	/>

	{#if data.abs.folders.length > 0}
		<Settings.Select
			{form}
			name="abs.library.folderId"
			title="Library Folder"
			update={integrationUpdate}
			bind:value={folder}
			mono={true}
			hoverTitle="This library has several folders. Choose the one that is Unabridged's library folder, as Audiobookshelf sees it."
			options={[{ value: '', title: 'First folder', unset: false }, ...data.abs.folders]}
		/>
	{/if}

	<Settings.Frame title="Clear Integration" hoverTitle="Erase the Audiobookshelf settings">
		<form
			method="POST"
			action="?/clearIntegration"
			use:enhance={({ cancel }) => {
				if (!confirm('Are you sure?\n\nThis will disconnect Unabridged from Audiobookshelf.')) return cancel();
				return async ({ update }) => {
					invalidate('/settings/audiobookshelf');
					update({ reset: true });
				};
			}}
		>
			<button
				title={nothingSaved ? 'No settings to erase' : 'Erase the Audiobookshelf settings'}
				type="submit"
				disabled={nothingSaved}
				class="hover:bg-yellow-100/20 hover:text-yellow-800 hover:ring-yellow-400/80 select-none w-full sm:w-auto flex justify-center items-center whitespace-nowrap px-3 py-2 rounded-md text-sm font-semibold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ring-1 ring-inset ring-gray-300 bg-white text-gray-800 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:ring-gray-200 focus-visible:outline-grey-500"
			>
				Erase Settings
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="ml-1 w-4 h-4">
					{@html icons.warning}
				</svg>
			</button>
		</form>
	</Settings.Frame>
</Settings.List>

<!-- Library Scanning -->
<Settings.List
	class=""
	{form}
	action="?/updateScan"
	bind:unsavedChanges={scanUnsavedChanges}
	bind:update={scanUpdate}
>
	<span slot="title">Library Scanning</span>
	<span slot="description">
		Have Audiobookshelf pick up books after Unabridged adds them.
	</span>

	<Settings.Switch
		name="abs.scan.enable"
		{form}
		title="Scan After Adding Books"
		update={scanUpdate}
		bind:value={scanEnable}
		hoverTitle="Whether to ask Audiobookshelf to scan after Unabridged adds books"
	/>

	<Settings.Switch
		name="abs.scan.scheduled"
		{form}
		title="Only Scan During Scheduled Time"
		update={scanUpdate}
		bind:value={scanScheduled}
		disabled={scanEnable === false}
		hoverTitle={scanEnable === false
			? 'Disabled because scanning is off'
			: 'Scan only during the scheduled (cron) run instead of right after books are added'}
	/>

	<Settings.NumericalInput
		name="abs.scan.delay"
		{form}
		title="Scan Delay"
		update={scanUpdate}
		bind:value={scanDelay}
		min={0}
		max={600}
		disabled={scanEnable === false || scanScheduled === true}
		hoverTitle={scanEnable === false
			? 'Disabled because scanning is off'
			: scanScheduled === true
			? 'Disabled because scans only run at the scheduled time'
			: 'How long to wait after books finish processing before scanning'}
		showWrapper={{ start: 'Delay', end: 'seconds' }}
	/>
</Settings.List>

<!-- Audiobookshelf API -->
<Settings.List
	class=""
	{form}
	action="?/updateAPI"
	bind:unsavedChanges={apiUnsavedChanges}
	bind:update={apiUpdate}
>
	<span slot="title">Audiobookshelf API</span>
	<span slot="description">Configure how Unabridged uses the Audiobookshelf API.</span>

	<Settings.NumericalInput
		name="abs.apiTimeout"
		{form}
		title="API Timeout"
		update={apiUpdate}
		bind:value={apiTimeout}
		min={100}
		max={60000}
		hoverTitle="Milliseconds before a request to Audiobookshelf is abandoned"
		showWrapper={{ end: 'milliseconds' }}
	/>

	<Settings.NumericalInput
		name="abs.scan.timeout"
		{form}
		title="Library Scan Timeout"
		update={apiUpdate}
		bind:value={scanTimeout}
		min={10}
		max={14400}
		hoverTitle="Seconds before Unabridged stops waiting for an Audiobookshelf library scan to finish"
		showWrapper={{ end: 'seconds' }}
	/>
</Settings.List>
