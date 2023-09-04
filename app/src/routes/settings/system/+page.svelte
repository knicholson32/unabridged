<script lang="ts">
	import { enhance } from "$app/forms";


	import { Switch } from "$lib/components/buttons";

  export let data: import('./$types').PageData;

</script>
<div>
  <h2 class="text-base font-semibold leading-7 text-gray-900">Audible Accounts</h2>
  <p class="mt-1 text-sm leading-6 text-gray-500">Specify how Unabridged should interact with your Audible accounts.</p>

  <dl class="mt-6 space-y-6 divide-y divide-gray-100 border-t border-gray-200 text-sm leading-6">
    <div class="flex pt-6">
      <dt class="flex-none pr-6 font-medium text-gray-900 sm:w-64" id="timezone-option-label">Automatic Sync</dt>
      <dd class="flex flex-auto items-center justify-end">
        <form method="POST" action="?/update" class="flex items-center justify-end gap-x-6" use:enhance>
          <Switch type="submit" valueName="autoSync" value={data.autoSync} />
        </form>
      </dd>
    </div>
    <div class="pt-6 sm:flex">
      <dt class="font-medium text-gray-900 sm:w-64 sm:flex-none sm:pr-6">Full name</dt>
      <dd class="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
        <div class="text-gray-900">Tom Cook</div>
        <button type="button" class="font-semibold text-indigo-600 hover:text-indigo-500">Update</button>
      </dd>
    </div>
  </dl>
</div>

<div>
  <h2 class="text-base font-semibold leading-7 text-gray-900">Download Manager</h2>
  <p class="mt-1 text-sm leading-6 text-gray-500">Configure specifics for the download / process system.</p>

  <ul role="list" class="mt-6 divide-y divide-gray-100 border-t border-gray-200 text-sm leading-6">
    <li class="flex justify-between gap-x-6 py-6">
      <div class="font-medium text-gray-900">Start Paused</div>
      <form method="POST" action="?/update" class="flex items-center justify-end gap-x-6" use:enhance>
        <Switch type="submit" valueName="startPaused" value={data.startPaused} />
      </form>
    </li>
    <li class="flex justify-between gap-x-6 py-6">
      <div class="font-medium text-gray-900">Royal Bank of Canada</div>
      <button type="button" class="font-semibold text-indigo-600 hover:text-indigo-500">Update</button>
    </li>
  </ul>

  <div class="flex border-t border-gray-100 pt-6">
    <button type="button" class="text-sm font-semibold leading-6 text-indigo-600 hover:text-indigo-500"><span aria-hidden="true">+</span> Add another bank</button>
  </div>
</div>

<div>
  <h2 class="text-base font-semibold leading-7 text-gray-900">Integrations</h2>
  <p class="mt-1 text-sm leading-6 text-gray-500">Connect applications to your account.</p>

  <ul role="list" class="mt-6 divide-y divide-gray-100 border-t border-gray-200 text-sm leading-6">
    <li class="flex justify-between gap-x-6 py-6">
      <div class="font-medium text-gray-900">QuickBooks</div>
      <button type="button" class="font-semibold text-indigo-600 hover:text-indigo-500">Update</button>
    </li>
  </ul>

  <div class="flex border-t border-gray-100 pt-6">
    <button type="button" class="text-sm font-semibold leading-6 text-indigo-600 hover:text-indigo-500"><span aria-hidden="true">+</span> Add another application</button>
  </div>
</div>

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