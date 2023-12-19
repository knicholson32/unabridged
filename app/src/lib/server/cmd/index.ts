'@hmr:reset'
import * as audible from './audible';
import * as AAXtoMP3 from './AAXtoMP3';
import prisma from '$lib/server/prisma';
import * as tools from './tools';
import * as settings from '$lib/server/settings';
import * as types from '$lib/types';
import { v4 as uuidv4 } from 'uuid';
import { BookDownloadError } from './audible/types';
import type { Issuer, ModalTheme } from '$lib/types';
import { ConversionError } from './AAXtoMP3/types';
import { ProcessError } from '$lib/types';
import * as Plex from '$lib/server/plex';
import * as validators from '$lib/types/prisma';
import * as events from '$lib/server/events';
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
  const tryAgainLater = async (id: string, type: types.ProcessType, cooldown: number, result: ProcessError) => {
    // There are. We need to try this entry again in a bit
    if (type === 'BOOK') {
      await prisma.processQueue.update({
        where: { id },
        data: {
          in_progress: false,
          is_done: false,
          try_after_time: Date.now() + cooldown,
          result,
          book: {
            update: {
              process_progress: 0,
              download_progress: 0,
              speed: null,
              total_mb: null,
              downloaded_mb: null,
            }
          }
        }
      });
      events.emit('processor.invalidate', {v: '1'});
    } else {
      console.log(`ERROR: Unimplemented process type: ${type}`, id);
    }
    // In a bit, restart the processors just in case none of them are running by then
    setTimeout(global.manager.runProcess, cooldown + 100);
  }

  const processFailed = async (id: string, type: types.ProcessType, result: ProcessError, downloadProgress: number, processProgress: number) => {
    if (type === 'BOOK') {
      await prisma.processQueue.update({
        where: { id },
        data: {
          in_progress: false,
          is_done: true,
          result: result,
          try_after_time: null,
          book: {
            update: {
              download_progress: downloadProgress,
              process_progress: processProgress,
              speed: null,
              total_mb: null,
              downloaded_mb: null,
            }
          }
        }
      });
      events.emit('processor.invalidate', {v: '2'});
    } else {
      console.log(`ERROR: Unimplemented process type: ${type}`, id);
    }
  }

  const getQueueFinder = () => {
    return {
      // include: { book: { include: { profiles: true, cover: true } } },
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
      },
      include: {
        book: {
          include: {
            book: {
              include: {
                profiles: true,
                cover: {
                  select: {
                    url_100: true
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  const CONCURRENT_PROCESSES = 3;
  const ATTEMPT_COOLDOWN = 5000;
  const ATTEMPT_COOLDOWN_SHORT = 100;
  let processorPromises: (Promise<void> | undefined)[] = Array.from({ length: CONCURRENT_PROCESSES }, (_, i) => undefined);
  let libraryScanShouldBeIssued = false;

  const processFunc = async (resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: any) => void) => {
    // Get the next element from the queue
    await lockProcessQueue();
    let queueEntry = await prisma.processQueue.findFirst(getQueueFinder());
    // Loop while there are elements to process
    while (queueEntry !== null && await settings.get('progress.paused') === false) {
      // Make sure we are listed as running
      // TODO: Should this running counter only apply to some types of processes?
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
        // events.emit('process.settings', await settings.getSet('progress'));
        events.emit('processor.invalidate', { v: '3' });
      }
      // Get the process type
      const type = queueEntry.type as types.ProcessType;

      // Switch based on the task type
      if (type === 'BOOK' && queueEntry.book !== null) {
        // Steps to download and process a book
        // 1. Select this entry as in-progress
        await prisma.processQueue.update({ where: { id: queueEntry.id }, data: {
          in_progress: true,
          is_done: false,
          result: null,
          book: {
            update: {
              process_progress: 0,
              download_progress: 0,
              downloaded_mb: null,
              total_mb: null,
              speed: null,
            }
          }
        }});
        events.emit('processor.invalidate', { v: '4' });
        unlockProcessQueue();
        // const queueEntrySpecific = await prisma.processQueue.findUnique({
        //   where: { id: queueEntry.id },
        //   include: { book: { include: { book: true }}}
        // });
        let tmpDir: string | undefined = undefined;
        try {
          // We are ready to download the book since the queue entry is locked as ours
          // Create a temporary directory
          tmpDir = tools.createTempDir(queueEntry.book.book.asin);
          // Delete present files relating to this book if they exist, but don't delete the book in the DB
          await tools.cleanBook(queueEntry.book.book.asin);
          // 2. Download the book, updating the book progress as required
          const bookDownload = await audible.cmd.download.download(queueEntry.book.book.asin, queueEntry.id,tmpDir);
          console.log(bookDownload);
          switch (bookDownload) {
            case BookDownloadError.NO_ERROR:
              // Nothing to do, this is the success case
              break;
            case BookDownloadError.AUDIBLE_LOCKED:
              // Audible is locked. We need to try again in a bit. Give this one a delay of a few seconds
              await tryAgainLater(queueEntry.id, type, ATTEMPT_COOLDOWN, ProcessError.AUDIBLE_LOCKED);
              break;
            case BookDownloadError.BOOK_NOT_FOUND:
              // The book could not be found. We can just delete this entry
              await processFailed(queueEntry.id, type, ProcessError.BOOK_NOT_FOUND, 0, 0);
              break;
            case BookDownloadError.CANCELED:
              // The user has canceled. We can just delete this entry
              await processFailed(queueEntry.id, type, ProcessError.CANCELED, 0, 0);
              break;
            case BookDownloadError.NETWORK_ERROR:
              // There was a network error that prevented the download. We can just delete this entry
              await processFailed(queueEntry.id, type, ProcessError.NETWORK_ERROR, 0, 0);
              break;
            case BookDownloadError.NO_PROFILE:
              // This book has no account that owns it. It should be deleted.
              await tools.deleteBook(queueEntry.book.book.asin);
              // Delete this entry
              await processFailed(queueEntry.id, type, ProcessError.NO_PROFILE, 0, 0);
              break;
            case BookDownloadError.NO_PROFILE_WITH_AUTHCODE:
              // The profiles need metadata pulled
              for (const p of queueEntry.book.book.profiles)
                if (p.activation_bytes === null) await audible.cmd.profile.fetchMetadata(p.id, false);
              // We need to re-pull these accounts and make sure there are now bytes. If not, we can't re-add them to the queue
              const book = await prisma.book.findUnique({ where: { asin: queueEntry.book.bookAsin }, include: { profiles: true }});
              // Check if the book still exists
              if (book !== null) {
                // Assume there are no bytes
                let bytes = false;
                // Loop through profiles and if any have bytes, set to true
                for (const p of book.profiles) if (p.activation_bytes !== null) bytes = true;
                // Check if there are bytes
                if (bytes === true) {
                  await tryAgainLater(queueEntry.id, type, ATTEMPT_COOLDOWN_SHORT, ProcessError.NO_PROFILE_WITH_AUTHCODE);
                  break;
                }
              }
              // Delete this queued entry
              await processFailed(queueEntry.id, type, ProcessError.NO_PROFILE_WITH_AUTHCODE, 0, 0);
              break;
            default:
              console.log('ERROR: Unexpected BookDownloadError:', bookDownload);
              // Delete this queued entry
              await processFailed(queueEntry.id, type, bookDownload as unknown as ProcessError, 0, 0);
              break;
          }
          // Only continue if there was no error
          if (bookDownload === BookDownloadError.NO_ERROR) {
            // Update the progress to show the download done
            await prisma.processQueue.update({ where: { id: queueEntry.id }, data: { result: null, book: { update: { download_progress: 1 } } } });
            // 3. Process the book, updating the book progress as required
            const bookProcess = await AAXtoMP3.cmd.convert.exec(queueEntry.book.book.asin, queueEntry.id, tmpDir);
            switch (bookProcess) {
              case ConversionError.NO_ERROR:
                // Nothing to do, this is the success case
                break;
              case ConversionError.BOOK_NOT_FOUND:
                // Delete this queued entry
                await processFailed(queueEntry.id, type, ProcessError.BOOK_NOT_FOUND, 1, 0);
                break;
              case ConversionError.CANCELED:
                // The user has canceled. We can just delete this entry
                await processFailed(queueEntry.id, type, ProcessError.CANCELED, 1, 0);
                break;
              case ConversionError.NO_FOLDER:
                // Delete this queued entry
                await processFailed(queueEntry.id, type, ProcessError.NO_FOLDER, 1, 0);
                // The download must have failed. Set the book as not downloaded
                // Assign the book as downloaded
                await prisma.book.update({
                  where: { asin: queueEntry.book.book.asin },
                  data: { downloaded: false }
                });
                break;
              case ConversionError.NO_PROFILE_WITH_AUTHCODE:
                // The profiles need metadata pulled
                for (const p of queueEntry.book.book.profiles)
                  if (p.activation_bytes === null) await audible.cmd.profile.fetchMetadata(p.id, false);
                // We need to re-pull these accounts and make sure there are now bytes. If not, we can't re-add them to the queue
                const book = await prisma.book.findUnique({ where: { asin: queueEntry.book.bookAsin }, include: { profiles: true } });
                // Check if the book still exists
                if (book !== null) {
                  // Assume there are no bytes
                  let bytes = false;
                  // Loop through profiles and if any have bytes, set to true
                  for (const p of book.profiles) if (p.activation_bytes !== null) bytes = true;
                  // Check if there are bytes
                  if (bytes === true) {
                    await tryAgainLater(queueEntry.id, type, ATTEMPT_COOLDOWN_SHORT, ProcessError.NO_PROFILE_WITH_AUTHCODE);
                    break;
                  }
                }
                // Delete this queued entry
                await processFailed(queueEntry.id, type, ProcessError.NO_PROFILE_WITH_AUTHCODE, 1, 0);
                break;
              case ConversionError.NO_PROFILE:
                // This book has no account that owns it. It should be deleted.
                await tools.deleteBook(queueEntry.book.book.asin);
                // Delete this entry
                await processFailed(queueEntry.id, type, ProcessError.NO_PROFILE, 1, 0);
                break;
              case ConversionError.CONVERSION_ERROR:
                // We had a general error during the conversion process. This could be one of many issues
                // Delete this entry
                await processFailed(queueEntry.id, type, ProcessError.CONVERSION_ERROR, 1, 0);
                break;
              case ConversionError.DESTINATION_NOT_WRITABLE:
                // The destination folder was not writable
                // Delete this entry
                await processFailed(queueEntry.id, type, ProcessError.DESTINATION_NOT_WRITABLE, 1, 0);
              case ConversionError.INVALID_FILE:
                // The file is not valid
                // Delete this entry
                await processFailed(queueEntry.id, type, ProcessError.INVALID_FILE, 1, 0);
              case ConversionError.COULD_NOT_SAVE:
                // Delete this entry
                await processFailed(queueEntry.id, type, ProcessError.COULD_NOT_SAVE, 1, 0);
                break;
              default:
                console.log('ERROR: Unexpected ConversionError:', bookDownload);
                // Delete this queued entry
                await processFailed(queueEntry.id, type, bookDownload as unknown as ProcessError, 1, 0);
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
                  result: ProcessError.NO_ERROR,
                  book: {
                    update: {
                      process_progress: 1,
                      download_progress: 1,
                      speed: null,
                      total_mb: null,
                      downloaded_mb: null,
                    }
                  }
                }
              });
              events.emit('processor.invalidate', { v: '5' });
              // Send a notification
              const notification: types.Notification = {
                id: uuidv4(),
                issuer: 'audible.download' satisfies Issuer,
                icon_path: null,
                icon_color: null,
                identifier: queueEntry.book.book.cover?.url_100 ?? null,
                theme: 'info' satisfies ModalTheme,
                text: `<a href="/library/books/${queueEntry.book.book.asin}">${queueEntry.book.book.title}</a> <span class="text-gray-600">Downloaded</span>`,
                sub_text: new Date().toISOString(),
                linger_time: 10000,
                needs_clearing: true,
                auto_open: true
              }
              await prisma.notification.create({ data: notification });
              events.emit('notification.created', [notification]);
              // Note that books were added and a scan should be issued
              libraryScanShouldBeIssued = true;
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
                  result: 'UNKNOWN' as ProcessError,
                  book: {
                    update: {
                      process_progress: 0,
                      download_progress: 0,
                      speed: null,
                      total_mb: null,
                      downloaded_mb: null,
                    }
                  }
                }
              });
              events.emit('processor.invalidate', { v: '6' });
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
      } else {
        // Not sure what kind of process this is. Delete it.
        await prisma.processQueue.delete({ where: { id: queueEntry.id }});
        queueEntry = await prisma.processQueue.findFirst(getQueueFinder());
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
            // events.emit('process.settings', await settings.getSet('progress'));
            events.emit('processor.invalidate', { v: '7' });

            // Trigger a library scan if it should be issued (IE. we have added at least one book)
            if (libraryScanShouldBeIssued) Plex.triggerAutoScan();
            libraryScanShouldBeIssued = false;
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

    await Plex.reset();

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
    const canceledAudible = audible.cmd.download.cancel(asin);
    const canceledConversion = AAXtoMP3.cmd.convert.cancel(asin);
    await removeBook(asin, ProcessError.CANCELED, !canceledAudible && !canceledConversion);
  }

  /**
   * Get whether or not this book is queued for download (whether it is currently being downloaded or not)
   * @param asin the book
   * @returns true if it is queued for download and processing
   */
  export const getIsQueued = async (asin: string): Promise<boolean> => {
    const element = await prisma.processQueue.findMany({ where: { book: { bookAsin: asin } } });
    return element.length !== 0;
  }

  /**
   * Queue a book to be downloaded and processed
   * @param asin the asin of the book to be downloaded and processed
   */
  export const queueBook = async (asin: string, run = true) => {
    try {
      if (!(await getIsQueued(asin))) {
        // Generate a unique ID that is only a couple characters long. Verify by checking in the DB, but only try this a couple times. Increase the ID size each time to make it
        // more likely that we get a unique ID
        let id = uuidv4().substring(0, 1);
        for (let i = 0; i < 15 && await prisma.processQueue.count({ where: { id } }) > 0; i++) id = uuidv4().substring(0, i + 1);
        await prisma.processQueue.create({
          data: {
            id: id,
            type: types.ProcessType.BOOK,
            book: {
              create: {
                bookAsin: asin
              }
            }
          }
        });
        const queued = await prisma.processQueue.findUnique({ include: validators.processQueueBOOKInclude, where: { id: id, type: types.ProcessType.BOOK } });
        console.log('queued', queued);
        if (queued !== null) events.emit('processor.invalidate', { v: '8' });
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
  export const removeBook = async (asin: string, result: ProcessError = ProcessError.CANCELED, shouldEmitEvent=false): Promise<boolean> => {
    // Find the book in the queue
    try {
      console.log('REMOVE QUEUE', asin);
      // Find by the ASIN and the in_progress tag. This will only capture books that are currently in process. Other
      // books must 
      await prisma.processQueue.updateMany({
        where: {
          in_progress: false,
          is_done: false,
          book: { bookAsin: asin }
        },
        data: {
          is_done: true,
          result
        }
      });
      const eventProcess = await prisma.processQueue.findFirst({ where: { book: { bookAsin: asin }}});
      if (eventProcess !== null) events.emit('processor.invalidate', { v: '9' });
      // The book was found and removed
      return true;
    } catch(e) {
      // The book was not found or could not be removed
      return false;
    }
  }

  /**
   * Get if there are no book processors working at this time
   * @returns if there are no processors working at this time
   */
  export const getNoneWorking = () => {
    return processorPromises.every((p) => p === undefined);
  }

  // export const getProgress = (asin: string) => prisma.progress.findUnique({ where: { id_type: { id: asin, type: PROGRESS_TYPE } } });
  // export const getAllProgress = async () => prisma.progress.findMany({ where: { type: PROGRESS_TYPE } });

}

process.on('SIGINT', LibraryManager.stop);
process.on('SIGTERM', LibraryManager.stop);
process.on('exit', LibraryManager.stop);


// ---------------------------------------------------------------------------------------------
// Cron
// ---------------------------------------------------------------------------------------------
export namespace Cron {

  // -------------------------------------------------------------------------------------------
  // Processor
  // -------------------------------------------------------------------------------------------

  let lastCronStartTime = Math.floor(Date.now() / 1000);
  const checkCronTime = async (debug?: boolean) => {
    const shouldExit = Math.floor(Date.now() / 1000) - lastCronStartTime >= await settings.get('system.cron.maxRun');
    if (debug === true) console.log(`cron time: ${Math.floor(Date.now() / 1000)} : ${lastCronStartTime} | ${shouldExit ? 'Cron will exit' : 'Cron will continue'}`);
    return shouldExit;
  }

  let cronRunning = false;

  let cronRecord: types.Cron.Record | undefined = undefined;

  const process = async () => {
    try {
      const debug = await settings.get('system.debug');
      if (cronRunning) {
        if (debug) console.log('CRON RUNNING - SKIP');
        return;
      }
      // Record the start time of this cron
      lastCronStartTime = Math.floor(Date.now() / 1000);
      // Reset the cron records
      cronRecord = {
        version: 'v2',
        libSync: 0,
        booksAdded: 0,
        booksUpdated: 0,
        plexTest: {
          success: false,
          message: '',
          source: ''
        },
        scanLibrary: {
          success: false,
          result: types.ScanAndGenerate.UNKNOWN_ERROR,
          collectionsGenerated: false,
          message: '',
          messageVerbose: '',
        },
        startTime: lastCronStartTime,
        endTime: lastCronStartTime
      }
      cronRunning = true;
      if (debug) console.log('CRON PROCESS');

      // Test Plex Integration -----------------------------------------------------------------------------
      if (await settings.get('plex.enable') === true) {
        if (debug) console.log('Test Plex Integration');
        const results = await Plex.testPlexConnection(await settings.get('plex.address'), await settings.get('plex.token'));
        if (debug > 1) console.log(results);
        cronRecord.plexTest = results;
      }

      // Library Sync (Audible) ----------------------------------------------------------------------------
      if (await settings.get('general.autoSync') === true) {
        if (debug) console.log('Library Sync Audible');

        // Get the profile from the database
        const profiles = await prisma.profile.findMany();

        // Loop through each profile
        for (const profile of profiles) {
          // Skip the ones that do not auto-sync
          if (!profile.auto_sync) {
            if (debug) console.log(`Skipping ${profile.id} because auto-sync is disabled`);
            continue;
          }
          if (debug) console.log(`Syncing ${profile.id}`);

          // Sync the profile
          const results = await audible.cmd.library.get(profile.id);

          if (results !== null) {
            cronRecord.libSync++;
            cronRecord.booksAdded += results.numCreated;
            cronRecord.booksUpdated += results.numUpdated;
          }

          // Check if the sync worked
          if (debug) {
            if (results !== null) console.log(JSON.stringify(results));
            else console.log('Sync failed');
          }
          if (await checkCronTime(debug > 0)) throw Error('Cron time expired');
        }

        // Check to see if the cron should exit yet
        if (debug) console.log('Library Sync Complete');
      }

      // Check to see if the cron should exit yet
      if (await checkCronTime(debug > 0)) throw Error('Cron time expired');


      // Library Scan and Collection Generate
      if (await settings.get('plex.library.autoScan.enable') === true && await settings.get('plex.enable') === true && await settings.get('plex.library.key') !== '') {
        if (debug) console.log('Library Auto Scan');

        // Start a library scan, then generate if possible
        const results = await Plex.scanAndGenerate();

        if (debug) console.log(results);

        cronRecord.scanLibrary.success = results === types.ScanAndGenerate.NO_ERROR || results === types.ScanAndGenerate.NO_ERROR_COLLECTIONS_DISABLED;
        cronRecord.scanLibrary.result = results;
        cronRecord.scanLibrary.collectionsGenerated = results === types.ScanAndGenerate.NO_ERROR;
        cronRecord.scanLibrary.message = types.scanAndGenerateToStringShort(results);
        cronRecord.scanLibrary.messageVerbose = types.scanAndGenerateToStringLong(results);

        if (debug) console.log('Library Auto Scan Complete');
      }

      // Check to see if the cron should exit yet
      if (await checkCronTime(debug > 0)) throw Error('Cron time expired');


    } finally {
      // Save that the cron is no longer running
      cronRunning = false;
      // Record the end time for the cron
      if (cronRecord !== undefined) {
        cronRecord.endTime = Math.floor(Date.now() / 1000);
      }
      // Save the cron record
      try {
        await settings.set('system.cron.record', JSON.stringify(cronRecord));
      } catch (e) {
        console.log('ERROR: Could not save cron record:', e);
      }
    }

  }

  
  // -------------------------------------------------------------------------------------------
  // Public Functions
  // -------------------------------------------------------------------------------------------

  export const get = () => {
    return global.manager.cronTask;
  }

  /**
   * Start the Cron task
   */
  export const start = async () => {
    
    // Check if we are in debug
    const debug = await settings.get('system.debug');
    const tz = await settings.get('general.timezone') ?? 'UTC';
    if (debug) console.log('start cron with tz:', tz);


    // Stop the current cron if one exists
    if (global.manager.cronTask !== undefined) global.manager.cronTask.stop();

    // Check if the cron is enabled
    if (!await settings.get('system.cron.enable')) {
      if (debug) console.log('Cron failed to start because it is not enabled')
      return false;
    }

    // Get the cron string
    const cronString = await settings.get('system.cron');
    if (debug) console.log(cronString);
    
    // Validate the cron string
    if (!cron.validate(cronString)) {
      if (debug) console.log('Cron failed to start because the cron string is invalid:', cronString);
      return false;
    }

    // Start the cron
    global.manager.cronTask = cron.schedule(cronString, process, { timezone: tz });

    // Start the cron task
    global.manager.cronTask.start();

    // Done
    return true;
  }

  export const stop = async () => {
    if (global.manager.cronTask !== undefined) global.manager.cronTask.stop();
  }

}