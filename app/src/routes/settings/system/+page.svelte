<script lang="ts">
	import { beforeNavigate } from "$app/navigation";
	import { icons } from "$lib/components";
	import * as Settings from "$lib/components/settings";
  import cronstrue from 'cronstrue';

  export let data: import('./$types').PageData;
  export let form: import('./$types').ActionData;

  // System
  let systemUpdate: () => {};
  let systemUnsavedChanges = false;
  let cronEnable = data.settingValues['system.cron.enable'];
  let cron = data.settingValues['system.cron'];
  let cronString = '';
  let cronError = false;
  try {
    cronString = cronstrue.toString(cron);
    cronError = false;
  } catch(e: unknown) {
    cronString = e as string;
    cronError = true;
  }

  const updateCronText = (cron: string) => {
    try {
      cronString = cronstrue.toString(cron);
      cronError = false;
    } catch(e: unknown) {
      cronString = e as string;
      cronError = true;
    }
    console.log(cron, cronString);
  }

  // Debug
  let debugUpdate: () => {};
  let debugUnsavedChanges = false;
  let debug = data.settingValues['system.debug'];

  // Utilities
  beforeNavigate(({ cancel }) => {
    if (systemUnsavedChanges || debugUnsavedChanges) {
      if (!confirm('Are you sure you want to leave this page? You have unsaved changes that will be lost.')) {
        cancel();
      }
    }
  });

</script>

<!-- System -->
<Settings.List class="" form={form} action="?/updateSystem" bind:unsavedChanges={systemUnsavedChanges} bind:update={systemUpdate}>
  <span slot="title">System</span>
  <span slot="description">Configure System Settings.</span>

  <Settings.Switch name="system.cron.enable" form={form} title="Enable Scheduled Processing" update={systemUpdate} bind:value={cronEnable} 
    hoverTitle={'Whether or not to allow Unabridged to do certain tasks on a schedule (like sync library data or trigger Plex events).'} />

  <Settings.Input name="system.cron" form={form} mono={true} title="Schedule Cron" update={systemUpdate} bind:value={cron} 
    disabled={cronEnable === false}
    placeholder="0 4 * * *"
    updatedContents={updateCronText}
    leadingText={{t: cronString, error: cronError}}
    bind:error={cronError}
    small={true}
    hoverTitle={cronEnable ? 'A cron string that describes when scheduled tasks should be performed' : 'Disabled because scheduled processing is disabled'}/>
    <!-- link={{href: `https://crontab.guru/#${cron.replaceAll(' ', '_')}`, title: 'Online Cron Editor', icon: icons.arrowTopRightOnSquare}} -->

</Settings.List>

<!-- Debug -->
<Settings.List class="" form={form} action="?/updateDebug" bind:unsavedChanges={debugUnsavedChanges} bind:update={debugUpdate}>
  <span slot="title">Debug</span>
  <span slot="description">General debugging features and logs.</span>

  <Settings.Switch name="system.debug" form={form} title="Enable Debug" update={debugUpdate} bind:value={debug} 
    hoverTitle={'Whether or not to enable general debugging features and logs'} />

  

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