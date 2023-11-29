<script lang="ts">
  export let title: string;
  export let error: string | null = null;
  export let success: string | null = null;
  export let link: {href: string, title: string, icon?: string} | null = null;
</script>

<div class="sm:mr-3 mt-2 sm:mt-0" >
  <div class="pt-6 flex items-center">
    <dt class="pr-6 font-medium text-gray-900 sm:w-64" id="timezone-option-label">
      <div class="flex-none sm:flex sm:gap-x-2 ">
        {title}
        {#if link !== null}
          <p class="text-xs leading-6 italic text-indigo-400">
            <a class="inline-flex items-center" href="{link.href}" target="_blank">
              {link.title}
              {#if link.icon !== undefined}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="ml-1 w-4 h-4">
                  {@html link.icon}
                </svg>
              {/if}
            </a>
          </p>
        {/if}
      </div>
      {#if error !== null}
        <p class="text-xs leading-6 text-red-500">{error}</p>
      {/if}
      {#if success !== null}
        <p class="text-xs leading-6 text-green-500">{success}</p>
      {/if}
    </dt>
    <dd class="flex flex-auto items-center justify-end">
      <div class="flex items-center justify-end gap-x-6">
        <slot/>
      </div>
    </dd>
  </div>
</div>