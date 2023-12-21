<script lang="ts">
  let clazz: string = '';
	export { clazz as class };
  export let value: number | null;
  export let done: boolean = true;
  export let bgColor = 'bg-gray-800';
  $: colors = done ? 'bg-green-600 text-white' : bgColor + ' text-white';
</script>

<div class="{clazz} shrink-0 cursor-default select-none flex h-8 w-8 items-center transition-colors {colors} rounded-full overflow-hidden  justify-center">
  {#if done}
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
      <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
    </svg>
  {:else}
    <p class="tabular-nums lining-nums pb-[0.188rem]">{value === null ? '-' : value}</p>
  {/if}
</div>