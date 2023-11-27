<script lang="ts">
	import { beforeNavigate } from "$app/navigation";
	import { Switch } from "$lib/components/buttons";
  import * as Settings from "$lib/components/settings";
	import { CollectionBy } from "$lib/types";

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

  // Utilities
  beforeNavigate(({ cancel }) => {
    if (libraryLocationUnsavedChanges || downloadManagerUnsavedChanges || autoSyncUnsavedChanges) {
      if (!confirm('Are you sure you want to leave this page? You have unsaved changes that will be lost.')) {
        cancel();
      }
    }
  });

</script>


<!-- Library Location -->
<Settings.List class="" form={form} action="?/updateLibraryLocation" bind:unsavedChanges={libraryLocationUnsavedChanges} bind:update={libraryLocationUpdate} confirmAction={'This will cause file de-sync if there are books currently downloaded.'}>
  <span slot="title">Library Location</span>
  <span slot="description">Specify where Unabridged should save audiobooks. If you intend to use plex, this should be a folder accessible by plex.</span>

  <Settings.Input name="library.location" form={form} mono={true} title="Library Location" update={libraryLocationUpdate} bind:value={libraryLocation} 
    hoverTitle="Library location" />
</Settings.List>

<!-- Download Manager -->
<Settings.List class="" form={form} action="?/updateDownloadManager" bind:unsavedChanges={downloadManagerUnsavedChanges} bind:update={downloadManagerUpdate}>
  <span slot="title">Download Manager</span>
  <span slot="description">Configure how Unabridged downloads audiobooks from remote sources & accounts.</span>

  <Settings.Switch name="progress.startPaused" form={form} title="Start Paused" update={downloadManagerUpdate} bind:value={startPaused} 
    hoverTitle="Start Paused" />
</Settings.List>

<!-- Auto sync -->
<Settings.List class="" form={form} action="?/updateAutoSync" bind:unsavedChanges={autoSyncUnsavedChanges} bind:update={autoSyncUpdate}>
  <span slot="title">Auto Sync</span>
  <span slot="description">Configure which sources should auto sync.</span>

  <Settings.Switch name="general.autoSync" form={form} title="Audible" update={autoSyncUpdate} bind:value={autoSyncAudible} 
    hoverTitle="Start Paused" />
</Settings.List>
