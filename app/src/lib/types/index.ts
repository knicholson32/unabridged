import type { Prisma } from "@prisma/client";


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
]

// -------------------------------------------------------------------------------------------------
// Primary Menu
// -------------------------------------------------------------------------------------------------

export type PrimaryMenu = {
    href: string,
    title: string,
    iconPath: string
}[];

// -------------------------------------------------------------------------------------------------
// Side Menu
// -------------------------------------------------------------------------------------------------

export type LinkMenuItem = {
    type: 'link',
    href: string,
    title: string,
    miniTitle?: string,
    iconURL?: string,
    iconSVG?: string
    // buttonColor: string
}

export type SideMenu = {
    title: string,
    elements: LinkMenuItem[],
    button?: {
        iconPath: string,
        href: string
    }
}

// -------------------------------------------------------------------------------------------------
// Profile Menu
// -------------------------------------------------------------------------------------------------

export type ProfileMenuEntry = {
    href: string,
    title: string,
    newTab: boolean
}

export type ProfileMenuEntryWithID = {
    id: number,
    href: string,
    title: string,
    newTab: boolean
}

export type ProfileMenu = (ProfileMenuEntry[])[];
export type ProfileMenuWithID = (ProfileMenuEntryWithID[])[];

// -------------------------------------------------------------------------------------------------
// Notifications / Alerts
// -------------------------------------------------------------------------------------------------

export type ModalTheme = 'info' | 'ok' | 'warning' | 'error';

export type AlertSettings = {
    subText?: string,
    linger_ms?: number,
    iconPath?: string,
    iconColor?: string,
    theme?: ModalTheme,
    borderColor?: string,
    id?: string
}

export type NotificationSettings = {
    subText?: string,
    linger_ms?: number,
    iconPath?: string,
    iconColor?: string,
    iconURL?: string,
    theme?: ModalTheme,
    id?: string,
    deleteOnlyAfterClose: boolean
}

export type GenerateAlert = (text: string, settings?: AlertSettings) => void;

export type URLAlert = {
    text: string,
    settings?: AlertSettings
}

export type Issuer = 'general' | 'audible.download' | 'account.sync';
export type Notification = {
  id:             string,
  icon_path:      string | null,
  icon_color:     string | null,
  theme:          ModalTheme,
  text:           string,
  sub_text:       string | null,
  linger_time:    number,
  needs_clearing: boolean,
  auto_open:      boolean,
  issuer:         Issuer,
  identifier:     string | null,
}

export type NotificationAPI = {
    ok: boolean,
    notifications?: Notification[]
}


export type Images = {
    full: Buffer
    img512: Buffer,
    img256: Buffer,
    img128: Buffer,
    img56: Buffer,
};


// -------------------------------------------------------------------------------------------------
// Progress
// -------------------------------------------------------------------------------------------------

export type Progress = Prisma.ProgressGetPayload<{
    select: {
        id: false,
        type: true,
        progress: true,
        status: true,
        message: true,
        ref: true,
        speed_mb_s: true,
        total_mb: true,
        downloaded_mb: true
    }
}>;

export type ProcessProgress = Prisma.ProcessQueueGetPayload<{
    include: {
        book: {
            select: {
                title: true,
                authors: true,
                genres: true,
                cover: {
                    select: {
                        url_100: true
                    }
                }
            }
        }
    }
}>;

export type ProgressAPI = {
    ok: boolean,
    progress?: Progress,
    status: number
}

export type ProcessProgressesAPI = {
    ok: boolean,
    progresses?: ProcessProgress[],
    status: number,
    paused?: boolean,
    elapsed_s?: number
}

export type ProcessProgressAPI = {
    ok: boolean,
    progress?: ProcessProgress,
    status: number,
    paused?: boolean,
    elapsed_s?: number
}

export type ProgressStatus = 'RUNNING' | 'DONE' | 'ERROR'

export type ProgressManyAPI = {
    ok: boolean,
    progress?: Progress[],
    status: number
}

export type UpdateProgress = () => void;
export type PageNeedsProgress = () => void;

export enum ProcessError {
    NO_ERROR = 'NO_ERROR',
    AUDIBLE_LOCKED = 'AUDIBLE_LOCKED',
    BOOK_NOT_FOUND = 'BOOK_NOT_FOUND',
    CANCELED = 'CANCELED',
    NO_PROFILE = 'NO_PROFILE',
    NO_PROFILE_WITH_AUTHCODE = 'NO_PROFILE_WITH_AUTHCODE',
    NO_FOLDER = 'NO_FOLDER',
    CONVERSION_ERROR = 'CONVERSION_ERROR',
    COULD_NOT_SAVE = 'COULD_NOT_SAVE',
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
        case ProcessError.NO_PROFILE:
            return 'No Profile';
        case ProcessError.NO_PROFILE_WITH_AUTHCODE:
            return 'No Authcode';
        case ProcessError.NO_FOLDER:
            return 'Download Error';
        case ProcessError.CONVERSION_ERROR:
            return 'Conversion Error';
        case ProcessError.COULD_NOT_SAVE:
            return 'Save Error';
        default:
            return 'Unknown error';
    }
}

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
        case ProcessError.NO_PROFILE:
            return 'There is no profile that owns this book, therefore it could not be downloaded.';
        case ProcessError.NO_PROFILE_WITH_AUTHCODE:
            return 'There is no profile with authorization to download this book.';
        case ProcessError.NO_FOLDER:
            return 'Something went wrong while downloading this book; no files were saved.';
        case ProcessError.CONVERSION_ERROR:
            return 'Something went wrong while converting this book\'s audio file.';
        case ProcessError.COULD_NOT_SAVE:
            return 'Something went wrong while copying this book\'s audio file to storage.';
        default:
            return 'An unknown and unexpected error has occurred.';
    }
}


// -------------------------------------------------------------------------------------------------
// Library
// -------------------------------------------------------------------------------------------------

export type DownloadAPI = {
    ok: boolean,
    message?: string,
    status: number
}

export type DownloadStatusAPI = {
    ok: boolean,
    status: number
    inProgress: boolean,
    progress?: Progress
}

// -------------------------------------------------------------------------------------------------
// Settings
// -------------------------------------------------------------------------------------------------

export enum CollectionBy {
    series = 'series',
    album = 'album'
}

export namespace Settings {

    export type TypeName =
        'progress.running' |
        'progress.paused' |
        'progress.startTime' |
        'progress.endTime' |
        'progress.startPaused' |

        'search.autoSubmit' |

        'system.debug' |
        'system.cron.enable' |
        'system.cron' |

        'plex.enable' |
        'plex.address' |
        'plex.useToken' |
        'plex.token' |
        'plex.username' |
        'plex.password' |
        'plex.library.autoScan' |
        'plex.library.autoScanDelay' |
        'plex.library.scheduled' |
        'plex.collections.enable' |
        'plex.collections.by' | 

        'library.location' |

        'general.autoSync' |
        'general.encKey' |
        'general.string' |
        'general.float'
    ;

    export type ObjectType<T> =
        T extends 'progress.running' ? boolean :           // Boolean
        T extends 'progress.paused' ? boolean :            // Boolean
        T extends 'progress.startTime' ? number :          // Integer
        T extends 'progress.endTime' ? number :            // Integer
        T extends 'progress.startPaused' ? boolean :       // Integer
  
        T extends 'search.autoSubmit' ? boolean :          // Boolean
        
        T extends 'system.debug' ? boolean :               // Boolean
        T extends 'system.cron.enable' ? boolean :         // Boolean
        T extends 'system.cron' ? string :                 // String

        T extends 'plex.enable' ? boolean :                // Boolean
        T extends 'plex.address' ? string :                // String
        T extends 'plex.useToken' ? boolean :              // Boolean
        T extends 'plex.token' ? string :                  // String
        T extends 'plex.username' ? string :               // String
        T extends 'plex.password' ? string :               // String
        T extends 'plex.library.autoScan' ? boolean :      // Boolean
        T extends 'plex.library.scheduled' ? boolean :     // Boolean
        T extends 'plex.library.autoScanDelay' ? number :  // Integer
        T extends 'plex.collections.enable' ? boolean :    // Boolean
        T extends 'plex.collections.by' ? CollectionBy :   // Enum

        T extends 'library.location' ? string :            // String

        T extends 'general.autoSync' ? boolean :           // Boolean
        T extends 'general.encKey' ? string :              // String
        T extends 'general.string' ? string :              // String
        T extends 'general.float' ? number :               // Float
        never;

    export const defaultSettings: { [key in Settings.TypeName]: any } = {
        'progress.running': true,
        'progress.paused': true,
        'progress.startTime': -1,
        'progress.endTime': -1,
        'progress.startPaused': false,

        'search.autoSubmit': true,

        'system.debug': false,
        'system.cron.enable': true,
        'system.cron': '0 4 * * *',

        'plex.enable': false,
        'plex.address': '127.0.0.1',
        'plex.useToken': true,
        'plex.token': '',
        'plex.username': '',
        'plex.password': '',
        'plex.library.autoScan': true,
        'plex.library.scheduled': true,
        'plex.library.autoScanDelay': 60,
        'plex.collections.enable': true,
        'plex.collections.by': CollectionBy.series,

        'library.location': '/library',
        
        'general.autoSync': true,
        'general.encKey': 'UNSET',
        'general.string': 'test',
        'general.float': 3.14
    }

}