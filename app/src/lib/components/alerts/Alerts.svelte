<script lang="ts">
	import type { GenerateAlert, NotificationSettings } from "$lib/types";
	import type { TransitionConfig } from "svelte/transition";
	import type { AlertDefinition, GeneralDefinition, NotificationDefinition } from "./types";
  import Alert from "./Alert.svelte";
  import { v4 as uuidv4 } from 'uuid';
	import { flip } from "svelte/animate";

  export let transitionIn: (n: HTMLElement) => TransitionConfig;

  let alerts: GeneralDefinition[] = [];
  const remove = (id: string) => alerts = alerts.filter((a: GeneralDefinition) => a.id !== id);

  export const showAlert: GenerateAlert = (text, settings) => {
    let id = uuidv4();
    if (settings !== undefined && settings.id !== undefined) id = settings.id;
    const alert: AlertDefinition = {
      text: text,
      settings: settings ?? {},
      type: 'alert',
      id: id
    }
    alerts = [...alerts, alert as unknown as GeneralDefinition];
  }

  export const isShowingID = (id: string) => {
    return alerts.findIndex((alert) => alert.id === id) !== -1;
  }

  export const showNotification = (text: string, settings?: NotificationSettings) => {
    let id = uuidv4();
    if (settings !== undefined && settings.id !== undefined) id = settings.id;
    if (isShowingID(id)) return;
    const alert: NotificationDefinition = {
      text: text,
      settings: settings ?? {
        deleteOnlyAfterClose: false
      },
      type: 'notification',
      id: id
    }
    alerts = [...alerts, alert as unknown as GeneralDefinition];
  }

</script>

{#if alerts.length > 0}
  {#each alerts as alert (alert.id)}
    <div animate:flip={{duration: 200}} class="pointer-events-auto w-full max-w-sm">
      <Alert on:close={() => {remove(alert.id)}} definition={alert} transitionIn={transitionIn}/>
    </div>
  {/each}
{/if}