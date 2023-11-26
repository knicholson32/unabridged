<script lang="ts">
  export let title: string;
  export let error: string | null = null;
</script>

<div class="sm:mr-3 mt-2 sm:mt-0" >
  <div class="pt-6 sm:flex items-center">
    <dt class="flex-none pr-6 font-medium text-gray-900 sm:w-64" id="timezone-option-label">
      {title}
      {#if error !== null}
        <p class="text-xs leading-6 text-red-500">{error}</p>
      {/if}
    </dt>
    <dd class="flex flex-auto items-center justify-end">
      <div class="flex items-center justify-end gap-x-6">
        <slot/>
      </div>
    </dd>
  </div>
</div>