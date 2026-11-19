<script lang="ts">
	import { beforeNavigate } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { Submit, Switch } from '$lib/components/buttons';
	import * as Settings from '$lib/components/routeSpecific/settings';
	import { CollectionBy } from '$lib/types';

	export let data: import('./$types').PageData;
	export let form: import('./$types').ActionData;

	// Library Location
	let libraryLocationUpdate: () => {};
	let libraryLocationUnsavedChanges = false;
	let libraryLocation = data.settingValues['library.location'];

	// Download Manager
	let downloadManagerUpdate: () => {};
	let downloadManagerUnsavedChanges = false;
	let startPaused = data.settingValues['progress.startPaused'];

	// Auto Sync
	let autoSyncUpdate: () => {};
	let autoSyncUnsavedChanges = false;
	let autoSyncAudible = data.settingValues['general.autoSync'];

	// Metadata files
	let writingMetadata = false;
	$: metadataResult =
		form !== null && 'action' in form && form.action === '?/writeMetadataFiles'
			? (form as { success: boolean; message: string })
			: null;

	// Utilities
	beforeNavigate(({ cancel }) => {
		if (libraryLocationUnsavedChanges || downloadManagerUnsavedChanges || autoSyncUnsavedChanges) {
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
		folder accessible by plex.</span
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

<!-- Metadata Files -->
<form
	method="POST"
	action="?/writeMetadataFiles"
	use:enhance={() => {
		writingMetadata = true;
		return async ({ update }) => {
			writingMetadata = false;
			update({ reset: false });
		};
	}}
>
	<div class="border-b pb-6">
		<div class="flex items-center gap-x-2">
			<div class="max-w-md">
				<h2 class="text-lg font-semibold leading-7 text-gray-900">Metadata Files</h2>
				<p class="mt-1 text-sm leading-6 text-gray-500">
					Unabridged writes a <code>metadata.json</code> next to each book so Audiobookshelf picks up
					series, narrators and ASIN. Regenerate them for every downloaded book.
				</p>
				{#if metadataResult !== null}
					<p
						class="mt-1 text-sm leading-6 {metadataResult.success
							? 'text-green-600'
							: 'text-red-600'}"
					>
						{metadataResult.message}
					</p>
				{/if}
			</div>
			<div class="flex-grow" />
			<div class="sm:mr-3 inline-flex gap-2 relative">
				<Submit
					class="w-full sm:w-auto"
					theme={{ primary: 'white', done: 'white', fail: 'white' }}
					actionText="Regenerate"
					actionTextInProgress="Writing"
					doneText="Done"
					submitting={writingMetadata}
					failed={metadataResult?.success === false}
				/>
			</div>
		</div>
	</div>
</form>

<!-- Download Manager -->
<Settings.List
	class=""
	{form}
	action="?/updateDownloadManager"
	bind:unsavedChanges={downloadManagerUnsavedChanges}
	bind:update={downloadManagerUpdate}
>
	<span slot="title">Download Manager</span>
	<span slot="description"
		>Configure how Unabridged downloads audiobooks from remote sources & accounts.</span
	>

	<Settings.Switch
		name="progress.startPaused"
		{form}
		title="Start Paused"
		update={downloadManagerUpdate}
		bind:value={startPaused}
		hoverTitle="Start Paused"
	/>
</Settings.List>

<!-- Auto sync -->
<Settings.List
	class=""
	{form}
	action="?/updateAutoSync"
	bind:unsavedChanges={autoSyncUnsavedChanges}
	bind:update={autoSyncUpdate}
>
	<span slot="title">Auto Sync</span>
	<span slot="description">Configure which sources should auto sync.</span>

	<Settings.Switch
		name="general.autoSync"
		{form}
		title="Audible Accounts"
		update={autoSyncUpdate}
		bind:value={autoSyncAudible}
		hoverTitle="Start Paused"
	/>

	{#each data.sources as source}
		<Settings.Switch
			indent={true}
			titleImg={source.profile_image_url}
			titleLink={`/sources/${source.id}`}
			name={source.id}
			{form}
			title={source.name ?? 'Unknown'}
			update={autoSyncUpdate}
			bind:value={source.auto_sync}
			disabled={autoSyncAudible === false}
			hoverTitle={autoSyncAudible === false
				? 'Disabled because Auto Sync is disabled.'
				: `Auto Sync '${source.name ?? 'Unknown'}'`}
		/>
	{/each}
</Settings.List>
