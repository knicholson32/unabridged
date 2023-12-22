<script lang="ts">
	let clazz: string = '';
	export { clazz as class };
</script>

<div class="grow bg-gray-100 h-full w-full {clazz}">
	<slot />
</div>
