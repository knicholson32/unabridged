import type { IPlexClientDetails } from 'plex-oauth';
import type { Prisma } from '@prisma/client';

// -------------------------------------------------------------------------------------------------
// Plex Responses
// -------------------------------------------------------------------------------------------------

export type Base = {
	MediaContainer: {
		size: number;
		allowCameraUpload: boolean;
		allowChannelAccess: boolean;
		allowMediaDeletion: boolean;
		allowSharing: boolean;
		allowSync: boolean;
		allowTuners: boolean;
		backgroundProcessing: boolean;
		certificate: boolean;
		companionProxy: boolean;
		countryCode: string;
		diagnostics: string;
		eventStream: boolean;
		friendlyName: string;
		hubSearch: boolean;
		itemClusters: boolean;
		livetv: number;
		machineIdentifier: string;
		mediaProviders: boolean;
		multiuser: boolean;
		myPlex: boolean;
		myPlexMappingState: string;
		myPlexSigninState: string;
		myPlexSubscription: boolean;
		myPlexUsername: string;
		offlineTranscode: number;
		ownerFeatures: string;
		platform: string;
		platformVersion: string;
		pluginHost: boolean;
		pushNotifications: boolean;
		readOnlyLibraries: boolean;
		streamingBrainABRVersion: number;
		streamingBrainVersion: number;
		sync: boolean;
		transcoderActiveVideoSessions: number;
		transcoderAudio: boolean;
		transcoderLyrics: boolean;
		transcoderPhoto: boolean;
		transcoderSubtitles: boolean;
		transcoderVideo: boolean;
		transcoderVideoBitrates: string;
		transcoderVideoQualities: string;
		transcoderVideoResolutions: string;
		updatedAt: number;
		updater: boolean;
		version: string;
		voiceSearch: boolean;
		Directory: {
			count: number;
			key: string;
			title: string;
		}[];
	};
};

export type Directory = {
	allowSync: boolean;
	art: string;
	composite: string;
	filters: boolean;
	refreshing: boolean;
	thumb: string;
	key: string;
	type: 'artist' | 'photo' | 'movie';
	title: string;
	agent: string;
	scanner: string;
	language: string;
	uuid: string;
	updatedAt: number;
	createdAt: number;
	scannedAt: number;
	content: boolean;
	directory: boolean;
	contentChangedAt: number;
	hidden: number;
	Location: {
		id: number;
		path: string;
	}[];
};

export type Sections = {
	MediaContainer: {
		size: number;
		allowSync: boolean;
		title1: string;
		Directory: Directory[];
	};
};

export enum SearchType {
	ARTIST = 8,
	ALBUM = 9,
	TRACK = 10
}

export type SearchMetadata = {
	ratingKey: string;
	key: string;
	guid: string;
	type: string;
	title: string;
	titleSort: string;
	summary: string;
	parentKey: string;
	parentTitle: string;
	index: number;
	year: number;
	viewCount: number;
	lastViewedAt: number;
	thumb: string;
	addedAt: number;
	updatedAt: number;
	Genre: {
		tag: string;
	}[];
};

export type SearchResult = {
	MediaContainer: {
		size: number;
		allowSync: boolean;
		art: string;
		identifier: string;
		librarySectionID: number;
		librarySectionTitle: string;
		librarySectionUUID: string;
		mediaTagPrefix: string;
		mediaTagVersion: number;
		nocache: boolean;
		thumb: string;
		title1: string;
		title2: string;
		viewGroup: string;
		viewMode: number;
		Metadata: SearchMetadata[];
	};
};

export type IdentityResult = {
	MediaContainer: {
		size: number;
		claimed: boolean;
		machineIdentifier: string;
		version: string;
	};
};

// -------------------------------------------------------------------------------------------------
// Plex Websocket Notifications
// -------------------------------------------------------------------------------------------------

export type Notification =
	| StatusNotification
	| ActivityNotification
	| ProgressNotification
	| PlayingNotification;

export interface StatusNotification {
	NotificationContainer: {
		type: 'status';
		size: number;
		StatusNotification: {
			title: string;
			description: string;
			notificationName: 'LIBRARY_UPDATE';
		}[];
	};
}

export interface ActivityNotification {
	NotificationContainer: {
		type: 'activity';
		size: number;
		ActivityNotification: {
			event: 'started' | 'updated' | 'ended';
			uuid: string;
			Activity: {
				uuid: string;
				type: 'provider.subscriptions.process' | 'library.update.section';
				cancellable: boolean;
				userID: number;
				title: string;
				subtitle: string;
				progress: number;
				Context?: {
					librarySectionID: string;
				};
			};
		}[];
	};
}

export interface ProgressNotification {
	NotificationContainer: {
		type: 'progress';
		size: number;
		ProgressNotification: {
			message: string;
		}[];
	};
}

export interface PlayingNotification {
	NotificationContainer: {
		type: 'playing';
		size: number;
		PlaySessionStateNotification: {
			sessionKey: string;
			clientIdentifier: string;
			guid: string;
			ratingKey: string;
			url: string;
			key: string;
			viewOffset: number;
			state: 'buffering' | 'paused' | 'playing';
		}[];
	};
}

// -------------------------------------------------------------------------------------------------
// Plex Library Types
// -------------------------------------------------------------------------------------------------

export enum Method {
	GET = 'get',
	POST = 'post',
	PUT = 'put',
	DELETE = 'delete'
}

export type ResourceResult = {
	status: number;
	value: unknown;
} | null;

export type SeriesType = Prisma.SeriesGetPayload<{ include: { books: true } }>;
export type BookType = Prisma.BookGetPayload<{ include: { authors: true } }>;

// -------------------------------------------------------------------------------------------------
// Plex OAuth
// -------------------------------------------------------------------------------------------------

export const CLIENT_INFORMATION: IPlexClientDetails = {
	clientIdentifier: 'Unabridged-Container', // This is a unique identifier used to identify your app with Plex.
	product: 'Server Instance', // Name of your application
	device: 'Docker Container', // The type of device your application is running on
	version: process.env.GIT_COMMIT?.substring(0, 7) ?? 'Unknown', // Version of your application
	platform: 'Server', // Optional - Platform your application runs on - Defaults to 'Web'
	urlencode: true // Optional - If set to true, the output URL is url encoded, otherwise if not specified or 'false', the output URL will return as-is
};
