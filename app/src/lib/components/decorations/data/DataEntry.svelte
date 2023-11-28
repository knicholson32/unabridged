<script lang="ts">

  export let title: string;
  export let data: string | null = null;

</script>


<div class="px-4 py-6 sm:px-6 lg:px-8 text-center">
  <p class="text-sm select-none font-medium leading-6 text-gray-900">{title}</p>
  <p class="mt-2 flex items-baseline gap-x-2 justify-center">
    <span class="text-lg select-none font-semibold tracking-tight text-black">
      {#if data !== null}
        {data}
      {:else}
        <slot/>
      {/if}
    </span>
  </p>
</div>