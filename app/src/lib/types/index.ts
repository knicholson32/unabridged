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

export type Issuer = 'general' | 'audible.download';
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

export type ProcessProgress = Prisma.ProcessQueueGetPayload<{}>;

export type ProgressAPI = {
    ok: boolean,
    progress?: Progress,
    status: number
}

export type ProcessProgressesAPI = {
    ok: boolean,
    progresses?: ProcessProgress[],
    status: number
}

export type ProcessProgressAPI = {
    ok: boolean,
    progress?: ProcessProgress,
    status: number
}

export type ProgressStatus = 'RUNNING' | 'DONE' | 'ERROR'

export type ProgressManyAPI = {
    ok: boolean,
    progress?: Progress[],
    status: number
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