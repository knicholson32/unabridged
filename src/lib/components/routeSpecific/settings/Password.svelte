<script lang="ts">
	import { Password } from '$lib/components/input';
	import Frame from './Frame.svelte';

	export let value: string;
	export let name: string;
	export let title: string;
	export let placeholder: string = title;
	export let successMessage: string | null = null;
	export let errorMessage: string | null = null;
	export let hoverTitle: string = '';
	export let mono: boolean = false;
	export let disabled: boolean = false;
	export let form: { success: boolean; name: string; message: string | undefined } | null = null;

	export let update = () => {};
</script>

<Frame
	{title}
	{hoverTitle}
	error={form?.success === false && form?.name === name
		? form.message ?? null
		: errorMessage !== null
		? errorMessage
		: null}
	success={successMessage}
>
	<div class="-my-2 flex flex-col-reverse gap-2 sm:flex-row sm:inline-flex sm:items-center">
		<slot />
		<Password input={update} {disabled} title={hoverTitle} {mono} {name} {placeholder} bind:value />
	</div>
</Frame>
