<script lang="ts">
  import { page } from '$app/stores';
	import { icons } from '$lib/components';
	import { White } from '$lib/components/frames';

  const subMenuActive = 'bg-gray-50 text-indigo-600'
  const subMenuDefault = 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50';

  const subMenuIconActive = 'text-indigo-600'
  const subMenuIconDefault = 'text-gray-400 group-hover:text-indigo-600';

</script>

<White>
  <div class="mx-auto max-w-7xl flex flex-col xl:gap-x-16 xl:px-8">
    <aside class="flex lg:hidden sm:justify-center overflow-x-scroll border-b border-gray-900/5 py-4 ">
      <nav class="flex-none px-4 sm:px-6 xl:px-0">
        <ul role="list" class="flex gap-x-3 gap-y-1 whitespace-nowrap xl:flex-col">
          <li>
            <!-- Current: "bg-gray-50 text-indigo-600", Default: "text-gray-700 hover:text-indigo-600 hover:bg-gray-50" -->
            <a href="/settings/general" class="{$page.url.pathname === '/settings/general' ? subMenuActive : subMenuDefault} group flex gap-x-3 rounded-md py-2 pl-2 pr-3 text-sm leading-6 font-semibold">
              <svg class="h-6 w-6 shrink-0 {$page.url.pathname === '/settings/general' ? subMenuIconActive : subMenuIconDefault}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                {@html icons.adjustmentsHorizontal}
              </svg>
              General
            </a>
          </li>
          <li>
            <a href="/settings/plex" class="{$page.url.pathname === '/settings/plex' ? subMenuActive : subMenuDefault} group flex gap-x-3 rounded-md py-2 pl-2 pr-3 text-sm leading-6 font-semibold">
              <svg class="h-6 w-6 shrink-0 {$page.url.pathname === '/settings/plex' ? subMenuIconActive : subMenuIconDefault}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="4 4 34 34" stroke-width="2.125" stroke="currentColor">
                <g id="Plex"><path d="M20,34h0A14,14,0,0,1,6,20H6A14,14,0,0,1,20,6h0A14,14,0,0,1,34,20h0A14,14,0,0,1,20,34Zm0-23.06H15.06L20,20l-4.94,9.06H20L25.76,20Z"/></g>
              </svg>
              Plex
            </a>
          </li>
          <li>
            <a href="/settings/system" class="{$page.url.pathname === '/settings/system' ? subMenuActive : subMenuDefault} group flex gap-x-3 rounded-md py-2 pl-2 pr-3 text-sm leading-6 font-semibold">
              <svg class="h-6 w-6 shrink-0 {$page.url.pathname === '/settings/system' ? subMenuIconActive : subMenuIconDefault}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                {@html icons.cube}
              </svg>
              System
            </a>
          </li>
          <li>
            <a href="/settings/library" class="{$page.url.pathname === '/settings/library' ? subMenuActive : subMenuDefault} group flex gap-x-3 rounded-md py-2 pl-2 pr-3 text-sm leading-6 font-semibold">
              <svg class="h-6 w-6 shrink-0 {$page.url.pathname === '/settings/library' ? subMenuIconActive : subMenuIconDefault}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                {@html icons.circleStack}
              </svg>
              Library
            </a>
          </li>
        </ul>
      </nav>
    </aside>

    <main class="px-4 py-16 sm:px-6 xl:flex-auto xl:px-0 xl:py-8">
      <div class="mx-auto max-w-2xl space-y-16 sm:space-y-20 xl:mx-0 xl:max-w-none">
        <slot/>
      </div>
    </main>
  </div>
</White>