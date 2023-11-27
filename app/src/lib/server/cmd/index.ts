'@hmr:reset'
import * as audible from './audible';
import * as AAXtoMP3 from './AAXtoMP3';
import prisma from '$lib/server/prisma';
import * as tools from './tools';
import * as settings from '$lib/server/settings';
import { v4 as uuidv4 } from 'uuid';
import { BookDownloadError } from './audible/types';
import type { Issuer, ModalTheme } from '$lib/types';
import { ConversionError } from './AAXtoMP3/types';
import { ProcessError } from '$lib/types';
import cron from 'node-cron';

enum ProcessState {
  NOT_STARTED = 'NOT_STARTED',
  DOWNLOADING = 'DOWNLOADING',
  PROCESSING = 'PROCESSING',
  DONE = 'DONE'
}


// -----------------------------------------------------------------------------------------------
// Library Manager
// -----------------------------------------------------------------------------------------------

export namespace LibraryManager {

  // ---------------------------------------------------------------------------------------------
  // Types
  // ---------------------------------------------------------------------------------------------

  export type State = {
    state: ProcessState,
    progress?: number,
    remaining_s?: number
    message?: string,
  }

  type Book = {
    asin: string;
    state: State;
  }

  // ---------------------------------------------------------------------------------------------
  // Const Variables
  // ---------------------------------------------------------------------------------------------

  export const PROGRESS_TYPE = 'library';
  const EVENT_LOOP_RATE = 30000;


  // ---------------------------------------------------------------------------------------------
  // Library Queue
  // ---------------------------------------------------------------------------------------------

  const libraryQueue: Book[] = [];

  // ---------------------------------------------------------------------------------------------
  // Event Loop
  // ---------------------------------------------------------------------------------------------

  // let eventLoopInterval: NodeJS.Timeout | undefined = undefined;
  export const eventLoop = async () => {
    await global.manager.runProcess();
  }

  // ---------------------------------------------------------------------------------------------
  // Queue Locking
  // ---------------------------------------------------------------------------------------------

  let isLocked = false;
  const lockProcessQueue = (): Promise<void> => {
    if(!isLocked) {
      isLocked = true;
      return new Promise<void>((resolve) => resolve());
    }
    return new Promise<void>((resolve) => setTimeout(() => lockProcessQueue().then(resolve), 5));
  };

  const unlockProcessQueue = () => {
    isLocked = false;
  }

  // ---------------------------------------------------------------------------------------------
  // Processor
  // ---------------------------------------------------------------------------------------------


  /**
   * Set an entry to try again later
   * @param id the entry to adjust
   * @param cooldown the cooldown in seconds
   */
  const tryAgainLater = async (id: string, cooldown: number, result: ProcessError) => {
    // There are. We need to try this entry again in a bit
    await prisma.processQueue.update({
      where: { id },
      data: {
        in_progress: false,
        is_done: false,
        process_progress: 0,
        download_progress: 0,
        speed: null,
        total_mb: null,
        downloaded_mb: null,
        try_after_time: Date.now() + cooldown,
        result
      }
    });
    // In a bit, restart the processors just in case none of them are running by then
    setTimeout(global.manager.runProcess, cooldown + 100);
  }

  const processFailed = async (id: string, result: ProcessError, downloadProgress: number, processProgress: number) => {
    await prisma.processQueue.update({ where: { id },
      data: {
        in_progress: false,
        is_done: true,
        result: result,
        download_progress: downloadProgress,
        process_progress: processProgress,
        speed: null,
        total_mb: null,
        downloaded_mb: null,
        try_after_time: null
      }
    });
  }

  const getQueueFinder = () => {
    return {
      include: { book: { include: { profiles: true, cover: true } } },
      where: {
        AND: [
          {
            OR: [
              { try_after_time: null },
              { try_after_time: { lte: Date.now() } }
            ]
          },
          { in_progress: false },
          { is_done: false }
        ]
      }
    }
  }

  const CONCURRENT_PROCESSES = 3;
  const ATTEMPT_COOLDOWN = 5000;
  const ATTEMPT_COOLDOWN_SHORT = 100;
  let processorPromises: (Promise<void> | undefined)[] = Array.from({ length: CONCURRENT_PROCESSES }, (_, i) => undefined);

  const processFunc = async (resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: any) => void) => {
    // Get the next element from the queue
    await lockProcessQueue();
    let queueEntry = await prisma.processQueue.findFirst(getQueueFinder());
    // Loop while there are elements to process
    while (queueEntry !== null && await settings.get('progress.paused') === false) {
      // Make sure we are listed as running
      if (await settings.get('progress.running') === false) {
        const startTime = await settings.get('progress.startTime');
        const endTime = await settings.get('progress.endTime')
        if (startTime !== -1 && endTime !== -1) {
          // We can just shift the times
          await settings.set('progress.startTime', Math.floor(Date.now() / 1000) - (endTime - startTime));
        } else {
          // Total reset of the times
          await settings.set('progress.startTime', Math.floor(Date.now() / 1000));
        }
        await settings.set('progress.endTime', -1);
        await settings.set('progress.running', true);
      }
      // Steps to download and process a book
      // 1. Select this entry as in-progress
      await prisma.processQueue.update({ where: { id: queueEntry.id }, data: {
        in_progress: true,
        is_done: false,
        process_progress: 0,
        download_progress: 0,
        downloaded_mb: null,
        total_mb: null,
        speed: null,
        result: null
      }});
      unlockProcessQueue();
      let tmpDir: string | undefined = undefined;
      try {
        // We are ready to download the book since the queue entry is locked as ours
        // Create a temporary directory
        tmpDir = tools.createTempDir(queueEntry.book.asin);
        // Delete present files relating to this book if they exist, but don't delete the book in the DB
        await tools.cleanBook(queueEntry.book.asin);
        // 2. Download the book, updating the book progress as required
        const bookDownload = await audible.cmd.download.download(queueEntry.book.asin, queueEntry.id,tmpDir);
        console.log(bookDownload);
        switch (bookDownload) {
          case BookDownloadError.NO_ERROR:
            // Nothing to do, this is the success case
            break;
          case BookDownloadError.AUDIBLE_LOCKED:
            // Audible is locked. We need to try again in a bit. Give this one a delay of a few seconds
            await tryAgainLater(queueEntry.id, ATTEMPT_COOLDOWN, ProcessError.AUDIBLE_LOCKED);
            break;
          case BookDownloadError.BOOK_NOT_FOUND:
            // The book could not be found. We can just delete this entry
            await processFailed(queueEntry.id, ProcessError.BOOK_NOT_FOUND, 0, 0);
            break;
          case BookDownloadError.CANCELED:
            // The user has canceled. We can just delete this entry
            await processFailed(queueEntry.id, ProcessError.CANCELED, 0, 0);
            break;
          case BookDownloadError.NO_PROFILE:
            // This book has no account that owns it. It should be deleted.
            await tools.deleteBook(queueEntry.book.asin);
            // Delete this entry
            await processFailed(queueEntry.id, ProcessError.NO_PROFILE, 0, 0);
            break;
          case BookDownloadError.NO_PROFILE_WITH_AUTHCODE:
            // The profiles need metadata pulled
            for (const p of queueEntry.book.profiles)
              if (p.activation_bytes === null) await audible.cmd.profile.fetchMetadata(p.id, false);
            // We need to re-pull these accounts and make sure there are now bytes. If not, we can't re-add them to the queue
            const book = await prisma.book.findUnique({ where: { asin: queueEntry.bookAsin }, include: { profiles: true }});
            // Check if the book still exists
            if (book !== null) {
              // Assume there are no bytes
              let bytes = false;
              // Loop through profiles and if any have bytes, set to true
              for (const p of book.profiles) if (p.activation_bytes !== null) bytes = true;
              // Check if there are bytes
              if (bytes === true) {
                await tryAgainLater(queueEntry.id, ATTEMPT_COOLDOWN_SHORT, ProcessError.NO_PROFILE_WITH_AUTHCODE);
                break;
              }
            }
            // Delete this queued entry
            await processFailed(queueEntry.id, ProcessError.NO_PROFILE_WITH_AUTHCODE, 0, 0);
            break;
          default:
            console.log('ERROR: Unexpected BookDownloadError:', bookDownload);
            // Delete this queued entry
            await processFailed(queueEntry.id, bookDownload as unknown as ProcessError, 0, 0);
            break;
        }
        // Only continue if there was no error
        if (bookDownload === BookDownloadError.NO_ERROR) {
          // Update the progress to show the download done
          await prisma.processQueue.update({ where: { id: queueEntry.id }, data: { download_progress: 1, result: null } });
          // 3. Process the book, updating the book progress as required
          const bookProcess = await AAXtoMP3.cmd.convert.exec(queueEntry.book.asin, queueEntry.id, tmpDir);
          switch (bookProcess) {
            case ConversionError.NO_ERROR:
              // Nothing to do, this is the success case
              break;
            case ConversionError.BOOK_NOT_FOUND:
              // Delete this queued entry
              await processFailed(queueEntry.id, ProcessError.BOOK_NOT_FOUND, 1, 0);
              break;
            case ConversionError.CANCELED:
              // The user has canceled. We can just delete this entry
              await processFailed(queueEntry.id, ProcessError.CANCELED, 1, 0);
              break;
            case ConversionError.NO_FOLDER:
              // Delete this queued entry
              await processFailed(queueEntry.id, ProcessError.NO_FOLDER, 1, 0);
              // The download must have failed. Set the book as not downloaded
              // Assign the book as downloaded
              await prisma.book.update({
                where: { asin: queueEntry.book.asin },
                data: { downloaded: false }
              });
              break;
            case ConversionError.NO_PROFILE_WITH_AUTHCODE:
              // The profiles need metadata pulled
              for (const p of queueEntry.book.profiles)
                if (p.activation_bytes === null) await audible.cmd.profile.fetchMetadata(p.id, false);
              // We need to re-pull these accounts and make sure there are now bytes. If not, we can't re-add them to the queue
              const book = await prisma.book.findUnique({ where: { asin: queueEntry.bookAsin }, include: { profiles: true } });
              // Check if the book still exists
              if (book !== null) {
                // Assume there are no bytes
                let bytes = false;
                // Loop through profiles and if any have bytes, set to true
                for (const p of book.profiles) if (p.activation_bytes !== null) bytes = true;
                // Check if there are bytes
                if (bytes === true) {
                  await tryAgainLater(queueEntry.id, ATTEMPT_COOLDOWN_SHORT, ProcessError.NO_PROFILE_WITH_AUTHCODE);
                  break;
                }
              }
              // Delete this queued entry
              await processFailed(queueEntry.id, ProcessError.NO_PROFILE_WITH_AUTHCODE, 1, 0);
              break;
            case ConversionError.NO_PROFILE:
              // This book has no account that owns it. It should be deleted.
              await tools.deleteBook(queueEntry.book.asin);
              // Delete this entry
              await processFailed(queueEntry.id, ProcessError.NO_PROFILE, 1, 0);
              break;
            case ConversionError.CONVERSION_ERROR:
              // We had a general error during the conversion process. This could be one of many issues
              // Delete this entry
              await processFailed(queueEntry.id, ProcessError.CONVERSION_ERROR, 1, 0);
              break;
            case ConversionError.COULD_NOT_SAVE:
              // Delete this entry
              await processFailed(queueEntry.id, ProcessError.COULD_NOT_SAVE, 1, 0);
              break;
            default:
              console.log('ERROR: Unexpected ConversionError:', bookDownload);
              // Delete this queued entry
              await processFailed(queueEntry.id, bookDownload as unknown as ProcessError, 1, 0);
              break;
          }

          // Check if the conversion succeeded
          if (bookProcess === ConversionError.NO_ERROR) {
            // Update this queued entry
            await prisma.processQueue.update({
              where: { id: queueEntry.id },
              data: {
                in_progress: false,
                is_done: true,
                process_progress: 1,
                download_progress: 1,
                speed: null,
                total_mb: null,
                downloaded_mb: null,
                result: ProcessError.NO_ERROR
              }
            });
            // Send a notification
            await prisma.notification.create({
              data: {
                id: uuidv4(),
                issuer: 'audible.download' satisfies Issuer,
                identifier: queueEntry.book.cover?.url_100,
                theme: 'info' satisfies ModalTheme,
                text: `<a href="/library/books/${queueEntry.book.asin}">${queueEntry.book.title}</a> <span class="text-gray-600">Downloaded</span>`,
                sub_text: new Date().toISOString(),
                linger_time: 10000,
                needs_clearing: true,
                auto_open: true
              }
            });
          }
        }
        // Get the next element from the queue
        await lockProcessQueue();
        queueEntry = await prisma.processQueue.findFirst(getQueueFinder());
      } catch(e) {
        try {
          if (queueEntry !== null) {
            // Update this queued entry
            await prisma.processQueue.update({
              where: { id: queueEntry.id },
              data: {
                in_progress: false,
                is_done: true,
                process_progress: 0,
                download_progress: 0,
                speed: null,
                total_mb: null,
                downloaded_mb: null,
                result: 'UNKNOWN' as ProcessError
              }
            });
          }
        } catch(e) {
          // Nothing to do if this fails
        }
        console.log('Unrecoverable Processor Error', e);
        // Get the next element from the queue
        await lockProcessQueue();
        queueEntry = await prisma.processQueue.findFirst(getQueueFinder());
      } finally {
        // if (tmpDir !== undefined) tools.clearDir(tmpDir);
      }
    }
    unlockProcessQueue();
    resolve();
  };

  const runProcess = async () => {
    if (await settings.get('progress.paused') === true) {
      console.log('Processor Paused!');
      return;
    }

    for (let i = 0; i < processorPromises.length; i++) {
      if (processorPromises[i] === undefined) {
        const p = new Promise(processFunc).then(async () => {
          processorPromises[i] = undefined

          const noneWorking = processorPromises.every((p) => p === undefined);

          if (noneWorking && await settings.get('progress.running') === true) {
            await settings.set('progress.running', false);
            await settings.set('progress.endTime', Math.floor(Date.now() / 1000));
          }

        });
        processorPromises[i] = p;
      }
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Public Functions
  // ---------------------------------------------------------------------------------------------


  /**
   * Start the LibraryManager event loop
   */
  export const start = async () => {
    console.log('start event loop');
    
    await prisma.processQueue.updateMany({
      where: { in_progress: true },
      data: { in_progress: false }
    });

    console.log(await prisma.processQueue.findMany());

    // Set the paused value to the default
    await settings.set('progress.paused', await settings.get('progress.startPaused'));

    if (global.manager === undefined) global.manager = { interval: undefined, cronTask: undefined, runProcess: runProcess };
    global.manager.runProcess = runProcess;
    if (global.manager.interval !== undefined) stop();
    global.manager.interval = setInterval(eventLoop, EVENT_LOOP_RATE);
    global.manager.interval.unref();
    await global.manager.runProcess();

    // Start the cron task
    Cron.start();
  }

  /**
   * Stop the LibraryManager event loop
   */
  export const stop = () => {
    console.log('stop event loop');
    if (global.manager === undefined) global.manager = { interval: undefined, cronTask: undefined, runProcess: runProcess };
    global.manager.runProcess = runProcess;
    clearInterval(global.manager.interval);
    global.manager.interval = undefined;

    // Stop cron
    Cron.stop();
  }


  /**
   * Deletes a book from the downloaded library
   * @param asin 
   */
  export const cleanBook = async (asin: string) => {
    await tools.cleanBook(asin);
  }

  /**
   * Deletes a book from the downloaded library
   * @param asin 
   */
  export const cleanSeries = async (id: string) => {
    await tools.cleanSeries(id);
  }

  /**
   * Cancels a book that is downloading or processing
   * @param asin the book to cancel
   */
  export const cancelBook = async (asin: string) => {
    audible.cmd.download.cancel(asin);
    AAXtoMP3.cmd.convert.cancel(asin);
    await removeBook(asin, ProcessError.CANCELED);
  }

  /**
   * Get whether or not this book is queued for download (whether it is currently being downloaded or not)
   * @param asin the book
   * @returns true if it is queued for download and processing
   */
  export const getIsQueued = async (asin: string): Promise<boolean> => {
    const element = await prisma.processQueue.findUnique({ where: { bookAsin: asin } });
    return element !== null;
  }

  /**
   * Queue a book to be downloaded and processed
   * @param asin the asin of the book to be downloaded and processed
   */
  export const queueBook = async (asin: string, run = true) => {
    try {
      if (!(await getIsQueued(asin))) {
        await prisma.processQueue.create({
          data: {
            id: uuidv4(),
            bookAsin: asin
          }
        });
      }
      if (run) await global.manager.runProcess();
    } catch(e) {
      console.log('Library Manager QueueBook', e);
    }
  }

  /**
   * Queue many books to be downloaded and processed
   * @param asins the asins of the books to be downloaded and processed
   */
  export const queueBooks = async (asins: string[]) => {
    for (const asin of asins) await queueBook(asin, false);
    await global.manager.runProcess();
  }

  /**
   * Remove a book from the download and process queue
   * @param asin the book to remove
   * @returns true if it was removed, false if it is already in progress
   */
  export const removeBook = async (asin: string, result?: ProcessError): Promise<boolean> => {
    // Find the book in the queue
    try {
      console.log('REMOVE QUEUE', asin);
      // Find by the ASIN and the in_progress tag
      await prisma.processQueue.update({ 
        where: { 
          bookAsin: asin,
          in_progress: false,
          is_done: false
        },
        data: {
          is_done: true,
          result
        }
      });
      // The book was found and removed
      return true;
    } catch(e) {
      // The book was not found or could not be removed
      return false;
    }
  }

  /**
   * Remove many books from the download and process queue
   * @param asins the books to remove
   * @returns a the number of books that were removed
   */
  export const removeBooks = async (asins: string[]): Promise<number> => {
    // Remove all books that have the asin and are not in progress yet
    console.log('REMOVE QUEUEs', asins);
    const removals = await prisma.processQueue.updateMany({
      where: {
        bookAsin: {
          in: asins
        },
        in_progress: false,
        is_done: false
      },
      data: {
        is_done: true
      }
    });
    return removals.count;
  }

  export const getProgress = (asin: string) => prisma.progress.findUnique({ where: { id_type: { id: asin, type: PROGRESS_TYPE } } });
  export const getAllProgress = async () => prisma.progress.findMany({ where: { type: PROGRESS_TYPE } });

}

process.on('SIGINT', LibraryManager.stop);
process.on('SIGTERM', LibraryManager.stop);
process.on('exit', LibraryManager.stop);


// ---------------------------------------------------------------------------------------------
// Cron
// ---------------------------------------------------------------------------------------------
export namespace Cron {

  // ---------------------------------------------------------------------------------------------
  // Processor
  // ---------------------------------------------------------------------------------------------

  const process = async () => {
    const debug = await settings.get('system.debug');
    if (debug) console.log('CRON PROCESS');
  }

  
  // ---------------------------------------------------------------------------------------------
  // Public Functions
  // ---------------------------------------------------------------------------------------------

  export const get = () => {
    return global.manager.cronTask;
  }

  /**
   * Start the Cron task
   */
  export const start = async () => {
    
    // Check if we are in debug
    const debug = await settings.get('system.debug');
    if (debug) console.log('start cron');

    // Stop the current cron if one exists
    if (global.manager.cronTask !== undefined) global.manager.cronTask.stop();

    // Check if the cron is enabled
    if (!await settings.get('system.cron.enable')) {
      if (debug) console.log('Cron failed to start because it is not enabled')
      return false;
    }

    // Get the cron string
    const cronString = await settings.get('system.cron');
    
    // Validate the cron string
    if (!cron.validate(cronString)) {
      if (debug) console.log('Cron failed to start because the cron string is invalid:', cronString);
      return false;
    }

    // Start the cron
    global.manager.cronTask = cron.schedule(cronString, process, {
      // TODO: Load this timezone from settings
      timezone: 'America/New_York'
    });

    // Start the cron task
    global.manager.cronTask.start();

    // Done
    return true;
  }

  export const stop = async () => {
    if (global.manager.cronTask !== undefined) global.manager.cronTask.stop();
  }

}