<script lang="ts">
  import Frame from './Frame.svelte';
  
  export let value: string;
  export let options: string[];
  export let name: string;
  export let title: string;
  export let hoverTitle: string = '';
  export let disabled: boolean = false;
  export let mono: boolean = false;
  export let form: { success: boolean, name: string, message: string | undefined } | null = null;

  export let update = () => {};

</script>

<Frame title={title} error={(form?.success === false && form?.name === name) ? form.message ?? null : null}>
  <div class="-my-2">
    <select
      on:change={update}
      disabled={disabled}
      name={name}
      title={hoverTitle}
      class="mt-2 block w-full min-w-[16em] {mono ? 'font-mono' : ''} rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:ring-gray-200 sm:text-sm sm:leading-6">
      {#each options as option}
        <option selected={value === option} value={option}>{option.charAt(0).toUpperCase() + option.slice(1)}</option>
      {/each}
    </select>
  </div>
</Frame>