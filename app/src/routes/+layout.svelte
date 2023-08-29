<!-- <script>
  import "../app.css";
</script> -->

<script lang="ts">
  import '../app.css';
  import { page, navigating } from '$app/stores';
  import { onMount } from 'svelte';
  import { setContext, } from 'svelte';
  import type { PrimaryMenu, ProfileMenu, ProfileMenuWithID, GenerateAlert, AlertSettings, NotificationAPI, Notification } from '$lib/types';
  import CircularClose from '$lib/components/decorations/CircularClose.svelte';
  import { EscapeOrClickOutside, KeyBind, UpDownEnter } from '$lib/events';
  import { fade, scale } from 'svelte/transition';
  import { cubicOut, cubicInOut, linear, cubicIn } from 'svelte/easing';
	import Alerts from '$lib/components/alerts/Alerts.svelte';
	import { decodeURLAlert } from '$lib/components/alerts';
	import * as helpers from '$lib/helpers';
	import { afterNavigate, invalidate } from '$app/navigation';
  import * as alerts from '$lib/components/alerts';
	import { browser } from '$app/environment';
  export let data;

  let innerWidth: number;

  // -----------------------------------------------------------------------------------------------
  // Search Bar
  // -----------------------------------------------------------------------------------------------

  let searchBar: HTMLInputElement;
  const focusSearch = () => searchBar.focus();

  // -----------------------------------------------------------------------------------------------
  // Navigation Menu Contents
  // -----------------------------------------------------------------------------------------------

  const menu : PrimaryMenu = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      iconPath: '<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />'
    },
    {
      title: 'Library',
      href: '/library',
      iconPath: '<path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />'
    },
    {
      title: 'Accounts',
      href: '/accounts',
      iconPath: '<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />'
    }
  ];

  const menuActive = 'bg-gray-800 text-white';
  const menuDefault = 'text-gray-400 hover:text-white hover:bg-gray-800';

  const subMenuActive = 'bg-gray-800 text-white';
  const subMenuDefault = 'text-gray-400 hover:text-white hover:bg-gray-800';

  const profileMenu = [
    [{href: '#', newTab: false, title: 'View Profile'}, {href: '#', newTab: false, title: 'Settings'}, {href: '#', newTab: false, title: 'Notifications'}],
  ] as ProfileMenu;

  // -----------------------------------------------------------------------------------------------
  // Navigation Menus
  // -----------------------------------------------------------------------------------------------
  let mobileNavMenuVisible = false;
  $: ariaHiddenMobile = !mobileNavMenuVisible;
  $: ariaHiddenMain = innerWidth < 1024;
  const closeMobileMenu = () => {
    mobileNavMenuVisible = false;
  };
  const openMobileMenu = () => {
    mobileNavMenuVisible = true;
  };
  const mobileMenuFly = (node: HTMLElement) => { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Entering: "transition ease-in-out duration-300 transform"
    //   From: "-translate-x-full"
    //   To: "translate-x-0"
    // Leaving: "transition ease-in-out duration-300 transform"
    //   From: "translate-x-0"
    //   To: "-translate-x-full"
    return {
        delay: 0,
        duration: 300,
        easing: cubicInOut,
        css: (t: number) => `
			    transform: translateX(${(1 - t) * -100}%);
        `
    };
  };

  // -----------------------------------------------------------------------------------------------
  // Profile Menus
  // -----------------------------------------------------------------------------------------------
  // Variables to keep track of the account dropdown menu visibility
  let profileButtonMain: HTMLElement;
  let profileMenuListDesktop: HTMLElement[] = [];
  let profileMenuListMobile: HTMLElement[] = [];
  // Keep track of which link we are 'selected' on if using the arrow keys
  let selectedMenuItem = -1;
  
  // Primary profile menu
  let accountDropdownVisible = false;
  const toggleAccountDropdown = () => {
    accountDropdownVisible = !accountDropdownVisible;
  };
  const closeAccountDropdown = () => {
    accountDropdownVisible = false;
    selectedMenuItem = -1;
  };

  // Key interaction events
  const accountDropdownDownEvent = () => {
    selectedMenuItem = selectedMenuItem + 1;
    if (ariaHiddenMain) {
      if (selectedMenuItem >= profileMenuListMobile.length) selectedMenuItem = profileMenuListMobile.length - 1;
      profileMenuListMobile[selectedMenuItem].focus();
    } else {
      if (selectedMenuItem >= profileMenuListDesktop.length) selectedMenuItem = profileMenuListDesktop.length - 1;
      profileMenuListDesktop[selectedMenuItem].focus();
    }
  };
  const accountDropdownUpEvent = () => {
    selectedMenuItem = selectedMenuItem - 1;
    if (selectedMenuItem < 0) selectedMenuItem = 0;
    if (ariaHiddenMain) {
      profileMenuListMobile[selectedMenuItem].focus();
    } else {
      profileMenuListDesktop[selectedMenuItem].focus();
    }
  };
  const accountDropdownEnterEvent = () => {
    if (selectedMenuItem === -1) return;
    if (ariaHiddenMain) {
      profileMenuListMobile[selectedMenuItem].click();
    } else {
      profileMenuListDesktop[selectedMenuItem].click();
    }
  };

  // Loop through profileMenu and set the IDs correctly
  let profileMenuWithID = profileMenu as ProfileMenuWithID;
  {
    let i = 0;
    for (let section of profileMenuWithID)
      for (let link of section)
        link.id = i++;
  }

  // -----------------------------------------------------------------------------------------------
  // Alerts
  // -----------------------------------------------------------------------------------------------

  let alertsComponent: Alerts;
  const showAlert: GenerateAlert = (...args) => {
    if (alertsComponent === undefined) return;
    // Pass this alert request to the alert system component
    if (alertsComponent !== undefined) alertsComponent.showAlert(...args);
  };

  // Pass the showAlert function to the global context so sub-pages can call showAlert(...) when they
  // need to alert the user using the alert system
  setContext('showAlert', showAlert);

  // Check to see if there is an alert search param in the URL. If so, display that alert.
  const checkForAlert = () => {
    if ($page.url.searchParams.get('alert') !== null) {
      const alert = decodeURLAlert($page.url.searchParams.get('alert'));
      if (alert !== null) showAlert(alert.text, alert.settings);
      helpers.deleteQueries(['alert']);
    }
  }
  afterNavigate(async ({}) => checkForAlert());

  const alertIn = (node: HTMLElement) => { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Entering: "transform ease-out duration-300 transition"
    //   From: "translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
    //   To: "translate-y-0 opacity-100 sm:translate-x-0"
    if (responsiveSM) {
      return {
        delay: 0,
        duration: 300,
        easing: cubicOut,
        css: (t: number) => `
          transform: translateY(${(1 - t) * 0.5}rem);
          opacity: ${t};
        `
      };
    } else {
      return {
      delay: 0,
      duration: 300,
      easing: cubicOut,
      css: (t: number) => `
        transform: translate(${(1 - t) * 0.5}rem, 0rem);
        opacity: ${t};
      `
    };
    }
  }
  
  // -----------------------------------------------------------------------------------------------
  // Notifications
  // -----------------------------------------------------------------------------------------------
  
  let notifications: Notification[] = data.notifications ?? [];
  
  alerts.notificationAPIStore.subscribe(async (nData: NotificationAPI | undefined) => {
    // const nData = await (await fetch('/api/notification')).json() as NotificationAPI;
    if (nData === undefined) return;
    if (nData.ok && nData.notifications !== undefined) {
      notifications = nData.notifications;
    } else {
      notifications = [];
    }
    await alerts.showNotifications(alertsComponent, notifications, true);
  });

  $: notificationsAvailable = notifications?.length ?? 0 > 0;
  $: responsiveSM = innerWidth < 640;

  const showNotifications = async () => {
    await alerts.updateNotifications();
    await alerts.showNotifications(alertsComponent, notifications);
  }

  onMount(() => {
    // Initially show the urgent notifications
    alerts.showNotifications(alertsComponent, notifications, true);
    if (browser) {
      setInterval(async () => {
        console.log('Updating notifications!');
        await alerts.updateNotifications();
      }, 120000); // Update every 2 minutes
    }
  });


</script>

<svelte:window bind:innerWidth />

<svelte:head>
  {#if $page.data.seo === undefined}
    <title>Unabridged</title>
    <meta name="description" content="Unabridged">
  {:else}
    <title>Unabridged | {$page.data.seo.title}</title>
    <meta name="description" content="{$page.data.seo?.description}">
  {/if}
</svelte:head>


<div>
  <!-- Off-canvas menu for mobile, show/hide based on off-canvas menu state. -->
  {#if mobileNavMenuVisible}
    <div class="relative z-20 lg:hidden" role="dialog" aria-modal="true">
      <!-- DONE
        Off-canvas menu backdrop, show/hide based on off-canvas menu state.
        Entering: "transition-opacity ease-linear duration-300"
          From: "opacity-0"
          To: "opacity-100"
        Leaving: "transition-opacity ease-linear duration-300"
          From: "opacity-100"
          To: "opacity-0"
      -->
      <div transition:fade="{{duration: 300, easing: linear}}" class="fixed inset-0 bg-gray-900/80"></div>

      <div class="fixed inset-0 flex">
        <!-- DONE
          Off-canvas menu, show/hide based on off-canvas menu state.

          Entering: "transition ease-in-out duration-300 transform"
            From: "-translate-x-full"
            To: "translate-x-0"
          Leaving: "transition ease-in-out duration-300 transform"
            From: "translate-x-0"
            To: "-translate-x-full"
        -->
        <div transition:mobileMenuFly use:EscapeOrClickOutside={{callback: closeMobileMenu}} class="relative mr-16 flex w-full max-w-xs flex-1">
          <!-- DONE
            Close button, show/hide based on off-canvas menu state.

            Entering: "ease-in-out duration-300"
              From: "opacity-0"
              To: "opacity-100"
            Leaving: "ease-in-out duration-300"
              From: "opacity-100"
              To: "opacity-0"
          -->
          <div transition:fade="{{duration: 300, easing: cubicInOut}}" class="absolute left-full top-0 flex w-16 justify-center pt-5">
            <button on:click={closeMobileMenu} type="button" class="-m-2.5 p-2.5">
              <span class="sr-only">Close sidebar</span>
              <svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Sidebar component, swap this element with another sidebar if you like -->
          <div class="flex grow flex-col gap-y-5 overflow-y-auto bg-[#1A1A1A] px-6 pb-4 ring-1 ring-white/10">
            <div class="flex h-16 shrink-0 items-center">
              <img class="h-8 w-auto" src="/logo.png" alt="Unabridged">
            </div>
            <nav class="flex flex-1 flex-col">
              <ul role="list" class="flex flex-1 flex-col gap-y-7">
                <li>
                  <ul role="list" class="-mx-2 space-y-1">
                    {#each menu as m}
                      <li>
                      <!-- Current: "bg-gray-800 text-white", Default: "text-gray-400 hover:text-white hover:bg-gray-800" -->
                      <a href="{m.href}" on:click={closeMobileMenu} class="{$page.url.pathname===m.href ? menuActive : menuDefault} group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold">
                        <svg class="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                          {@html m.iconPath}
                        </svg>
                        {m.title}
                      </a>
                    </li>
                    {/each}
                  </ul>
                </li>
                <!-- Secondary navigation -->
                {#if $page.data.sideMenus !== undefined}
                <!-- Loop through each sideMenu -->
                  {#each $page.data.sideMenus as menu}
                    <li>
                      <div class="text-xs font-semibold leading-6 text-gray-400">{menu.title}</div>
                      <ul role="list" class="-mx-2 mt-2 space-y-1">
                        {#each menu.elements as element}
                          <li>
                            <!-- Current: "bg-gray-800 text-white", Default: "text-gray-400 hover:text-white hover:bg-gray-800" -->
                            <a href="{element.href}" class="{$page.url.pathname===element.href ? subMenuActive : subMenuDefault} group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold">
                              {#if element.miniTitle !== undefined}
                                <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-[0.625rem] font-medium text-gray-400 border-gray-700 bg-gray-800 group-hover:text-white">{element.miniTitle}</span>
                              {:else if element.iconURL !== undefined}
                                <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full overflow-hidden text-[0.625rem] font-medium text-gray-400 border-gray-700 bg-gray-800 group-hover:text-white">
                                  <img src="{element.iconURL}" alt="{element.title} icon"/>
                                </span>
                              {:else}
                                <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-[0.625rem] font-medium text-gray-400 border-gray-700 bg-gray-800 group-hover:text-white">{element.title.splice(0, 2)}</span>
                              {/if}
                              <span class="truncate">{element.title}</span>
                            </a>
                          </li>
                        {/each}
                      </ul>
                    </li>
                  {/each}
                {/if}
                <li class="mt-auto">
                  <a href="#" class="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-400 hover:bg-gray-800 hover:text-white">
                    <svg class="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Static sidebar for desktop -->
  <div class="hidden lg:fixed lg:inset-y-0 lg:z-20 lg:flex lg:w-72 lg:flex-col">
    <!-- Sidebar component, swap this element with another sidebar if you like -->
    <div class="flex grow flex-col gap-y-5 overflow-y-auto bg-[#1A1A1A] px-6 pb-4">
      <div class="flex h-16 shrink-0 items-center">
        <img class="h-8 w-auto" src="/logo.png" alt="Unabridged D">
      </div>
      <nav class="flex flex-1 flex-col">
        <ul role="list" class="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" class="-mx-2 space-y-1">
              {#each menu as m}
                <li>
                  <!-- Current: "bg-gray-800 text-white", Default: "text-gray-400 hover:text-white hover:bg-gray-800" -->
                  <a href="{m.href}" class="{$page.url.pathname===m.href ? menuActive : menuDefault} group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold">
                    <svg class="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                      {@html m.iconPath}
                    </svg>
                    {m.title}
                  </a>
                </li>
              {/each}
            </ul>
          </li>
          <!-- Secondary navigation -->
          {#if $page.data.sideMenus !== undefined}
          <!-- Loop through each sideMenu -->
            {#each $page.data.sideMenus as menu}
              <li>
                <div class="inline-flex w-full">
                  <div class="text-xs font-semibold leading-6 text-gray-400 grow">{menu.title}</div>
                  {#if menu.button !== undefined}
                    <a href="{menu.button.href}" class="shrink-0 text-gray-400 hover:text-gray-200">
                      <svg class="h-6 w-6 p-0.5 m-auto" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                        {@html menu.button.iconPath}
                      </svg>
                    </a>
                  {/if}
                </div>
                <ul role="list" class="-mx-2 mt-2 space-y-1">
                  {#each menu.elements as element}
                    <li>
                      <!-- Current: "bg-gray-800 text-white", Default: "text-gray-400 hover:text-white hover:bg-gray-800" -->
                      <a href="{element.href}" class="{$page.url.pathname===element.href ? subMenuActive : subMenuDefault} group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold">
                        {#if element.miniTitle !== undefined}
                        <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-[0.625rem] font-medium text-gray-400 border-gray-700 bg-gray-800 group-hover:text-white">{element.miniTitle}</span>
                        {:else if element.iconURL !== undefined}
                        <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full overflow-hidden text-[0.625rem] font-medium text-gray-400 border-gray-700 bg-gray-800 group-hover:text-white">
                          <img src="{element.iconURL}" alt="{element.title} icon"/>
                        </span>
                        {:else}
                        <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-[0.625rem] font-medium text-gray-400 border-gray-700 bg-gray-800 group-hover:text-white">{element.title.splice(0, 2)}</span>
                        {/if}
                        <span class="truncate">{element.title}</span>
                      </a>
                    </li>
                  {/each}
                </ul>
              </li>
            {/each}
          {/if}
          <li class="mt-auto">
            <a href="#" class="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-400 hover:bg-gray-800 hover:text-white">
              <svg class="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </a>
          </li>
        </ul>
      </nav>
    </div>
  </div>

  <div class="lg:pl-72">
    <div class="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      <button on:click={openMobileMenu} type="button" class="-m-2.5 p-2.5 text-gray-700 lg:hidden">
        <span class="sr-only">Open sidebar</span>
        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      <!-- Separator -->
      <div class="h-6 w-px bg-gray-900/10 lg:hidden" aria-hidden="true"></div>

      <div class="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <form class="relative flex flex-1" action="/library" method="GET">
          <label for="search-field" class="sr-only">Search</label>
          <svg class="pointer-events-none absolute inset-y-0 left-0 h-full w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd" />
          </svg>
          <input bind:this={searchBar} use:KeyBind={{binds: ['Meta', 'k'], on_bind: focusSearch}} id="search-field" name="s" class="block h-full w-full border-0 py-0 pl-8 pr-0 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm" placeholder="Search..." type="search">
        </form>
        <div class="flex items-center gap-x-4 lg:gap-x-6">
          <button on:click={showNotifications} type="button" class="relative -m-2.5 p-2.5 text-gray-400 hover:text-gray-500">
            <span class="sr-only">View notifications</span>
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            {#if notificationsAvailable}
              <span class="absolute -translate-x-[0.8rem] translate-y-[0.6rem] top-0 right-0 flex h-2 w-2">
                <span class="absolute animate-ping inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
              </span>
            {/if}
          </button>

          <!-- Separator -->
          <div class="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-900/10" aria-hidden="true"></div>

          <!-- Profile dropdown -->
          <div class="relative">
            <button type="button" bind:this={profileButtonMain} on:click={toggleAccountDropdown} class="-m-1.5 flex items-center p-1.5" id="user-menu-button" aria-expanded="false" aria-haspopup="true">
              <span class="sr-only">Open user menu</span>
              <img class="h-8 w-8 rounded-full bg-gray-50" src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="">
              <span class="hidden lg:flex lg:items-center">
                <span class="ml-4 text-sm font-semibold leading-6 text-gray-900" aria-hidden="true">Tom Cook</span>
                <svg class="ml-2 h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
                </svg>
              </span>
            </button>

            <!--
              Dropdown menu, show/hide based on menu state.

              Entering: "transition ease-out duration-100"
                From: "transform opacity-0 scale-95"
                To: "transform opacity-100 scale-100"
              Leaving: "transition ease-in duration-75"
                From: "transform opacity-100 scale-100"
                To: "transform opacity-0 scale-95"
            -->
            {#if accountDropdownVisible}
              <!-- <div class="absolute right-0 z-10 mt-2.5 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none" role="menu" aria-orientation="vertical" aria-labelledby="user-menu-button" tabindex="-1"> -->
              <div in:scale="{{duration: 100, opacity: 0.95, start: 0.95, easing: cubicOut}}" out:scale="{{duration: 75, opacity: 0.95, start: 0.95, easing: cubicOut}}" use:EscapeOrClickOutside={{except: profileButtonMain, callback: closeAccountDropdown}} class="absolute right-0 z-10 mt-2.5 w-32 origin-top-right" role="menu" aria-orientation="vertical" aria-labelledby="options-menu-button" tabindex="-1">
                <div in:fade="{{duration: 100, easing: cubicOut}}" out:fade="{{duration: 75, easing: cubicOut}}" use:UpDownEnter={{up: accountDropdownUpEvent, down: accountDropdownDownEvent, enter: accountDropdownEnterEvent}} class="divide-y divide-gray-200 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none antialiase">
                  <!-- Create Profile Menu -->
                  {#each profileMenuWithID as section}
                    <div class="py-1" role="none">
                      {#each section as link}
                        <!-- Active: "bg-gray-50", Not Active: "" -->
                        <a bind:this={profileMenuListDesktop[link.id]} href="{link.href}" target={link.newTab?'_blank':''} class="unstyled font-medium hover:bg-gray-100 hover:text-gray-900 text-gray-700 block px-4 py-2 text-sm !no-underline" role="menuitem" tabindex="-1" id="options-menu-item-{link.id}">{link.title}</a>
                      {/each}
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        </div>
      </div>

      <div class="pointer-events-none fixed sm:absolute bottom-4 right-auto left-0 sm:bottom-auto sm:top-20 sm:right-4 sm:left-auto pl-4 pr-4 sm:pl-0 sm:pr-0 w-full flex flex-col items-center gap-y-2 sm:items-end">
        <Alerts bind:this={alertsComponent} transitionIn={alertIn} />
      </div>
    </div>

    <main class="">
      <div class="">
        <slot />
      </div>
    </main>
  </div>
</div>


