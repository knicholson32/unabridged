<script lang="ts">
  import Frame from './Frame.svelte';
  
  export let value: string;
  export let name: string;
  export let title: string;
  export let placeholder: string = title;
  export let hoverTitle: string = '';
  export let disabled: boolean = false;
  export let mono: boolean = false;
  export let form: { success: boolean, name: string, message: string | undefined } | null = null;

  export let update = () => {};

</script>

<Frame title={title} error={(form?.success === false && form?.name === name) ? form.message ?? null : null}>
  <div class="-my-2">
    <input 
      disabled={disabled} 
      title={hoverTitle} 
      on:input={update}
      type="text"
      name={name} 
      class="block w-full min-w-[16em] {mono ? 'font-mono' : ''} rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:ring-gray-200 sm:text-sm sm:leading-6" 
      placeholder={placeholder} 
      bind:value={value}
    >
  </div>
</Frame>