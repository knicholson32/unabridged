<script lang="ts">
	import icons from '$lib/components/icons';

	export let value: string;
	export let disabled: boolean;
	export let title: string;
	export let name: string;
	export let placeholder: string;
	export let mono: boolean = false;

	export let input = () => {};

	let type = 'password';

	export let allowShowPassword = true;
	let passwordVisible = false;
	const updateVisibility = () => {
		passwordVisible = !passwordVisible;
		if (passwordVisible) type = 'text';
		else type = 'password';
	};
</script>

<div class="flex items-center justify-end min-w-[16em]">
	<input
		{disabled}
		{title}
		on:input={input}
		{...{ type }}
		{name}
		class="block w-full rounded-md {mono ? 'font-mono' : ''} {allowShowPassword
			? 'rounded-r-none border-r-0'
			: ''} border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:ring-gray-200 sm:text-sm sm:leading-6"
		{placeholder}
		bind:value
	/>
	{#if allowShowPassword}
		<button
			on:click={updateVisibility}
			type="button"
			class="relative -ml-px inline-flex items-center gap-x-1.5 rounded-r-md px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
		>
			<svg
				class="-ml-0.5 h-5 w-5 text-gray-400"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="currentColor"
			>
				{@html passwordVisible ? icons.eyeSlash : icons.eye}
			</svg>
		</button>
	{/if}
</div>
