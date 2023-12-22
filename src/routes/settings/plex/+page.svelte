<script lang="ts">
	import { beforeNavigate, goto, invalidate } from '$app/navigation';
	import { icons } from '$lib/components';
	import { Switch, VerifyButton } from '$lib/components/buttons';
	import Submit from '$lib/components/buttons/Submit.svelte';
	import * as Settings from '$lib/components/routeSpecific/settings';
	import { CollectionBy, type GenerateAlert } from '$lib/types';
	import { getContext, onMount } from 'svelte';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import CollectionList from '$lib/components/routeSpecific/settings/CollectionList.svelte';
	import Collection from '$lib/components/routeSpecific/settings/Collection.svelte';

	export let data: import('./$types').PageData;
	export let form: import('./$types').ActionData;

	let showAlert = getContext<GenerateAlert>('showAlert');

	let authorizedRedirect = false;

	// Library Location
	let libraryLocationUpdate: () => {};
	let libraryLocationUnsavedChanges = false;
	let libraryLocation = data.settingValues['library.location'];

	// Plex Integration
	let testingPlexIntegration = false;
	let plexIntegrationUpdate: () => {};
	let plexIntegrationUnsavedChanges = false;
	let plexEnable = data.settingValues['plex.enable'];
	let plexAddress = data.settingValues['plex.address'] + '/';
	if (plexAddress === '/') plexAddress = '';
	let token = data.settingValues['plex.token'];
	let library = data.settingValues['plex.library.id'];

	// Plex API
	let plexAPIUpdate: () => {};
	let plexAPIUnsavedChanges = false;
	let apiTimeout = data.settingValues['plex.apiTimeout'];
	let libraryScanTimeout = data.settingValues['plex.library.autoScan.timeout'];

	// Plex Library
	let plexLibraryUpdate: () => {};
	let plexLibraryUnsavedChanges = false;
	let autoScan = data.settingValues['plex.library.autoScan.enable'];
	let autoScanDelay = data.settingValues['plex.library.autoScan.delay'];
	let scheduled = data.settingValues['plex.library.autoScan.scheduled'];

	// Plex Collections
	let plexCollectionsUpdate: () => {};
	let plexCollectionsUnsavedChanges = false;
	let libraryIDSaved = data.settingValues['plex.library.id'];
	let collectionsEnable = data.settingValues['plex.collections.enable'];
	let collectBy = data.settingValues['plex.collections.by'];
	let groupSingles = data.settingValues['plex.collections.groupSingles'];
	let generatingCollections = false;

	// Utilities
	beforeNavigate(({ cancel }) => {
		if (
			!authorizedRedirect &&
			(libraryLocationUnsavedChanges ||
				plexIntegrationUnsavedChanges ||
				plexAPIUnsavedChanges ||
				plexLibraryUnsavedChanges ||
				plexCollectionsUnsavedChanges)
		) {
			if (
				!confirm(
					'Are you sure you want to leave this page? You have unsaved changes that will be lost.'
				)
			) {
				cancel();
			}
		}
	});

	$: {
		if (form?.success === true) {
			if (form.action === '?/updatePlexIntegration') data.plex.issueDetected = false;
			else if (form.action === '?/clearPlexIntegration') {
				form = null;
				plexEnable = false;
				plexAddress = '';
				token = '';
			}
		}
		libraryIDSaved = data.settingValues['plex.library.id'];
	}
</script>

<!-- Plex Integration -->
<Settings.List
	class=""
	{form}
	action="?/updatePlexIntegration"
	bind:unsavedChanges={plexIntegrationUnsavedChanges}
	bind:update={plexIntegrationUpdate}
>
	<span slot="title" class="relative inline-flex items-center">
		Plex Integration
		{#if data.plex.issueDetected}
			<span
				class="absolute flex h-3 w-3 -right-4 sm:right-auto sm:-left-4"
				title="Unabridged could not connect to the Plex server. Check settings."
			>
				<span
					class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"
				/>
				<span class="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
			</span>
		{/if}
	</span>
	<span slot="description" class="block">
		<span class="block">Direct Unabridged where and how to interact with Plex.</span>
		{#if data.plex.signedIn === true}
			<span class="block">
				Connected to
				<a
					href={data.settingValues['plex.address']}
					target="_blank"
					class="inline-flex items-center font-mono border border-gray-300 rounded px-1"
				>
					{data.plex.name}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
						class="ml-1 w-4 h-4"
					>
						{@html icons.arrowTopRightOnSquare}
					</svg>
				</a>
			</span>
		{/if}
	</span>
	<span slot="button" class="inline-flex">
		<form
			method="POST"
			action={'?/testPlexIntegration'}
			class="relative inline-flex items-center gap-2"
			use:enhance={({ cancel }) => {
				testingPlexIntegration = true;
				return async ({ update }) => {
					testingPlexIntegration = false;
					update({ reset: false });
				};
			}}
		>
			<Submit
				class="w-full sm:w-auto"
				theme={{ primary: 'white', done: 'white', fail: 'white' }}
				actionText={'Test'}
				doneText="Success"
				actionTextInProgress="Testing"
				submitting={testingPlexIntegration}
				disabled={plexIntegrationUnsavedChanges ||
					data.settingValues['plex.address'] === '' ||
					data.settingValues['plex.token'] === ''}
				hoverTitle={data.settingValues['plex.address'] === '' ||
				data.settingValues['plex.token'] === ''
					? 'No data to test'
					: plexIntegrationUnsavedChanges
					? 'Save changes before testing'
					: 'Test the current Plex integration settings.'}
				failed={form?.success === false && form?.action === '?/updatePlexIntegration'}
			/>
		</form>
	</span>

	<Settings.Switch
		name="plex.enable"
		{form}
		title="Enable Plex"
		update={plexIntegrationUpdate}
		bind:value={plexEnable}
		hoverTitle={'Whether or not to enable Plex integration'}
	/>

	<Settings.Input
		name="plex.address"
		{form}
		title="Plex Address"
		mono={true}
		update={plexIntegrationUpdate}
		bind:value={plexAddress}
		placeholder="http://127.0.0.1:32400/"
		hoverTitle={'Plex Address'}
	/>

	<Settings.Password
		name="plex.token"
		{form}
		title="Plex Token"
		update={plexIntegrationUpdate}
		bind:value={token}
		hoverTitle="Plex Token"
	>
		<button
			title="Click to sign into Plex to generate a Plex Token for Unabridged to use."
			name="signIntoPlex"
			type="submit"
			on:click={() => (authorizedRedirect = true)}
			class="select-none w-full sm:w-auto flex justify-center items-center whitespace-nowrap px-3 py-2 rounded-md text-sm font-semibold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ring-1 ring-inset ring-gray-300 bg-white text-gray-800 hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:ring-gray-200 focus-visible:outline-grey-500"
		>
			Sign Into Plex
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="currentColor"
				class="ml-1 w-4 h-4"
			>
				{@html icons.arrowTopRightOnSquare}
			</svg>
		</button>
	</Settings.Password>

	<Settings.Select
		{form}
		name="plex.library.id"
		badge={libraryIDSaved === '' && data.plex.signedIn === true}
		title="Plex Library"
		update={plexIntegrationUpdate}
		bind:value={library}
		disabled={data.plex.signedIn === false}
		hoverTitle={data.plex.signedIn === false
			? 'Disabled because Plex is not signed in.'
			: 'Select which library Unabridged is saving to.'}
		options={data.plex.sections}
	/>

	<Settings.Frame title={'Clear Integration'} hoverTitle={'Erase Plex integration settings'}>
		<form
			method="POST"
			action={'?/clearPlexIntegration'}
			use:enhance={({ cancel, formData }) => {
				if (
					!confirm(
						`Are you sure?\n\nThis will disconnect Unabridged from your Plex server${
							(formData.get('plex.collections.delete') ?? 'false') === 'true'
								? ' and delete managed collections.'
								: '.'
						}`
					)
				)
					return cancel();
				return async ({ update }) => {
					invalidate('/settings/plex');
					update({ reset: true });
				};
			}}
		>
			<div class="flex flex-col sm:inline-flex sm:flex-row-reverse gap-3">
				<button
					title={data.settingValues['plex.address'] === '' &&
					data.settingValues['plex.token'] === ''
						? 'No settings to erase'
						: 'Click to erase Plex integration settings'}
					type="submit"
					disabled={data.settingValues['plex.address'] === '' &&
						data.settingValues['plex.token'] === ''}
					class="hover:bg-yellow-100/20 hover:text-yellow-800 hover:ring-yellow-400/80 select-none w-full sm:w-auto flex justify-center items-center whitespace-nowrap px-3 py-2 rounded-md text-sm font-semibold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ring-1 ring-inset ring-gray-300 bg-white text-gray-800 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:ring-gray-200 focus-visible:outline-grey-500"
				>
					Erase Settings & Logout
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
						class="ml-1 w-4 h-4"
					>
						{@html icons.warning}
					</svg>
				</button>
				<div class="inline-flex justify-end">
					<Switch
						type="button"
						title="Delete Collections?"
						forceHiddenInput={true}
						valueName={'plex.collections.delete'}
						value={true}
						disabled={data.settingValues['plex.address'] === '' &&
							data.settingValues['plex.token'] === ''}
						hoverTitle="Should Unabridged delete collections it created from the linked Plex server? Why this matters: When Unabridged connects to a Plex library, it always creates it's own collections. If the collections aren't deleted now, duplicates will be created if Unabridged is re-connected."
					/>
				</div>
			</div>
		</form>
	</Settings.Frame>
</Settings.List>

<!-- Plex Collections -->
<Settings.List
	class=""
	{form}
	action="?/updatePlexCollections"
	bind:unsavedChanges={plexCollectionsUnsavedChanges}
	bind:update={plexCollectionsUpdate}
>
	<span slot="title" class="relative inline-flex items-center">
		Plex Collections
		{#if libraryIDSaved === '' && data.plex.signedIn}
			<span
				class="absolute flex h-3 w-3 -right-4 sm:right-auto sm:-left-4"
				title="No Plex Library is selected. See 'Plex Integration' settings above."
			>
				<span
					class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"
				/>
				<span class="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
			</span>
		{/if}
	</span>
	<span slot="description">Configure automatic Collections management in Plex.</span>

	<Settings.Switch
		name="plex.collections.enable"
		title="Enable Collections Management"
		update={plexCollectionsUpdate}
		bind:value={collectionsEnable}
		disabled={libraryIDSaved === '' || data.plex.signedIn === false}
		hoverTitle={libraryIDSaved === ''
			? "Disabled because no Plex Library is selected. See 'Plex Integration' settings above."
			: 'Whether or not to enable have Unabridged manage Plex Collections automatically.'}
	/>

	<Settings.Select
		{form}
		name="plex.collections.by"
		title="Collect Books Via"
		update={plexCollectionsUpdate}
		bind:value={collectBy}
		disabled={collectionsEnable === false || libraryIDSaved === '' || data.plex.signedIn === false}
		options={[CollectionBy.series]}
		hoverTitle={libraryIDSaved === ''
			? "Disabled because no Plex Library is selected. See 'Plex Integration' settings above."
			: collectionsEnable === false
			? 'Disabled because Plex collection management is disabled'
			: 'Specify how audiobooks could be collected in Plex'}
	/>

	<Settings.Switch
		name="plex.collections.groupSingles"
		title="Collect Single Books"
		update={plexCollectionsUpdate}
		bind:value={groupSingles}
		disabled={collectionsEnable === false || libraryIDSaved === '' || data.plex.signedIn === false}
		hoverTitle={libraryIDSaved === ''
			? "Disabled because no Plex Library is selected. See 'Plex Integration' settings above."
			: 'Whether or not to create and manage a collection for the books that would not otherwise have a Plex collection.'}
	/>

	<Settings.Frame
		title={'Generate'}
		hoverTitle={'Generate collections once, right now'}
		error={form?.success === false && form?.action === '?/generateCollections'
			? form?.message
			: null}
	>
		<form
			method="POST"
			action={'?/generateCollections'}
			use:enhance={() => {
				generatingCollections = true;
				return async ({ update }) => {
					generatingCollections = false;
					update({ reset: true });
				};
			}}
		>
			<div class="inline-flex gap-3">
				<Submit
					class="w-full sm:w-auto"
					theme={{ primary: 'white', done: 'white', fail: 'white' }}
					actionText={'Generate Plex Collections'}
					doneText="Done"
					disabled={collectionsEnable === false ||
						libraryIDSaved === '' ||
						data.plex.signedIn === false}
					hoverTitle={libraryIDSaved === ''
						? "Disabled because no Plex Library is selected. See 'Plex Integration' settings above."
						: 'Click to generate Plex collections'}
					actionTextInProgress="Generating"
					submitting={generatingCollections}
					failed={form?.success === false && form?.action === '?/generateCollections'}
				/>
			</div>
		</form>
	</Settings.Frame>

	<div class="flex flex-col gap-3 pt-4">
		{#if data.plex.collections.length > 0}
			<CollectionList collections={data.plex.collections} />
		{/if}
	</div>
</Settings.List>

<!-- Plex Library -->
<Settings.List
	class=""
	{form}
	action="?/updatePlexLibrary"
	bind:unsavedChanges={plexLibraryUnsavedChanges}
	bind:update={plexLibraryUpdate}
>
	<span slot="title">Plex Library Scanning</span>
	<span slot="description"
		>Configure automatic library scanning after books are added via Unabridged.</span
	>

	<Settings.Switch
		name="plex.library.autoScan"
		title="Enable Automatic Scan"
		update={plexLibraryUpdate}
		bind:value={autoScan}
		hoverTitle={'Whether or not to enable automatic Plex library scans after adding audiobooks via Unabridged'}
	/>

	<Settings.Switch
		name="plex.library.scheduled"
		title="Only Scan During Scheduled Time"
		update={plexLibraryUpdate}
		bind:value={scheduled}
		disabled={autoScan === false}
		hoverTitle={autoScan === false
			? 'Disabled because automatic scan is disabled'
			: 'Whether or not to enable scheduled Plex library scans, as opposed to immediate scans'}
	/>

	<Settings.NumericalInput
		name="plex.library.autoScanDelay"
		title="Auto Scan Delay"
		update={plexLibraryUpdate}
		bind:value={autoScanDelay}
		min={0}
		max={600}
		disabled={autoScan === false || scheduled === true}
		hoverTitle={autoScan === false
			? 'Disabled because automatic sync is disabled'
			: scheduled === true
			? 'Disabled because scheduled sync is enabled'
			: 'How long to wait after books are downloaded before triggering a Plex library scan'}
		showWrapper={{ start: 'Delay', end: 'seconds' }}
	/>
</Settings.List>

<!-- Plex API -->
<Settings.List
	class=""
	{form}
	action="?/updatePlexAPI"
	bind:unsavedChanges={plexAPIUnsavedChanges}
	bind:update={plexAPIUpdate}
>
	<span slot="title">Plex API</span>
	<span slot="description">Configure how Unabridged uses the Plex API.</span>

	<Settings.NumericalInput
		name="plex.apiTimeout"
		title="API Timeout"
		update={plexAPIUpdate}
		bind:value={apiTimeout}
		min={100}
		max={10000}
		hoverTitle={'The number of milliseconds before an API request to the Plex server should abort.'}
		showWrapper={{ end: 'milliseconds' }}
	/>

	<Settings.NumericalInput
		name="plex.library.autoScan.timeout"
		title="Plex Library Scan Timeout"
		update={plexAPIUpdate}
		bind:value={libraryScanTimeout}
		min={10}
		max={14400}
		hoverTitle={'The number of seconds before Unabridged will give-up waiting for a Plex library scan to finish.'}
		showWrapper={{ end: 'seconds' }}
	/>
</Settings.List>

<!-- Library Location -->
<Settings.List
	class=""
	{form}
	action="?/updateLibraryLocation"
	bind:unsavedChanges={libraryLocationUnsavedChanges}
	bind:update={libraryLocationUpdate}
	confirmAction={'This will cause file de-sync if there are books currently downloaded.'}
>
	<span slot="title">Library Location</span>
	<span slot="description"
		>Specify where Unabridged should save audiobooks. If you intend to use plex, this should be a
		folder accessible by Plex via the Plex library selected in the Plex Integration settings.</span
	>

	<Settings.Input
		name="library.location"
		{form}
		mono={true}
		title="Library Location"
		update={libraryLocationUpdate}
		bind:value={libraryLocation}
		hoverTitle="Library location"
	/>
</Settings.List>
