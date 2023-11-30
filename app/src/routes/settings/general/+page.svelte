<script lang="ts">

	import { beforeNavigate } from "$app/navigation";
	import * as Settings from "$lib/components/settings";
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
  <h2 class="text-base font-semibold leading-7 text-gray-900">Language and dates</h2>
  <p class="mt-1 text-sm leading-6 text-gray-500">Choose what language and date format to use throughout your account.</p>

  <dl class="mt-6 space-y-6 divide-y divide-gray-100 border-t border-gray-200 text-sm leading-6">
    <div class="pt-6 sm:flex">
      <dt class="font-medium text-gray-900 sm:w-64 sm:flex-none sm:pr-6">Language</dt>
      <dd class="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
        <div class="text-gray-900">English</div>
        <button type="button" class="font-semibold text-indigo-600 hover:text-indigo-500">Update</button>
      </dd>
    </div>
    <div class="pt-6 sm:flex">
      <dt class="font-medium text-gray-900 sm:w-64 sm:flex-none sm:pr-6">Date format</dt>
      <dd class="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
        <div class="text-gray-900">DD-MM-YYYY</div>
        <button type="button" class="font-semibold text-indigo-600 hover:text-indigo-500">Update</button>
      </dd>
    </div>
    <div class="flex pt-6">
      <dt class="flex-none pr-6 font-medium text-gray-900 sm:w-64" id="timezone-option-label">Automatic timezone</dt>
      <dd class="flex flex-auto items-center justify-end">
        <!-- Enabled: "bg-indigo-600", Not Enabled: "bg-gray-200" -->
        <button type="button" class="bg-gray-200 flex w-8 cursor-pointer rounded-full p-px ring-1 ring-inset ring-gray-900/5 transition-colors duration-200 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600" role="switch" aria-checked="true" aria-labelledby="timezone-option-label">
          <!-- Enabled: "translate-x-3.5", Not Enabled: "translate-x-0" -->
          <span aria-hidden="true" class="translate-x-0 h-4 w-4 transform rounded-full bg-white shadow-sm ring-1 ring-gray-900/5 transition duration-200 ease-in-out"></span>
        </button>
      </dd>
    </div>
  </dl>
</div>