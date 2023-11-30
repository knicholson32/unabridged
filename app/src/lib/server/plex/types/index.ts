import type { IPlexClientDetails } from "plex-oauth";
import type * as settings from '$lib/server/settings';


export type Base = {
  MediaContainer: {
    size: number,
    allowCameraUpload: boolean,
    allowChannelAccess: boolean,
    allowMediaDeletion: boolean,
    allowSharing: boolean,
    allowSync: boolean,
    allowTuners: boolean,
    backgroundProcessing: boolean,
    certificate: boolean,
    companionProxy: boolean,
    countryCode: string,
    diagnostics: string,
    eventStream: boolean,
    friendlyName: string,
    hubSearch: boolean,
    itemClusters: boolean,
    livetv: number,
    machineIdentifier: string,
    mediaProviders: boolean,
    multiuser: boolean,
    myPlex: boolean,
    myPlexMappingState: string,
    myPlexSigninState: string,
    myPlexSubscription: boolean,
    myPlexUsername: string,
    offlineTranscode: number,
    ownerFeatures: string,
    platform: string,
    platformVersion: string,
    pluginHost: boolean,
    pushNotifications: boolean,
    readOnlyLibraries: boolean,
    streamingBrainABRVersion: number,
    streamingBrainVersion: number,
    sync: boolean,
    transcoderActiveVideoSessions: number,
    transcoderAudio: boolean,
    transcoderLyrics: boolean,
    transcoderPhoto: boolean,
    transcoderSubtitles: boolean,
    transcoderVideo: boolean,
    transcoderVideoBitrates: string,
    transcoderVideoQualities: string,
    transcoderVideoResolutions: string,
    updatedAt: number,
    updater: boolean,
    version: string,
    voiceSearch: boolean,
    Directory: {
      count: number,
      key: string,
      title: string
    }[]
  }
}

export type Sections = {
  MediaContainer: {
    size: number,
    allowSync: boolean,
    title1: string,
    Directory: {
      allowSync: boolean,
      art: string,
      composite: string,
      filters: boolean,
      refreshing: boolean,
      thumb: string,
      key: string,
      type: 'artist' | 'photo' | 'movie',
      title: string,
      agent: string,
      scanner: string,
      language: string,
      uuid: string,
      updatedAt: number,
      createdAt: number,
      scannedAt: number,
      content: boolean,
      directory: boolean,
      contentChangedAt: number,
      hidden: number,
      Location: {
        id: number,
        path: string
      }[]
    }[]
  }
}


// -------------------------------------------------------------------------------------------------
// Plex OAuth
// -------------------------------------------------------------------------------------------------

export const CLIENT_INFORMATION: IPlexClientDetails = {
  clientIdentifier: 'Unabridged-Container',                       // This is a unique identifier used to identify your app with Plex.
  product: "Server Instance",                                     // Name of your application
  device: 'Docker Container',                                     // The type of device your application is running on
  version: process.env.GIT_COMMIT?.substring(0, 7) ?? 'Unknown',  // Version of your application
  platform: "Server",                                             // Optional - Platform your application runs on - Defaults to 'Web'
  urlencode: true                                                 // Optional - If set to true, the output URL is url encoded, otherwise if not specified or 'false', the output URL will return as-is
}