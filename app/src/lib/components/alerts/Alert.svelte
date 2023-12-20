<script lang="ts">
	import { fade, type TransitionConfig } from "svelte/transition";
	import type { AlertDefinition, GeneralDefinition, NotificationDefinition } from "./types";
  import { onDestroy, createEventDispatcher } from 'svelte';
  import CircularClose from "$lib/components/decorations/CircularClose.svelte";
  // import { updateNotifications } from './';
  import icons from '$lib/components/icons';

  export let transitionIn: (n: HTMLElement) => TransitionConfig;
  export let definition: GeneralDefinition;

  let defAsAlert: AlertDefinition;
  let defAsNotification: NotificationDefinition;

  const theme = (definition as unknown as AlertDefinition).settings.theme ?? 'info';
  let bg: string;
  let defIconColor: string;
  let textColor: string;
  let subtextColor: string;
  let defIconPath: string;
  let ring: string;
  if (definition.type === 'alert') {
    // ALERT
    switch(theme) {
      case 'info':
        bg = 'bg-gray-200/80';
        defIconColor = 'text-gray-500';
        textColor = 'text-gray-800';
        subtextColor = 'text-gray-600';
        ring = 'ring-black';
        defIconPath = icons.info;
        break;
      case 'ok':
        bg = 'bg-green-200/80';
        defIconColor = 'text-green-700';
        textColor = 'text-green-800';
        subtextColor = 'text-green-800';
        ring = 'ring-green-100';
        defIconPath = icons.info;
        break;
      case 'error':
        bg = 'bg-red-200/80';
        defIconColor = 'text-red-700';
        textColor = 'text-red-800';
        subtextColor = 'text-red-600';
        ring = 'ring-red-100';
        defIconPath = icons.notAllowed;
        break;
      case 'warning':
        bg = 'bg-yellow-200/80';
        defIconColor = 'text-yellow-500';
        textColor = 'text-yellow-800';
        subtextColor = 'text-yellow-600';
        ring = 'ring-yellow-100';
        defIconPath = icons.warning;
        break;
    }
  } else {
    // NOTIFICATION
    switch(theme) {
      case 'info':
        bg = 'bg-white';
        defIconColor = 'text-gray-500';
        textColor = 'text-black';
        subtextColor = 'text-gray-400';
        ring = 'ring-black';
        defIconPath = icons.info;
        break;
      case 'ok':
        bg = 'bg-white';
        defIconColor = 'text-green-500';
        textColor = 'text-black';
        subtextColor = 'text-gray-400';
        ring = 'ring-black';
        defIconPath = icons.info;
        break;
      case 'error':
        bg = 'bg-white';
        defIconColor = 'text-red-500';
        textColor = 'text-black';
        subtextColor = 'text-gray-400';
        ring = 'ring-black';
        defIconPath = icons.notAllowed;
        break;
      case "warning":
        bg = 'bg-white';
        defIconColor = 'text-yellow-500';
        textColor = 'text-black';
        subtextColor = 'text-gray-400';
        ring = 'ring-black';
        defIconPath = icons.warning;
        break;
    }
  }
  
  // Create the dispatcher that will let this alert tell the container when it has been closed
  const dispatch = createEventDispatcher();

  // Define some variables
  let progress = 0;
  let interval: number;

  // Make sure the interval is removed if this component is removed
  onDestroy(() => clearInterval(interval));

  // Create a function that tells the parent container that this alert should be closed
  const close = async () => {
    console.log('close');
    clearInterval(interval);
    if (definition.type === 'notification' && defAsNotification.settings.deleteOnlyAfterClose === true) {
      await fetch('/api/notification', {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: [definition.id] })
      });
    }
    dispatch('close');
  }

  // Declare some functions for managing pausing and unpausing
  const pauseProgress = () => clearInterval(interval);

  const unpauseProgress = () => {
    if (progress > 0.75) progress = 0.75;
    if (definition.type === 'alert') {
      defAsAlert = definition as unknown as AlertDefinition;
      if (defAsAlert.settings.linger_ms !== undefined && defAsAlert.settings.linger_ms !== 0) {
        let progressIncrement = 50 / defAsAlert.settings.linger_ms;
        clearInterval(interval);
        interval = setInterval(() => {
          progress += progressIncrement;
          if (progress >= 1) {
            progress = 1;
            close();
          }
        }, 50);
      }
    } else {
      defAsNotification = definition as unknown as NotificationDefinition;
      if (defAsNotification.settings.linger_ms !== undefined && defAsNotification.settings.linger_ms !== 0) {
        let progressIncrement = 50 / defAsNotification.settings.linger_ms;
        clearInterval(interval);
        interval = setInterval(() => {
          progress += progressIncrement;
          if (progress >= 1) {
            progress = 1;
            close();
          }
        }, 50);
      }
    }
  }

  // Start the progress countdown
  unpauseProgress();

</script>

<div role="link" tabindex="0" on:mouseenter={pauseProgress} on:mouseleave={unpauseProgress} in:transitionIn out:fade={{duration: 200}}>
  {#if definition.type === 'alert'}
    <div class="overflow-hidden rounded-lg shadow-xl backdrop-blur-md {bg} ring-1 {ring} ring-opacity-5">
      <div class="p-4">
        <div class="flex items-start select-none">
            <div class="flex-shrink-0">
              <svg class="h-6 w-6 {defAsAlert.settings.iconColor ?? defIconColor}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                {@html defAsAlert.settings.iconPath ?? defIconPath}
              </svg>
            </div>
            <div class="ml-3 w-0 flex-1 pt-0.5">
              <p class="text-sm font-medium {textColor}">{@html defAsAlert.text}</p>
              {#if defAsAlert.settings.subText !== undefined}
                  <p class="mt-1 text-sm {subtextColor}">{@html defAsAlert.settings.subText}</p>
              {/if}
            </div>
            <div class="ml-4 flex flex-shrink-0">
              <CircularClose on:click={close} value={progress}/>
          </div>
        </div>
      </div>
    </div>
  {:else}
    <div class=" overflow-hidden rounded-lg shadow-lg {bg} ring-1 {ring} ring-opacity-5">
      <div class="p-4">
        <div class="flex items-start select-none">
            <div class="flex-shrink-0">
              {#if defAsNotification.settings.iconURL !== undefined}
                <img class="h-6 w-6 rounded-sm overflow-hidden" src="{defAsNotification.settings.iconURL}" alt="">
              {:else}
                <svg class="h-6 w-6 {defAsNotification.settings.iconColor ?? defIconColor}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                  {@html defAsNotification.settings.iconPath ?? defIconPath}
                </svg>
              {/if}
            </div>
            <div class="ml-3 w-0 flex-1 pt-0.5">
              <p class="text-sm font-medium {textColor}">{@html defAsNotification.text}</p>
              {#if defAsNotification.settings.subText !== undefined}
                  <p class="mt-1 text-sm {subtextColor}">{@html defAsNotification.settings.subText}</p>
              {/if}
            </div>
            <div class="ml-4 flex flex-shrink-0">
              <CircularClose on:click={close} value={progress}/>
            </div>
        </div>
      </div>
    </div>
  {/if}
</div>