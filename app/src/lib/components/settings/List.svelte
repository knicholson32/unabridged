<script lang="ts">
	import { enhance } from "$app/forms";
	import { beforeNavigate } from "$app/navigation";
	import { Submit } from "$lib/components/buttons";

  let classExport: string = '';

  export let action: string;
	export { classExport as class };
  export let confirmAction: string | null = null;
  export let form: { success: boolean, action: string } | null = null;

  export let submitting = false;
  export let unsavedChanges = false;

  export const update = () => {
    unsavedChanges = true;
  };

  $: {
    form?.success;
    clearChangesFlag();
  }

  const clearChangesFlag = () => {
    if (form?.success === false && form?.action === action) unsavedChanges = true;
    else unsavedChanges = false;
  }
  
</script>

<form method="POST" action={action} use:enhance={({cancel}) => {
  if (confirmAction !== null && !confirm(`Are you sure?\n\n${confirmAction}`)) {
    cancel();
    return;
  }
  submitting = true;
  return async ({ update }) => {
    submitting = false;
    clearChangesFlag();
    update({
      reset: false
    });
  };
}}>

  <div class="{classExport} border-b pb-6">
    <div class="flex items-center gap-x-2">
      <div class="max-w-md">
        <h2 class="text-lg font-semibold leading-7 text-gray-900">
          <slot name="title">Settings</slot>
          {#if unsavedChanges === true}
            <span class="text-gray-300 text-xxs uppercase ml-2">
              Unsaved Changes
            </span>
          {/if}
        </h2>
        <p class="mt-1 text-sm leading-6 text-gray-500">
          <slot name="description"></slot>
        </p>
      </div>
      <div class="flex-grow"></div>
      <div class="sm:mr-3 inline-flex relative">
        <Submit
          class="w-full sm:w-auto" 
          theme={{primary: 'white', done: 'white', fail: 'white'}} 
          actionText={unsavedChanges ? "Save Changes" : "Saved"}
          doneText="Saved"
          actionTextInProgress="Saving" 
          submitting={submitting}
          failed={form?.success === false && form?.action === action}
        />
        {#if unsavedChanges === true}
          <span class="absolute flex h-3 w-3 -mt-1 -right-1">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
          </span>
        {/if}
      </div>
    </div>
    <dl class="mt-6 space-y-6 divide-y divide-gray-100 border-t border-gray-200 text-sm leading-6"><slot/></dl>
  </div>
</form>