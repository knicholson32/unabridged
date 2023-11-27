<script lang="ts">
  import Frame from './Frame.svelte';
  
  export let value: string;
  export let name: string;
  export let title: string;
  export let placeholder: string = title;
  export let hoverTitle: string = '';
  export let small = false;
  export let leadingText: { t: string, error: boolean } | null = null;
  export let link: {href: string, title: string, icon?: string} | null = null;
  export let disabled: boolean = false;
  export let mono: boolean = false;
  export let error: boolean = false;
  export let form: { success: boolean, name: string, message: string | undefined } | null = null;

  export let update = () => {};
  export let updatedContents = (e: string) => {};

  const _update = (e: Event & { currentTarget: EventTarget & HTMLInputElement; }) => {
    // updatedContents(value);
    console.log(e);
    update();
  }

</script>

<Frame title={title} link={link} error={(form?.success === false && form?.name === name) ? form.message ?? null : null}>
  <div class="-my-2 flex flex-col-reverse sm:flex-row sm:inline-flex sm:items-center">
    {#if leadingText !== null}
      <p class="mr-2 text-xxs font-mono select-none text-right {leadingText.error ? 'text-red-400' : 'text-gray-400'}">
        {leadingText.t}
      </p>
    {/if}
    <input 
      disabled={disabled} 
      title={hoverTitle} 
      on:input={_update}
      on:keyup={() => { updatedContents(value) }}
      type="text"
      name={name} 
      class="block {small ? 'w-[12em]' : 'min-w-[16em]'} {mono ? 'font-mono' : ''} rounded-md border-0 py-1.5 text-gray-900 shadow-sm placeholder:text-gray-400 ring-1 ring-inset {error ? 'ring-red-300 focus:ring-red-600' : 'ring-gray-300 focus:ring-indigo-600'}  focus:ring-2 focus:ring-inset  disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:ring-gray-200 sm:text-sm sm:leading-6" 
      placeholder={placeholder} 
      bind:value={value}
    >
  </div>
</Frame>