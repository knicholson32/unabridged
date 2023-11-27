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

  // Plex Integration
  let plexIntegrationUpdate: () => {};
  let plexIntegrationUnsavedChanges = false;
  let plexEnable = data.settingValues['plex.enable'];
  let plexAddress = data.settingValues['plex.address'];
  let useToken = data.settingValues['plex.useToken'];
  let token = data.settingValues['plex.token'];
  let username = data.settingValues['plex.username'];
  let password = data.settingValues['plex.password'];

  // Plex Library
  let plexLibraryUpdate: () => {};
  let plexLibraryUnsavedChanges = false;
  let autoScan = data.settingValues['plex.library.autoScan'];
  let autoScanDelay = data.settingValues['plex.library.autoScanDelay'];
  let scheduled = data.settingValues['plex.library.scheduled'];

  // Plex Collections
  let plexCollectionsUpdate: () => {};
  let plexCollectionsUnsavedChanges = false;
  let collectionsEnable = data.settingValues['plex.collections.enable'];
  let collectBy = data.settingValues['plex.collections.by'];

  // Utilities
  beforeNavigate(({ cancel }) => {
    if (libraryLocationUnsavedChanges || plexIntegrationUnsavedChanges || plexLibraryUnsavedChanges || plexCollectionsUnsavedChanges) {
      if (!confirm('Are you sure you want to leave this page? You have unsaved changes that will be lost.')) {
        cancel();
      }
    }
  });

</script>


<!-- Plex Integration -->
<Settings.List class="mt-16" action="?/updatePlexIntegration" bind:unsavedChanges={plexIntegrationUnsavedChanges} bind:update={plexIntegrationUpdate}>
  <span slot="title">Plex Integration</span>
  <span slot="description">Direct Unabridged where and how to interact with Plex.</span>

  <Settings.Switch name="plex.enable" title="Enable Plex" update={plexIntegrationUpdate} bind:value={plexEnable} 
    hoverTitle={'Whether or not to enable Plex integration'} />

  <Settings.Input name="plex.address" title="Plex Address" mono={true} update={plexIntegrationUpdate} bind:value={plexAddress} 
    disabled={plexEnable === false}
    placeholder="127.0.0.1"
    hoverTitle={plexEnable === false ? 'Disabled because Plex is not enabled' : 'Plex Address'} />

  <Settings.Switch name="plex.useToken" title="Use Plex Token" update={plexIntegrationUpdate} bind:value={useToken} 
    hoverTitle={plexEnable === false ? 'Disabled because Plex is not enabled' : 'Whether or not to use a Plex Token. Either a Plex Token or account login can be used.'}
    disabled={plexEnable === false} />

  <Settings.Password name="plex.token" title="Plex Token" update={plexIntegrationUpdate} bind:value={token} 
    disabled={useToken === false || plexEnable === false}
    hoverTitle={useToken === false || plexEnable === false ? (plexEnable ? 'Disabled because Plex is being authenticated with a Plex username and password' : 'Disabled because Plex is not enabled') : 'Plex Token'} />

  <Settings.Input name="plex.username" title="Plex Email or Username" update={plexIntegrationUpdate} bind:value={username} 
    disabled={useToken === true || plexEnable === false} 
    hoverTitle={useToken === true || plexEnable === false ? (plexEnable ? 'Disabled because Plex is being authenticated with a Plex Token' : 'Disabled because Plex is not enabled') : 'Plex Username'} />

  <Settings.Password name="plex.password" title="Plex Password" update={plexIntegrationUpdate} bind:value={password} 
    disabled={useToken === true || plexEnable === false} 
    hoverTitle={useToken === true || plexEnable === false ? (plexEnable ? 'Disabled because Plex is being authenticated with a Plex Token' : 'Disabled because Plex is not enabled') : 'Plex Password'} />
</Settings.List>


<!-- Plex Library -->
<Settings.List class="" form={form} action="?/updatePlexLibrary" bind:unsavedChanges={plexLibraryUnsavedChanges} bind:update={plexLibraryUpdate}>
  <span slot="title">Plex Library</span>
  <span slot="description">Configure automatic library scanning after books are added via Unabridged.</span>

  <Settings.Switch name="plex.library.autoScan" title="Enable Automatic Sync" update={plexLibraryUpdate} bind:value={autoScan} 
    hoverTitle={'Whether or not to enable automatic Plex library scans after adding audiobooks via Unabridged'} />

  <Settings.Switch name="plex.library.scheduled" title="Only Sync During Scheduled Time" update={plexLibraryUpdate} bind:value={scheduled} 
    disabled={autoScan === false}
    hoverTitle={autoScan === false ? 'Disabled because automatic sync is disabled' : 'Whether or not to enable scheduled Plex library scans, as opposed to immediate scans'} />
  
  <Settings.NumericalInput name="plex.library.autoScanDelay" title="Auto Scan Delay" update={plexLibraryUpdate} bind:value={autoScanDelay}
    disabled={autoScan === false || scheduled === true}
    hoverTitle={autoScan === false ? 'Disabled because automatic sync is disabled' : (scheduled === true ? 'Disabled because scheduled sync is enabled' : 'How long to wait after books are downloaded before triggering a Plex library scan')}
    showWrapper={{start: 'Delay', end: 'seconds'}} />
  

</Settings.List>

<!-- Plex Collections -->
<Settings.List class="" form={form} action="?/updatePlexCollections" bind:unsavedChanges={plexCollectionsUnsavedChanges} bind:update={plexCollectionsUpdate}>
  <span slot="title">Plex Collections</span>
  <span slot="description">Configure automatic Collections management in Plex.</span>

  <Settings.Switch name="plex.collections.enable" title="Enable Collections Management" update={plexCollectionsUpdate} bind:value={collectionsEnable} 
    hoverTitle={'Whether or not to enable have Unabridged manage Plex Collections automatically.'} />
  
  <Settings.Select form={form} name="plex.collections.by" title="Collect Books Via" update={plexCollectionsUpdate} bind:value={collectBy} 
    disabled={collectionsEnable === false}
    options={[CollectionBy.series, CollectionBy.album]}
    hoverTitle={collectionsEnable === false ? 'Disabled because Plex collection management is disabled' : 'Specify how audiobooks could be collected in Plex'} />
  
</Settings.List>

<!-- Library Location -->
<Settings.List class="" form={form} action="?/updateLibraryLocation" bind:unsavedChanges={libraryLocationUnsavedChanges} bind:update={libraryLocationUpdate} confirmAction={'This will cause file de-sync if there are books currently downloaded.'}>
  <span slot="title">Library Location</span>
  <span slot="description">Specify where Unabridged should save audiobooks. If you intend to use plex, this should be a folder accessible by plex.</span>

  <Settings.Input name="library.location" form={form} mono={true} title="Library Location" update={libraryLocationUpdate} bind:value={libraryLocation} 
    hoverTitle="Library location" />
</Settings.List>
