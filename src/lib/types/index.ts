import type { Prisma } from '@prisma/client';
import type * as validators from './prisma';

// -------------------------------------------------------------------------------------------------
// Country Codes
// -------------------------------------------------------------------------------------------------

export type CountryCode = 'us' | 'ca' | 'uk' | 'au' | 'fr' | 'de' | 'jp' | 'it' | 'in';
export const countryCodes = [
	{ code: 'us' satisfies CountryCode, name: 'United States' },
	{ code: 'ca' satisfies CountryCode, name: 'Canada' },
	{ code: 'uk' satisfies CountryCode, name: 'United Kingdom' },
	{ code: 'au' satisfies CountryCode, name: 'Australia' },
	{ code: 'fr' satisfies CountryCode, name: 'France' },
	{ code: 'de' satisfies CountryCode, name: 'Germany' },
	{ code: 'jp' satisfies CountryCode, name: 'Japan' },
	{ code: 'it' satisfies CountryCode, name: 'Italy' },
	{ code: 'in' satisfies CountryCode, name: 'India' }
];

// -------------------------------------------------------------------------------------------------
// Primary Menu
// -------------------------------------------------------------------------------------------------

export type PrimaryMenu = {
	href: string;
	title: string;
	iconPath: string;
}[];

// -------------------------------------------------------------------------------------------------
// Side Menu
// -------------------------------------------------------------------------------------------------

export type LinkMenuItem = {
	type: 'link';
	href: string;
	title: string;
	miniTitle?: string;
	iconURL?: string;
	iconSVG?: string;
	// buttonColor: string
};

export type SideMenu = {
	title: string;
	elements: LinkMenuItem[];
	button?: {
		iconPath: string;
		href: string;
		usePost?: boolean;
	};
};

// -------------------------------------------------------------------------------------------------
// Profile Menu
// -------------------------------------------------------------------------------------------------

export type ProfileMenuEntry = {
	href: string;
	title: string;
	newTab: boolean;
};

export type ProfileMenuEntryWithID = {
	id: number;
	href: string;
	title: string;
	newTab: boolean;
};

export type ProfileMenu = ProfileMenuEntry[][];
export type ProfileMenuWithID = ProfileMenuEntryWithID[][];

// -------------------------------------------------------------------------------------------------
// DB Source Types
// -------------------------------------------------------------------------------------------------

export enum SourceType {
	AUDIBLE = 'audible'
}

// -------------------------------------------------------------------------------------------------
// Notifications / Alerts
// -------------------------------------------------------------------------------------------------

export type ModalTheme = 'info' | 'ok' | 'warning' | 'error';

// TODO: Maybe alerts should be consolidated into notifications?
export type AlertSettings = {
	subText?: string;
	linger_ms?: number;
	iconPath?: string;
	iconColor?: string;
	theme?: ModalTheme;
	borderColor?: string;
	id?: string;
};

export type NotificationSettings = {
	subText?: string;
	linger_ms?: number;
	iconPath?: string;
	iconColor?: string;
	iconURL?: string;
	theme?: ModalTheme;
	id?: string;
	deleteOnlyAfterClose: boolean;
};

export type GenerateAlert = (text: string, settings?: AlertSettings) => void;

export type Issuer =
	| 'general'
	| 'audible.download'
	| 'abs.scan.result'
	| 'account.sync';

export type Notification = Prisma.NotificationGetPayload<{}> & {
	theme: ModalTheme; // This is a string in the DB, so we overwrite it here so it is strongly typed
	issuer: Issuer; // This is a string in the DB, so we overwrite it here so it is strongly typed
};

// -------------------------------------------------------------------------------------------------
// Process Queue
// -------------------------------------------------------------------------------------------------

export type ProcessQueue = Prisma.ProcessQueueGetPayload<{}>;

export enum ProcessType {
	BOOK = 'BOOK'
}

export type ProcessQueueBOOK = Prisma.ProcessQueueGetPayload<{
	include: typeof validators.processQueueBOOKInclude;
}>;

// export namespace Process {

//     export interface Header {
//         id: string,
//         r: boolean,
//         d: boolean
//     };

//     export type Settings = { [K in SettingsSet<TypeName, 'progress'>]: ObjectType<K> };

//     export namespace Book {

//         // Process Result -------------------------------------------
//         export interface Result extends Header {
//             result: ProcessError
//         }

//         // Progress Incremental Data --------------------------------
//         export enum Task {
//             DOWNLOAD = 'd',
//             PROCESS = 'p'
//         }
//         interface _progress_base extends Header {
//             t: Task // Task
//         }

//         export type Progress = Download | Process;

//         export interface Download extends _progress_base {
//             p: number,          // Progress
//             mb?: number,        // MB Downloaded
//             tb?: number,        // Total MB
//             s?: number,         // Speed
//             t: Task.DOWNLOAD    // Task of Download
//         }

//         export interface Process extends _progress_base {
//             p: number,          // Progress
//             s?: number,         // Speed
//             t: Task.PROCESS     // Task of Progress
//         }
//     }
// }

// // -------------------------------------------------------------------------------------------------
// // Progress
// // -------------------------------------------------------------------------------------------------

// export namespace Progress {

//     export type Packet = Start | InProgress | Done;

//     interface Header {
//         id: string,
//         type: 'start' | 'in_progress' | 'done'
//     }

//     export interface Start extends Header {
//         type: 'start'
//     }

//     export interface InProgress extends Header {
//         type: 'in_progress',
//         message?: string
//         progress: number,
//     }

//     export interface Done extends Header {
//         type: 'done',
//         message?: string,
//         success: boolean,
//         data?: any
//     }
// }

// -------------------------------------------------------------------------------------------------
// Progress
// -------------------------------------------------------------------------------------------------

export type UpdateProgress = () => void;
export type PageNeedsProgress = () => void;

export enum ProcessError {
	NO_ERROR = 'NO_ERROR',
	AUDIBLE_LOCKED = 'AUDIBLE_LOCKED',
	BOOK_NOT_FOUND = 'BOOK_NOT_FOUND',
	CANCELED = 'CANCELED',
	NETWORK_ERROR = 'NETWORK_ERROR',
	NO_PROFILE = 'NO_PROFILE',
	NO_PROFILE_WITH_AUTHCODE = 'NO_PROFILE_WITH_AUTHCODE',
	NO_FOLDER = 'NO_FOLDER',
	DESTINATION_NOT_WRITABLE = 'DESTINATION_NOT_WRITABLE',
	INVALID_FILE = 'INVALID_FILE',
	CONVERSION_ERROR = 'CONVERSION_ERROR',
	COULD_NOT_SAVE = 'COULD_NOT_SAVE',
	NOT_AUTHORIZED = 'NOT_AUTHORIZED',
	NOT_DOWNLOADABLE = 'NOT_DOWNLOADABLE',
}

export const processErrorToStringShort = (p: ProcessError) => {
	switch (p) {
		case ProcessError.NO_ERROR:
			return 'Success';
		case ProcessError.AUDIBLE_LOCKED:
			return 'Audible Locked';
		case ProcessError.BOOK_NOT_FOUND:
			return 'Unknown Book';
		case ProcessError.CANCELED:
			return 'Canceled by User';
		case ProcessError.NETWORK_ERROR:
			return 'Network Error';
		case ProcessError.NO_PROFILE:
			return 'No Profile';
		case ProcessError.NO_PROFILE_WITH_AUTHCODE:
			return 'No Authcode';
		case ProcessError.NO_FOLDER:
			return 'Download Error';
		case ProcessError.DESTINATION_NOT_WRITABLE:
			return 'No Write Permission';
		case ProcessError.INVALID_FILE:
			return 'Invalid File';
		case ProcessError.CONVERSION_ERROR:
			return 'Conversion Error';
		case ProcessError.COULD_NOT_SAVE:
			return 'Save Error';
		case ProcessError.NOT_AUTHORIZED:
			return 'Not Authorized';
		case ProcessError.NOT_DOWNLOADABLE:
			return 'Not Downloadable';
		default:
			return 'Unknown error';
	}
};

export const processErrorToStringLong = (p: ProcessError) => {
	switch (p) {
		case ProcessError.NO_ERROR:
			return 'Success';
		case ProcessError.AUDIBLE_LOCKED:
			return 'The Audible CLI is locked, which happens when a profile is being added. Finish or cancel the profile add to unlock the Audible CLI.';
		case ProcessError.BOOK_NOT_FOUND:
			return 'This book does not appear to exist in the library.';
		case ProcessError.CANCELED:
			return 'This download / conversion was canceled before it completed.';
		case ProcessError.NETWORK_ERROR:
			return 'A network issue exists that is preventing download.';
		case ProcessError.NO_PROFILE:
			return 'There is no profile that owns this book, therefore it could not be downloaded.';
		case ProcessError.NO_PROFILE_WITH_AUTHCODE:
			return 'There is no profile with authorization to download this book.';
		case ProcessError.NO_FOLDER:
			return 'Something went wrong while downloading this book; no files were saved.';
		case ProcessError.DESTINATION_NOT_WRITABLE:
			return 'The destination folder was not writable. Check library settings.';
		case ProcessError.INVALID_FILE:
			return 'The file to convert is not a valid file.';
		case ProcessError.CONVERSION_ERROR:
			return "Something went wrong while converting this book's audio file.";
		case ProcessError.COULD_NOT_SAVE:
			return "Something went wrong while copying this book's audio file to storage.";
		case ProcessError.NOT_AUTHORIZED:
			return "This account source is not authorized. Please sign-in again.";
		case ProcessError.NOT_DOWNLOADABLE:
			return "Audible does not let any account with this book download it, for example a catalog title (Audible Plus) whose access has ended. If you have since bought it, sync the account and try again.";
		default:
			return 'An unknown and unexpected error has occurred.';
	}
};

export type ConnectionTestResult = {
	success: boolean;
	message: string;
	source: string;
};

// -------------------------------------------------------------------------------------------------
// Library
// -------------------------------------------------------------------------------------------------

export namespace Cron {
	export type Record = {
		version: 'v1' | 'v2' | 'v3'; // v3: Plex results removed, Audiobookshelf results added
		libSync: number; // Number of libraries that were synced
		booksAdded: number; // Number of books that were added during the library sync
		booksUpdated: number; // Number of books whose metadata was updated during the library sync
		startTime: number; // When the cron started
		endTime: number; // When the cron finished
		absTest?: ConnectionTestResult; // Results of the Audiobookshelf connection test (absent in older records)
		absScan?: { success: boolean; message: string }; // Results of the Audiobookshelf scan and link
	};
}

export { default as API } from './api';
export { default as Event } from './event';
