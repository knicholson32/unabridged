<script lang="ts">
  // https://svelte.dev/repl/29c1026dda3c47a187bd21afa0782df1?version=4.2.0
  import { createEventDispatcher } from 'svelte'

  export let value: string;
  export let required = true;
  export let noDataText = 'No Data';

  let textArea: HTMLTextAreaElement;
  let basicText: HTMLDivElement;

  const dispatch = createEventDispatcher()
  let editing = false;

  function edit() {
    const ogHeight = basicText.clientHeight;
    height = ogHeight;
    editing = true;
  }

  function submit() {
		dispatch('submit', value);
    editing = false;
  }

  let height = 0;

  function keydown(event: KeyboardEvent) {
    height = 0;
    height = textArea.scrollHeight;
    if (event.key == 'Escape') {
      event.preventDefault();
      editing = false;
    }
  }

	
	function focus(element: HTMLElement) {
		element.focus()
	}
</script>

{#if editing}
  <form on:submit|preventDefault={submit}>
    <textarea class="text-sm border-transparent focus:border-transparent focus:ring-0" on:keydown={keydown} bind:this={textArea} bind:value on:blur={submit} {required} use:focus style="height: {height}px;"/>
  </form>
{:else}
  <div bind:this={basicText} on:click={edit} on:keyup={() => {}} tabindex=-1 role="textbox">
    {#if value === ''}
      <span class="text-xs opacity-30">{noDataText}</span>
      <svg class="inline-flex w-4 h-4 cursor-pointer opacity-30 relative bottom-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
      </svg>
    {:else}
      {@html value.replaceAll('\n','<br/>')}
      <svg class="inline-flex w-4 h-4 cursor-pointer opacity-50 relative bottom-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
      </svg>
    {/if}
  </div>
{/if}

<style>
  textarea {
    width: 100%;
    border: none;
    background: none;
    font-size: inherit;
    color: inherit;
    font-weight: inherit;
    text-align: inherit;
    box-shadow: none;
    padding-left: 0px;
    padding-bottom: 0px;
    padding-right: 0px;
    padding-top: 0px;
    /* padding-top: 0.375rem; */
  }
</style>
