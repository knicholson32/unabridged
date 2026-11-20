// -------------------------------------------------------------------------------------------------
// Connection and results
// -------------------------------------------------------------------------------------------------

/** How to reach an Audiobookshelf server */
export type Connection = {
	/** Base URL of the server, including any base path (e.g. `http://abs:80` or `https://x/abs`) */
	address: string;
	/** API key, sent as a bearer token. Created in ABS under Settings → API Keys. */
	apiKey: string;
	/** Per-request timeout in milliseconds. Defaults to 5000. */
	timeoutMs?: number;
};

export enum AbsError {
	INVALID_ADDRESS = 'INVALID_ADDRESS',
	NO_API_KEY = 'NO_API_KEY',
	UNREACHABLE = 'UNREACHABLE',
	TIMEOUT = 'TIMEOUT',
	NOT_AUDIOBOOKSHELF = 'NOT_AUDIOBOOKSHELF',
	UNAUTHORIZED = 'UNAUTHORIZED',
	NOT_ADMIN = 'NOT_ADMIN',
	NOT_FOUND = 'NOT_FOUND',
	NOT_A_BOOK_LIBRARY = 'NOT_A_BOOK_LIBRARY',
	PATH_OUTSIDE_LIBRARY = 'PATH_OUTSIDE_LIBRARY',
	SCAN_TIMEOUT = 'SCAN_TIMEOUT',
	ITEM_TIMEOUT = 'ITEM_TIMEOUT',
	UNEXPECTED_RESPONSE = 'UNEXPECTED_RESPONSE'
}

/** Every operation returns a Result instead of throwing */
export type Result<T> =
	| { ok: true; value: T }
	| { ok: false; error: AbsError; message: string; status?: number };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const fail = <T>(error: AbsError, message?: string, status?: number): Result<T> => ({
	ok: false,
	error,
	message: message ?? absErrorToString(error),
	status
});

export const absErrorToString = (e: AbsError): string => {
	switch (e) {
		case AbsError.INVALID_ADDRESS:
			return "The Audiobookshelf URL is not valid. It must start with 'http://' or 'https://'.";
		case AbsError.NO_API_KEY:
			return 'No Audiobookshelf API key is set.';
		case AbsError.UNREACHABLE:
			return 'Could not reach the Audiobookshelf server.';
		case AbsError.TIMEOUT:
			return 'The Audiobookshelf server did not respond in time.';
		case AbsError.NOT_AUDIOBOOKSHELF:
			return 'The server at this URL is not Audiobookshelf.';
		case AbsError.UNAUTHORIZED:
			return 'Audiobookshelf rejected the API key. It may be wrong, expired or inactive.';
		case AbsError.NOT_ADMIN:
			return 'The API key must belong to an Audiobookshelf admin user to scan libraries.';
		case AbsError.NOT_FOUND:
			return 'Audiobookshelf could not find the requested library or item.';
		case AbsError.NOT_A_BOOK_LIBRARY:
			return 'The selected Audiobookshelf library is not a book library.';
		case AbsError.PATH_OUTSIDE_LIBRARY:
			return 'The book is not inside the Unabridged library folder.';
		case AbsError.SCAN_TIMEOUT:
			return 'The Audiobookshelf library scan did not finish in time.';
		case AbsError.ITEM_TIMEOUT:
			return 'Audiobookshelf did not pick up the book in time.';
		case AbsError.UNEXPECTED_RESPONSE:
		default:
			return 'Audiobookshelf returned an unexpected response.';
	}
};

// -------------------------------------------------------------------------------------------------
// API shapes (only the fields Unabridged uses)
// -------------------------------------------------------------------------------------------------

/** `GET /status` (no auth) */
export type ServerStatus = {
	app: string;
	serverVersion: string;
	isInit: boolean;
};

/** `GET /api/me` */
export type User = {
	id: string;
	username: string;
	type: 'root' | 'admin' | 'user' | 'guest';
	isActive: boolean;
};

export type LibraryFolder = {
	id: string;
	/** The folder as the ABS server sees it, e.g. `/audiobooks` */
	fullPath: string;
};

/** `GET /api/libraries` → `libraries[]` */
export type Library = {
	id: string;
	name: string;
	mediaType: 'book' | 'podcast';
	folders: LibraryFolder[];
};

/** `GET /api/libraries/:id/items?minified=1` → `results[]` */
export type LibraryItem = {
	id: string;
	libraryId: string;
	folderId: string;
	/** Absolute path on the ABS server */
	path: string;
	/** Path relative to the library folder, e.g. `Author/Title` */
	relPath: string;
	isMissing: boolean;
	isInvalid: boolean;
	media: {
		metadata: {
			title: string | null;
			subtitle: string | null;
			authorName: string | null;
			seriesName: string | null;
			asin: string | null;
			isbn: string | null;
		};
	};
};

/** `GET /api/libraries/:id/items` */
export type LibraryItemsPage = {
	results: LibraryItem[];
	total: number;
	limit: number;
	page: number;
};

/** `GET /api/libraries/:id/series` → `results[]` */
export type Series = {
	id: string;
	name: string;
	/** Present in list responses; empty for series left behind after their books were removed */
	books?: unknown[];
};

/** `GET /api/tasks` → `tasks[]` */
export type Task = {
	id: string;
	action: string;
	data?: { libraryId?: string } | null;
	isFinished: boolean;
	isFailed: boolean;
	error?: string | null;
};

/** `POST /api/items/:id/scan` → `result` */
export type ItemScanResult = 'NOTHING' | 'ADDED' | 'UPDATED' | 'REMOVED' | 'UPTODATE';

/** Details from a successful connection test */
export type ConnectionInfo = {
	serverVersion: string;
	username: string;
	userType: User['type'];
};
