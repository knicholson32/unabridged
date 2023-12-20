import type { Prisma } from '@prisma/client';
import type * as types from './';
import type { ObjectType, SettingsSet, TypeName } from '$lib/server/settings';
import * as _responses from './responses';

/**
 * Event Namespace that defines the contents of every type of Event
 */
namespace Event {

  // // Export all available event endpoints
  // export type Endpoints = 'base' | 'progress'

  // export type EndpointNameResolver<E extends Endpoints> =
  //   E extends 'base' ? Base.Name :
  //   E extends 'progress' ? Progress.Name :
  //   never;

  /**
   * Base events are ones that every client listens to automatically. This includes things such as:
   *  - Notifications
   */
  export namespace Base {
    // ---------------------------------------------------------------------------------------------
    // Base Event Names
    // ---------------------------------------------------------------------------------------------
    export const Names = [
      'notification.created',
      'notification.deleted',
      'processor.invalidate',
      'processor.settings',
    ] as const;
    export type Name = typeof Names[number];

    export type Type<T extends Name> =
      T extends 'notification.created' ? Notifications :
      T extends 'notification.deleted' ? string[] :
      T extends 'processor.invalidate' ? boolean :
      T extends 'processor.settings' ? types.API.Types.ProcessSettings :
      never;

    // ---------------------------------------------------------------------------------------------
    // Base Event Declarations
    // ---------------------------------------------------------------------------------------------
    export type Notifications = types.Notification[]
  }

  /**
   * Progress events are ones that the client only listens to when required. This includes things such as:
   *  - Account sync progress
   *  - Processor progress updates 
   */
  export namespace Progress {

    // ---------------------------------------------------------------------------------------------
    // Progress Event Names
    // ---------------------------------------------------------------------------------------------
    export const Names = [
      'basic.account.sync',  // Basic Event
      'processor.book',  // Processor.BOOK Event
    ] as const;
    export type Name = typeof Names[number];

    export type Type<T extends Name> =
      T extends 'basic.account.sync' ? Basic :
      T extends 'processor.book' ? Processor.BOOK :
      never;

    // ---------------------------------------------------------------------------------------------
    // Progress Event Declarations
    // ---------------------------------------------------------------------------------------------

    /**
     * Basic Progress - non-specialized, useful for basic data
     */
    export type Basic = Basic.Start | Basic.InProgress | Basic.Done;
    export namespace Basic {
      interface Header {
        
      }

      // Create an enum that will hold what stage this packet is in
      // We use single letters so the packet takes less data, and use
      // this enum for better code readability
      export enum Stage {
        START = 's',
        IN_PROGRESS = 'p',
        DONE = 'd'
      }

      /**
       * To be emitted upon starting the basic task
       */
      export interface Start extends Header {
        t: Stage.START            // Type
      }

      /**
       * To be emitted as the basic task progresses
       */
      export interface InProgress extends Header {
        t: Stage.IN_PROGRESS,     // Type
        m?: string                // Message
        p: number,                // Progress
      }

      /**
       * To be emitted when the basic task finishes
       */
      export interface Done extends Header {
        t: Stage.DONE,            // Type
        m?: string,               // Message
        success: boolean,         // Success
        data?: any                // Data
      }
    }

    /**
     * Specific progress types for each Processor Task
     */
    export namespace Processor {

      /**
       * The basic Processor Progress packet has the following params
       */
      export interface Header {
        r: boolean,   // Whether the process is running
        d: boolean    // Whether the process is done
      };


      /**
       * Progress type for ProcessType.BOOK
       */
      export type BOOK = BOOK.Download | BOOK.Convert
      export namespace BOOK {

        // Create an enum that will hold what task this packet is talking about
        // We use single letters so the packet takes less data, and use this
        // enum for better code readability
        export enum Task {
          DOWNLOAD = 'd',     // Download
          PROCESS = 'p'       // Convert
        }

        interface _progress_base extends Header {
          t: Task             // Task
        }

        export interface Download extends _progress_base {
          p: number,          // Progress
          mb?: number,        // MB Downloaded
          tb?: number,        // Total MB
          s?: number,         // Speed
          t: Task.DOWNLOAD    // Task of Download
        }

        export interface Convert extends _progress_base {
          p: number,          // Progress
          s?: number,         // Speed
          t: Task.PROCESS     // Task of Progress
        }
      }
    }
  }
}

export default Event;