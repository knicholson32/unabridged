import type { NotificationAPI, Notification, URLAlert } from '$lib/types';
import * as base64  from 'base-64';
import { writable } from 'svelte/store';
import type { default as Alerts } from './Alerts.svelte';

export { default as Alert } from './Alert.svelte';
export { default as Alerts } from './Alerts.svelte';



export const notificationAPIStore = writable<NotificationAPI>();


/**
 * Create a new notification
 * @param notification the notification to create
 */
export const createNotification = async (notification: Notification) => {
  const response = await fetch('/api/notification', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(notification)
  });
  await updateNotifications(response);
}


/**
 * Show the notifications to the specified alerts component
 * @param alertsComponent the component to display the notifications to
 * @param notifications the notification list
 * @param urgentOnly whether or not to only show the urgent notifications
 */
export const showNotifications = async (alertsComponent: Alerts, notifications: Notification[], urgentOnly = false) => {
  const deleteList: string[] = [];
  for (const notification of notifications) {
    if (urgentOnly && notification.auto_open === false) continue;
    if (alertsComponent.isShowingID(notification.id)) continue;
    switch (notification.issuer) {
      case 'general':
        alertsComponent.showNotification(notification.text, {
          id: notification.id,
          iconPath: notification.icon_path ?? undefined,
          iconColor: notification.icon_color ?? undefined,
          theme: notification.theme,
          subText: notification.sub_text ?? undefined,
          deleteOnlyAfterClose: notification.needs_clearing,
          linger_ms: (notification.linger_time <= 0) ? undefined : notification.linger_time,
        });
        break;
    }
    if (notification.needs_clearing === false) deleteList.push(notification.id);
  }
  await deleteNotifications(deleteList);
}


/**
 * Delete a list of notifications by ID
 * @param deleteList the notifications to delete
 */
export const deleteNotifications = async (deleteList: string[]) => {
  if (deleteList.length > 0) {
    const response = await fetch('/api/notification', {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ids: deleteList })
    });
    await updateNotifications(response);
  }
}

/**
 * Force a fetch and assignment of the notifications from the server
 */
export const updateNotifications = async (response?: Response) => {
  let nData: NotificationAPI;
  if (response !== undefined)
    nData = await response.json() as NotificationAPI;
  else
    nData = await (await fetch('/api/notification')).json() as NotificationAPI;
  notificationAPIStore.set(nData);
}

/**
 * Encode a URLAlert definition to a base64 string to be sent via the search params
 * @param alert the URLAlert to convert
 * @returns the encoded string
 */
export const encodeURLAlert = (alert: URLAlert): string => {
  const str = JSON.stringify(alert);
  console.log('str', str);
  const b64 = base64.encode(str);
  console.log('b64, b64');
  const enc = encodeURIComponent(b64);
  console.log('enc', enc);
  return enc;
  // return encodeURIComponent(base64.encode(JSON.stringify(alert)));
}

/**
 * Decode a string into a URLAlert if possible
 * @param alert the string to decode
 * @returns a URLAlert or null
 */
export const decodeURLAlert = (alert: string | null): URLAlert | null => {
  if (alert === null) return null;
  try {
      const b64 = base64.decode(alert);
      console.log('b64', b64);
    return JSON.parse(b64) as URLAlert; 
  } catch(e) {
    console.log(e);
    console.log(alert);
    return null;
  }
}