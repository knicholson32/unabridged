import type { Prisma } from '@prisma/client';
import type * as types from './';
import type { ObjectType, SettingsSet, TypeName } from '$lib/server/settings';
import * as _responses from './responses';
import * as validators from './prisma';

/**
 * API Namespace that defines the contents of every API payload
 */
namespace API {

  // Export some tools that can be used to make Prisma requests if needed
  export namespace Tools {
    export const fileSelect = {
      id: true,
      content_type: true,
      extension: true,
      title: true,
      bookAsin: true,
      data: false,
      path: false,
      size_b: true,
      description: true
    } satisfies Prisma.MediaSelect

    export const processQueueBOOKInclude = validators.processQueueBOOKInclude;
  }

  // Export all types that the API can carry
  export namespace Types {
    export type File = Prisma.MediaGetPayload<{ select: typeof Tools.fileSelect }>;
    export type Notification = types.Notification;
    export type ProcessSettings = { [K in SettingsSet<TypeName, 'progress'>]: ObjectType<K> };
    export type ProcessQueueBOOK = types.ProcessQueueBOOK;
  }

  // Export the basic response with all the available API responses
  export type Response = Error | General | Boolean | Notification | Manifest | API.Process.Book | API.Process.Settings;

  // Create a basic API interface that all other APIs will extend
  interface API {
    status: number
    ok: boolean
  }

  // Export basic functions
  export const response = _responses;

  // Export a basic Error API response
  export interface Error extends API {
    ok: false
    message: string,
    code?: number
  }

  // Create a basic Success API response. All other API responses will extend this response.
  interface Success extends API {
    ok: true
    type: string
  }

  export interface General extends Success {
    type: 'general'
  }

  export interface Boolean extends Success {
    type: 'boolean',
    value: boolean
  }

  // Notifications ---------------------------------------------------------------------------------
  export interface Notification extends Success {
    type: 'notification'
    notifications: Types.Notification[]
  }

  // Manifest --------------------------------------------------------------------------------------
  export interface Manifest extends Success {
    type: 'manifest'
    files: Types.File[]
  }

  // Process ---------------------------------------------------------------------------------------
  export namespace Process {
    // Process Settings ----------------------------------------------------------------------------
    export interface Settings extends Success {
      type: 'process.settings'
      settings: Types.ProcessSettings
    }

    // ProcessQueue of type BOOK ------------------------------------------------------------------
    export interface Book extends Success {
      type: 'process.book'
      processes: Types.ProcessQueueBOOK[]
    }
  }
}

// Export default
export default API