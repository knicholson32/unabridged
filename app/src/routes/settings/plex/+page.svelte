<script lang="ts">
	import { beforeNavigate, goto } from "$app/navigation";
	import { icons } from "$lib/components";
	import { Switch } from "$lib/components/buttons";
	import Submit from "$lib/components/buttons/Submit.svelte";
  import * as Settings from "$lib/components/settings";
	import { CollectionBy, type GenerateAlert, type URLAlert } from "$lib/types";
	import { getContext, onMount } from "svelte";
  import { page } from '$app/stores';
	import { decodeURLAlert } from "$lib/components/alerts";
	import { enhance } from "$app/forms";

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
  let plexAddress = data.settingValues['plex.address'];
  let token = data.settingValues['plex.token'];


  // Plex API
  let plexAPIUpdate: () => {};
  let plexAPIUnsavedChanges = false;
  let apiTimeout = data.settingValues['plex.apiTimeout'];

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
    if (!authorizedRedirect && (libraryLocationUnsavedChanges || plexIntegrationUnsavedChanges || plexAPIUnsavedChanges || plexLibraryUnsavedChanges || plexCollectionsUnsavedChanges)) {
      if (!confirm('Are you sure you want to leave this page? You have unsaved changes that will be lost.')) {
        cancel();
      }
    }
  });

  // onMount(() => {
  //   let alert = $page.url.searchParams.get('a');
  //   if (alert !== null) {
  //     const decodedAlert = decodeURLAlert(alert);
  //     if (decodedAlert !== null) showAlert(decodedAlert.text, decodedAlert.settings);
  //   }
  //   // goto('/settings/plex');
  // });

</script>


<!-- Plex Integration -->
<Settings.List class="" form={form} action="?/updatePlexIntegration" bind:unsavedChanges={plexIntegrationUnsavedChanges} bind:update={plexIntegrationUpdate}>
  <span slot="title">Plex Integration</span>
  <span slot="description" class="block">
    <span class="block">Direct Unabridged where and how to interact with Plex.</span>
    {#if data.plex.signedIn === true}
      <span class="block">
        Connected to
        <a href="{data.settingValues['plex.address']}" target="_blank" class="inline-flex items-center font-mono border border-gray-300 rounded px-1">
          {data.plex.name}
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="ml-1 w-4 h-4">
            {@html icons.arrowTopRightOnSquare}
          </svg>
        </a>
      </span>
    {/if}
  </span>
  <span slot="button" class="inline-flex gap-2">
    <form method="POST" action={'?/testPlexIntegration'} use:enhance={({cancel}) => {
      testingPlexIntegration = true;
      return async ({ update }) => {
        testingPlexIntegration = false;
        update({ reset: false });
      };
    }}>
      <Submit
        class="w-full sm:w-auto" 
        theme={{primary: 'white', done: 'white', fail: 'white'}} 
        actionText={"Test"}
        doneText="Success"
        actionTextInProgress="Testing" 
        submitting={testingPlexIntegration}
        disabled={plexIntegrationUnsavedChanges || (data.settingValues['plex.address'] === '' || data.settingValues['plex.token'] === '')}
        hoverTitle={(data.settingValues['plex.address'] === '' || data.settingValues['plex.token'] === '') ? 'No data to test' : plexIntegrationUnsavedChanges ? 'Save changes before testing' : 'Test the current Plex integration settings.'}
        failed={form?.success === false && form?.action === '?/updatePlexIntegration'}
      />
    </form>
  </span>
  
  <Settings.Switch name="plex.enable" form={form} title="Enable Plex" update={plexIntegrationUpdate} bind:value={plexEnable} 
    hoverTitle={'Whether or not to enable Plex integration'} />

  <Settings.Input name="plex.address" form={form} title="Plex Address" mono={true} update={plexIntegrationUpdate} bind:value={plexAddress} 
    placeholder="127.0.0.1"
    hoverTitle={'Plex Address'} />

  <Settings.Password name="plex.token" form={form} title="Plex Token" update={plexIntegrationUpdate} bind:value={token} 
    hoverTitle="Plex Token" >
    <button 
      title="Click to sign into Plex to generate a Plex Token for Unabridged to use." 
      name="signIntoPlex"
      type="submit"
      on:click={() => authorizedRedirect = true }
      class="select-none w-full sm:w-auto flex justify-center items-center whitespace-nowrap px-3 py-2 rounded-md text-sm font-semibold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ring-1 ring-inset ring-gray-300 bg-white text-gray-800 hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:ring-gray-200 focus-visible:outline-grey-500">
      Sign Into Plex 
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="ml-1 w-4 h-4">
        {@html icons.arrowTopRightOnSquare}
      </svg>
    </button>
  </Settings.Password>

  <Settings.Frame title={'Clear Integration'}>
    <form method="POST" action={'?/clearPlexIntegration'}>
      <button 
        title={(data.settingValues['plex.address'] === '' && data.settingValues['plex.token'] === '') ? 'No settings to erase' : 'Click to erase Plex integration settings'} 
        type="submit" 
        disabled={data.settingValues['plex.address'] === '' && data.settingValues['plex.token'] === ''}
        class="hover:bg-yellow-100/20 hover:text-yellow-800 hover:ring-yellow-400/80 select-none w-full sm:w-auto flex justify-center items-center whitespace-nowrap px-3 py-2 rounded-md text-sm font-semibold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ring-1 ring-inset ring-gray-300 bg-white text-gray-800 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:ring-gray-200 focus-visible:outline-grey-500">
        Erase Settings & Logout
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="ml-1 w-4 h-4">
          {@html icons.warning}
        </svg>
      </button>
    </form>
  </Settings.Frame>

</Settings.List>


<!-- Plex API -->
<Settings.List class="" form={form} action="?/updatePlexAPI" bind:unsavedChanges={plexAPIUnsavedChanges} bind:update={plexAPIUpdate}>
  <span slot="title">Plex API</span>
  <span slot="description">Configure how Unabridged uses the Plex API.</span>

  <Settings.NumericalInput name="plex.apiTimeout" title="API Timeout" update={plexAPIUpdate} bind:value={apiTimeout}
    min={100}
    max={10000}
    hoverTitle={'The number of milliseconds before an API request to the Plex server should abort.'}
    showWrapper={{end: 'milliseconds'}} />

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
    min={0}
    max={600}
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
