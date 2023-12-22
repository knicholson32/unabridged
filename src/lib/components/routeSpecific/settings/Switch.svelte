<script lang="ts">
	import { Switch } from '$lib/components/buttons';
	import Frame from './Frame.svelte';

	export let value: boolean;
	export let name: string;
	export let title: string;
	export let disabled: boolean = false;
	export let hoverTitle: string = '';
	export let form: { success: boolean; name: string; message: string | undefined } | null = null;
	export let indent = false;
	export let titleImg: string | null = null;
	export let titleLink: string | null = null;

	export let update = () => {};
</script>

<Frame
	{title}
	{hoverTitle}
	{indent}
	{titleImg}
	{titleLink}
	error={form?.success === false && form?.name === name ? form.message ?? null : null}
>
	<Switch
		changed={(b) => {
			update();
		}}
		type="button"
		forceHiddenInput={true}
		{disabled}
		{hoverTitle}
		valueName={name}
		bind:value
	/>
</Frame>
