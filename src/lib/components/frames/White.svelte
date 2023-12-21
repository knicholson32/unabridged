<script lang="ts">
  let clazz: string = '';
	export { clazz as class };
</script>

<div class="grow bg-white h-full w-full {clazz}">
  <slot/>
</div>