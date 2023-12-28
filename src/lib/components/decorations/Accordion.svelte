<script lang="ts">
	import { cubicInOut } from 'svelte/easing';

	let clazz: string = '';
	export let heightRem: number;
	export { clazz as class };

	const reveal = (node: HTMLElement) => {
		return {
			delay: 0,
			duration: 100,
			easing: cubicInOut,
			css: (t: number) => `
			    max-height: ${t * heightRem}rem;
        `
		};
	};

	export let visible: boolean;
</script>

{#if visible}
	<div in:reveal class="overflow-hidden">
		<div class={clazz}>
			<slot />
		</div>
	</div>
{/if}
