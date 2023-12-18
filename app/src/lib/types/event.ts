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
      'processor.book.inProgress'
    ] as const;
    export type Name = typeof Names[number];

    export type Type<T extends Name> =
      T extends 'notification.created' ? Notifications :
      T extends 'notification.deleted' ? string[] :
      T extends 'processor.invalidate' ? undefined :
      T extends 'processor.book.inProgress' ? boolean :
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
        id: string
      }

      /**
       * To be emitted upon starting the basic task
       */
      export interface Start extends Header {
        type: 'start'
      }

      /**
       * To be emitted as the basic task progresses
       */
      export interface InProgress extends Header {
        type: 'in_progress',
        message?: string
        progress: number,
      }

      /**
       * To be emitted when the basic task finishes
       */
      export interface Done extends Header {
        type: 'done',
        message?: string,
        success: boolean,
        data?: any
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
        id: string,   // ID of the Process in the ProcessQueue
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





//   export const EventNames = [
//     'notification.created',
//     'notification.deleted',
//     // 'process.settings',
//     'process.dismissed',
//     'process.book',
//     'process.book.queued',
//     'process.book.progress',
//     'process.book.result',
//     'progress.account.sync'
//   ] as const;
//   export type EventName = typeof EventNames[number];

//   export type ProgressEvents = Extract<EventName, 'progress.account.sync'>;

//   export type EventType<T extends EventName> =
//     T extends 'notification.created' ? Base.Notifications[] :
//     T extends 'notification.deleted' ? string[] :
//     // T extends 'process.settings' ? Process.Settings :
//     T extends 'process.dismissed' ? string[] :
//     T extends 'process.book' ? Process.Header :
//     T extends 'process.book.queued' ? ProcessQueueBOOK :
//     T extends 'process.book.result' ? Process.Book.Result :
//     T extends 'process.book.progress' ? Process.Book.Progress :
//     T extends 'progress.account.sync' ? Progress.Packet :
//     string;
// }


export default Event;