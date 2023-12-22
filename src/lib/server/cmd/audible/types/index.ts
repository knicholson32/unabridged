import type { Prisma } from '@prisma/client';

export type BookFromCLI = {
	asin: string;
	authors: string;
	genres: string;
	is_finished: boolean;
	date_added: string;
	narrators: string | undefined;
	percent_complete: number;
	cover_url: string | undefined;
	purchase_date: string;
	rating: string;
	num_ratings: number;
	release_date: string;
	runtime_length_min: number | undefined;
	series_title: string | undefined;
	series_sequence: string | undefined;
	subtitle: string | undefined;
	title: string;
};

export type Book = Prisma.BookGetPayload<{
	include: {
		authors: true;
		genres: true;
		series: true;
		narrators: true;
	};
}>;

export type Library = BookFromCLI[];

export enum ProfileCreationError {
	NO_ERROR = 'NO_ERROR',
	CLI_TIMEOUT = 'CLI_TIMEOUT',
	INVALID_GENERATED_URL = 'INVALID_GENERATED_URL',
	USER_TIMEOUT = 'USER_TIMEOUT',
	URL_DID_NOT_WORK = 'URL_DID_NOT_WORK',
	PROCESS_NOT_STARTED = 'PROCESS_NOT_STARTED',
	ACCOUNT_ALREADY_EXISTS = 'ACCOUNT_ALREADY_EXISTS',
	UNKNOWN_STATE = 'UNKNOWN_STATE'
}

export const profileCreationErrorToMessage = (e: ProfileCreationError): string => {
	switch (e) {
		case ProfileCreationError.NO_ERROR:
			return 'No error';
		case ProfileCreationError.CLI_TIMEOUT:
			return 'Backend timeout';
		case ProfileCreationError.INVALID_GENERATED_URL:
			return 'An invalid URL was generated';
		case ProfileCreationError.USER_TIMEOUT:
			return 'The user took too long to respond';
		case ProfileCreationError.URL_DID_NOT_WORK:
			return 'The user-provided URL did not work';
		case ProfileCreationError.PROCESS_NOT_STARTED:
			return 'The sign-in process was never started';
		case ProfileCreationError.ACCOUNT_ALREADY_EXISTS:
			return 'The account already exists';
		default:
			return 'An unknown error occurred';
	}
};

export type AudibleConfig = {
	website_cookies: {
		'session-id': string;
		'ubid-main': string;
		'x-main': string;
		'at-main': string;
		'sess-at-main': string;
	};
	adp_token: string;
	access_token: string;
	refresh_token: string;
	device_private_key: string;
	store_authentication_cookie: {
		cookie: string;
	};
	device_info: {
		device_name: string;
		device_serial_number: string;
		device_type: string;
	};
	customer_info: {
		account_pool: string;
		user_id: string;
		home_region: string;
		name: string;
		given_name: string;
	};
	expires: number;
	locale_code: string;
	with_username: boolean;
	activation_bytes: string | null;
};

export type AmazonAcctData = {
	user_id: string;
	name: string;
	shipping_address: {
		country: string;
		country_code: string;
		street_address: string;
		locality: string;
		postal_code: string;
		region: string;
	};
	mobile_number: string;
	postal_code: string;
	email: string;
};

export type AmazonChapterData = {
	content_metadata: {
		chapter_info: {
			brandIntroDurationMs: number;
			brandOutroDurationMs: number;
			chapters: {
				length_ms: number;
				start_offset_ms: number;
				start_offset_sec: number;
				title: string;
				chapters?: {
					length_ms: number;
					start_offset_ms: number;
					start_offset_sec: number;
					title: string;
				}[];
			}[];
			is_accurate: true;
			runtime_length_ms: number;
			runtime_length_sec: number;
		};
		content_reference: {
			acr: string;
			asin: string;
			codec: string;
			content_format: string;
			content_size_in_bytes: number;
			file_version: string;
			marketplace: string;
			sku: string;
			tempo: string;
			version: string;
		};
		last_position_heard: {
			last_updated: string;
			position_ms: number;
			status: string;
		};
	};
	response_groups: (
		| 'alwaysreturned'
		| 'last_position_heard'
		| 'chapter_info'
		| 'content_reference'
	)[];
};

export enum BookDownloadError {
	NO_ERROR = 'NO_ERROR',
	AUDIBLE_LOCKED = 'AUDIBLE_LOCKED',
	NO_PROFILE_WITH_AUTHCODE = 'NO_PROFILE_WITH_AUTHCODE',
	BOOK_NOT_FOUND = 'BOOK_NOT_FOUND',
	CANCELED = 'CANCELED',
	NETWORK_ERROR = 'NETWORK_ERROR',
	NO_PROFILE = 'NO_PROFILE'
}

export const bookDownloadErrorToString = (e: BookDownloadError): string => {
	switch (e) {
		case BookDownloadError.NO_ERROR:
			return 'No error';
		case BookDownloadError.AUDIBLE_LOCKED:
			return 'The audible CLI is locked';
		case BookDownloadError.NO_PROFILE_WITH_AUTHCODE:
			return 'None of the profiles have authcodes downloaded';
		case BookDownloadError.BOOK_NOT_FOUND:
			return 'The audible book does not exist';
		case BookDownloadError.CANCELED:
			return 'The book download process was canceled';
		case BookDownloadError.NETWORK_ERROR:
			return 'A network issue exists that is preventing download';
		case BookDownloadError.NO_PROFILE:
			return 'No profile exists to download this book';
		default:
			return 'An unknown error occurred';
	}
};
