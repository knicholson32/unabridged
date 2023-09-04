<script lang="ts">
  import { page } from '$app/stores';

  const subMenuActive = 'bg-gray-50 text-indigo-600'
  const subMenuDefault = 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50';

  const subMenuIconActive = 'text-indigo-600'
  const subMenuIconDefault = 'text-gray-400 group-hover:text-indigo-600';

</script>

<div class="mx-auto max-w-7xl bg-white xl:flex xl:gap-x-16 xl:px-8">
  <aside class="flex justify-center overflow-x-auto border-b border-gray-900/5 py-4 xl:block xl:w-64 xl:flex-none xl:border-0 xl:py-8">
    <nav class="flex-none px-4 sm:px-6 xl:px-0">
      <ul role="list" class="flex gap-x-3 gap-y-1 whitespace-nowrap xl:flex-col">
        <li>
          <!-- Current: "bg-gray-50 text-indigo-600", Default: "text-gray-700 hover:text-indigo-600 hover:bg-gray-50" -->
          <a href="/settings/general" class="{$page.url.pathname === '/settings/general' ? subMenuActive : subMenuDefault} group flex gap-x-3 rounded-md py-2 pl-2 pr-3 text-sm leading-6 font-semibold">
            <svg class="h-6 w-6 shrink-0 {$page.url.pathname === '/settings/general' ? subMenuIconActive : subMenuIconDefault}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            General
          </a>
        </li>
        <li>
          <a href="/settings/system" class="{$page.url.pathname === '/settings/system' ? subMenuActive : subMenuDefault} group flex gap-x-3 rounded-md py-2 pl-2 pr-3 text-sm leading-6 font-semibold">
            <svg class="h-6 w-6 shrink-0 {$page.url.pathname === '/settings/system' ? subMenuIconActive : subMenuIconDefault}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a7.464 7.464 0 01-1.15 3.993m1.989 3.559A11.209 11.209 0 008.25 10.5a3.75 3.75 0 117.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 01-3.6 9.75m6.633-4.596a18.666 18.666 0 01-2.485 5.33" />
            </svg>
            System
          </a>
        </li>
        <li>
          <a href="#" class="{$page.url.pathname === '/settings/notifications' ? subMenuActive : subMenuDefault} group flex gap-x-3 rounded-md py-2 pl-2 pr-3 text-sm leading-6 font-semibold">
            <svg class="h-6 w-6 shrink-0 {$page.url.pathname === '/settings/notifications' ? subMenuIconActive : subMenuIconDefault}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            Notifications
          </a>
        </li>
        <li>
          <a href="#" class="{$page.url.pathname === '/settings/security' ? subMenuActive : subMenuDefault} group flex gap-x-3 rounded-md py-2 pl-2 pr-3 text-sm leading-6 font-semibold">
            <svg class="h-6 w-6 shrink-0 {$page.url.pathname === '/settings/security' ? subMenuIconActive : subMenuIconDefault}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
            </svg>
            Security
          </a>
        </li>
        <li>
          <a href="#" class="{$page.url.pathname === '/settings/billing' ? subMenuActive : subMenuDefault} group flex gap-x-3 rounded-md py-2 pl-2 pr-3 text-sm leading-6 font-semibold">
            <svg class="h-6 w-6 shrink-0 {$page.url.pathname === '/settings/billing' ? subMenuIconActive : subMenuIconDefault}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
            Billing
          </a>
        </li>
        <li>
          <a href="#" class="{$page.url.pathname === '/settings/members' ? subMenuActive : subMenuDefault} group flex gap-x-3 rounded-md py-2 pl-2 pr-3 text-sm leading-6 font-semibold">
            <svg class="h-6 w-6 shrink-0 {$page.url.pathname === '/settings/members' ? subMenuIconActive : subMenuIconDefault}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            Team members
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