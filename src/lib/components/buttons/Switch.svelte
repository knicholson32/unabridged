<script lang="ts">
	export let value: boolean;
	export let valueName = 'value';
	export let type: 'button' | 'submit' | 'reset' | null | undefined = 'button';
	export let title = '';
	export let hoverTitle: string | undefined = undefined;
	export let disabled = false;

	export let forceHiddenInput = false;

	export let changed = (b: boolean) => {};

	let click = () => {
		value = !value;
		changed(value);
	};
</script>

<div class="flex items-center">
	{#if title !== ''}
		<span class="mr-2 text-sm" id="annual-billing-label">
			<span class="text-gray-600">{title}</span>
		</span>
	{/if}
	<!-- Enabled: "bg-indigo-600", Not Enabled: "bg-gray-200" -->
	{#if type === 'submit' || forceHiddenInput === true}
		<input type="hidden" bind:value name={valueName} />
	{/if}
	<button
		{disabled}
		on:click={click}
		{type}
		title={hoverTitle}
		class="shadow-sm rounded-full {value
			? disabled
				? 'bg-gray-200'
				: 'bg-indigo-600'
			: 'bg-gray-200'} disabled:cursor-not-allowed relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
		role="switch"
		aria-checked="false"
		aria-labelledby="annual-billing-label"
	>
		<!-- Enabled: "translate-x-5", Not Enabled: "translate-x-0" -->
		<span
			aria-hidden="true"
			class="{value
				? 'translate-x-5'
				: 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
		/>
	</button>
</div>
