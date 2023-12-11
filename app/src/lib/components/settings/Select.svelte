<script lang="ts">
  import Frame from './Frame.svelte';
  
  export let value: string;
  export let options: ({title: string, value: string, unset?: boolean} | string)[];
  export let name: string;
  export let title: string;
  export let hoverTitle: string = '';
  export let disabled: boolean = false;
  export let mono: boolean = false;
  export let badge: boolean | null = null;
  export let form: { success: boolean, name: string, message: string | undefined } | null = null;

  export let update = () => {};

</script>

<style>
  select:has(option:disabled:checked) {
    color: #9DA3AE;
  }
</style>

<Frame title={title} badge={badge} error={(form?.success === false && form?.name === name) ? form.message ?? null : null}>
  <div class="-my-2">
    <select
      on:change={update}
      disabled={disabled}
      name={name}
      title={hoverTitle}
      class="block w-full min-w-[16em] {mono ? 'font-mono' : ''} shadow-sm select:disabled:text rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:ring-gray-200 sm:text-sm sm:leading-6">
      {#each options as option}
        {#if typeof option === 'string'}
          <option selected={value === option} value={option}>{option.charAt(0).toUpperCase() + option.slice(1)}</option>
        {:else}
          {#if option.unset !== undefined && option.unset === true}
            <option disabled selected={value === option.value} value={option.value}>{option.title}</option>
          {:else}
            <option selected={value === option.value} value={option.value}>{option.title}</option>
          {/if}
        {/if}
      {/each}
    </select>
  </div>
</Frame>