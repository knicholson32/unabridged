<script lang="ts">
	import Frame from './Frame.svelte';

	export let value: number;
	export let name: string;
	export let title: string;
	export let showWrapper: { start?: string; end?: string } | null = null;
	export let placeholder: number = 0;
	export let hoverTitle: string = '';
	export let disabled: boolean = false;
	export let min: number | undefined = undefined;
	export let max: number | undefined = undefined;
	export let form: { success: boolean; name: string; message: string | undefined } | null = null;

	export let update = () => {};
</script>

<Frame
	{title}
	{hoverTitle}
	error={form?.success === false && form?.name === name ? form.message ?? null : null}
>
	<!-- <div class="-my-2 flex rounded-md border-0 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6">
    <span class="flex select-none items-center pl-3 text-gray-500 sm:text-sm">http://</span>
    <input 
      disabled={disabled} 
      title={hoverTitle} 
      on:input={_update}
      type="number"
      name={name} 
      class="block w-full min-w-[16em] py-1.5 border-0 placeholder:text-gray-400  disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:ring-gray-200 sm:text-sm sm:leading-6" 
      placeholder={placeholder} 
      bind:value={value}
    >
  </div> -->

	<!-- disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:ring-gray-200 -->

	<div
		class="-my-2 flex rounded-md shadow-sm ring-1 min-w-[16em] {disabled
			? 'cursor-not-allowed bg-gray-50 text-gray-500 ring-gray-200'
			: 'ring-gray-300'} ring-inset focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md"
	>
		{#if showWrapper !== null && showWrapper.start !== undefined}
			<span class="flex select-none items-center pl-3 text-gray-500 sm:text-sm"
				>{showWrapper.start}</span
			>
		{/if}
		<input
			{disabled}
			title={hoverTitle}
			on:input={update}
			type="number"
			{min}
			{max}
			{name}
			bind:value
			class="block flex-1 border-0 {showWrapper !== null
				? 'w-[5em] text-center px-1'
				: ''} disabled:cursor-not-allowed disabled:text-gray-500 bg-transparent py-1.5 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
			placeholder={placeholder.toLocaleString()}
		/>
		{#if showWrapper !== null && showWrapper.end !== undefined}
			<span class="flex select-none items-center pr-3 text-gray-500 sm:text-sm"
				>{showWrapper.end}</span
			>
		{/if}
	</div>
</Frame>

<style>
	input[type='number']::-webkit-inner-spin-button,
	input[type='number']::-webkit-outer-spin-button {
		opacity: 1;
	}
	input[type='number']:disabled::-webkit-inner-spin-button,
	input[type='number']:disabled::-webkit-outer-spin-button {
		opacity: 0;
		display: none;
	}
</style>
