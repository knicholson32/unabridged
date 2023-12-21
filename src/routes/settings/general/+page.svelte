<script lang="ts">

	import { beforeNavigate } from "$app/navigation";
	import * as Settings from "$lib/components/routeSpecific/settings";
  import { timeZonesNames } from "@vvo/tzdb";

  export let data: import('./$types').PageData;
  export let form: import('./$types').ActionData;

  // Search
  let searchUpdate: () => {};
  let searchUnsavedChanges = false;
  let autoSubmit = data.settingValues['search.autoSubmit'];

  // Localization
  let localizationUpdate: () => {};
  let localizationUnsavedChanges = false;
  let timezone = data.settingValues['general.timezone'];

  // Utilities
  beforeNavigate(({ cancel }) => {
    if (searchUnsavedChanges || localizationUnsavedChanges) {
      if (!confirm('Are you sure you want to leave this page? You have unsaved changes that will be lost.')) {
        cancel();
      }
    }
  });

</script>

<!-- Search -->
<Settings.List class="" form={form} action="?/updateSearch" bind:unsavedChanges={searchUnsavedChanges} bind:update={searchUpdate}>
  <span slot="title">Search</span>
  <span slot="description">Configure how searching is performed.</span>

  <Settings.Switch name="search.autoSubmit" title="Search While Typing" update={searchUpdate} bind:value={autoSubmit} 
    hoverTitle={'Whether or not to refresh the library search as the user is typing the search query'} />

</Settings.List>

<!-- Localization -->
<Settings.List class="" form={form} action="?/updateLocalization" bind:unsavedChanges={localizationUnsavedChanges} bind:update={localizationUpdate}>
  <span slot="title">Localization</span>
  <span slot="description">Configure localization info for Unabridged.</span>

  <Settings.Select form={form} name="general.timezone" title="Local Timezone" update={localizationUpdate} bind:value={timezone} 
    options={timeZonesNames.concat('UTC')}/>
</Settings.List>

<div>
  <h2 class="text-base font-semibold leading-7 text-gray-900">Version Information</h2>
  <p class="mt-1 text-sm leading-6 text-gray-500">Unabridged commit
    <a class="font-mono" href="https://github.com/knicholson32/unabridged/commit/{data.version}" target="_blank">@{data.version.substring(0, 7)}</a>
  </p>
</div>