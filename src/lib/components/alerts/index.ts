import type { NotificationAPI, Notification } from '$lib/types';
import * as base64 from 'base-64';
import { writable } from 'svelte/store';
import type { default as Alerts } from './Alerts.svelte';
import * as dateFns from 'date-fns';

export { default as Alert } from './Alert.svelte';
export { default as Alerts } from './Alerts.svelte';

// export const notificationAPIStore = writable<NotificationAPI>();

// /**
//  * Create a new notification
//  * @param notification the notification to create
//  */
// export const createNotification = async (notification: Notification) => {
//   const response = await fetch('/api/notification', {
//     method: 'POST',
//     headers: {
//       'Accept': 'application/json',
//       'Content-Type': 'application/json'
//     },
//     body: JSON.stringify(notification)
//   });
//   await updateNotifications(response);
// }

/**
 * Show the notifications to the specified alerts component
 * @param alertsComponent the component to display the notifications to
 * @param notifications the notification list
 * @param urgentOnly whether or not to only show the urgent notifications
 */
export const showNotifications = async (
	alertsComponent: Alerts,
	notifications: Notification[],
	urgentOnly = false
) => {
	console.log('showNotifications', alertsComponent, notifications, urgentOnly);
	if (alertsComponent === undefined) return;
	const deleteList: string[] = [];
	for (const notification of notifications) {
		if (urgentOnly && notification.auto_open === false) continue;
		if (alertsComponent.isShowingID(notification.id)) continue;
		switch (notification.issuer) {
			case 'audible.download':
				alertsComponent.showNotification(notification.text, {
					id: notification.id,
					theme: notification.theme,
					iconURL: notification.identifier ?? undefined,
					subText:
						notification.sub_text !== null
							? dateFns.formatDistance(new Date(notification.sub_text), Date.now(), {
									includeSeconds: true,
									addSuffix: true
							  })
							: undefined,
					deleteOnlyAfterClose: notification.needs_clearing,
					linger_ms: notification.linger_time <= 0 ? undefined : notification.linger_time
				});
				break;
			case 'account.sync':
			case 'general':
			case 'plex.scan.result':
				alertsComponent.showNotification(notification.text, {
					id: notification.id,
					iconPath: notification.icon_path ?? undefined,
					iconColor: notification.icon_color ?? undefined,
					theme: notification.theme,
					subText: notification.sub_text ?? undefined,
					deleteOnlyAfterClose: notification.needs_clearing,
					linger_ms: notification.linger_time <= 0 ? undefined : notification.linger_time
				});
				break;
		}
		if (notification.needs_clearing === false) deleteList.push(notification.id);
	}
	await deleteNotifications(deleteList);
};

/**
 * Delete a list of notifications by ID
 * @param deleteList the notifications to delete
 */
export const deleteNotifications = async (deleteList: string[]) => {
	if (deleteList.length > 0) {
		await fetch('/api/notification', {
			method: 'DELETE',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ ids: deleteList })
		});
	}
};

// /**
//  * Force a fetch and assignment of the notifications from the server
//  */
// export const updateNotifications = async (response?: Response) => {
//   let nData: NotificationAPI;
//   if (response !== undefined)
//     nData = await response.json() as NotificationAPI;
//   else {
//     nData = await (await fetch('/api/notification')).json() as NotificationAPI;
//   }
//   notificationAPIStore.set(nData);
//
