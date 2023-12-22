import type { AlertSettings, NotificationSettings } from '$lib/types';

export type DisplayType = 'alert' | 'notification';

export type AlertDefinition = {
	id: string;
	text: string;
	type: 'alert';
	settings: AlertSettings;
};

export type NotificationDefinition = {
	id: string;
	text: string;
	type: 'notification';
	settings: NotificationSettings;
};

export type GeneralDefinition = {
	id: string;
	text: string;
	type: DisplayType;
	settings: undefined;
};
