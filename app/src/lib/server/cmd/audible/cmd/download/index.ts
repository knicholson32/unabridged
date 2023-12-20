import * as child_process from 'node:child_process';
import * as fs from 'fs'
import { v4 as uuidv4 } from 'uuid';
import { isLocked } from '../../';
import prisma from '$lib/server/prisma';
import sharp from 'sharp';
import * as helpers from '$lib/helpers';
import * as events from '$lib/server/events';
import * as settings from '$lib/server/settings';
import * as media from '$lib/server/media';
import * as path from 'node:path';
import { BookDownloadError } from '../../types';
import type { AmazonChapterData } from '../../types';
import { writeConfigFile } from '../profile';
import { AUDIBLE_FOLDER, AUDIBLE_CMD } from '$lib/server/env';
import { Event, SourceType } from '$lib/types';
import { LibraryManager } from '$lib/server/cmd';

// --------------------------------------------------------------------------------------------
// Download helpers
// --------------------------------------------------------------------------------------------


// --------------------------------------------------------------------------------------------
// Download Functions
// --------------------------------------------------------------------------------------------

if (global.audible === undefined) global.audible = { instance: undefined, cancelMap: {} };
for (const asin of Object.keys(global.audible.cancelMap)) {
  global.audible.cancelMap[asin].canceled = false;
  global.audible.cancelMap[asin].error = 'UNKNOWN';
  global.audible.cancelMap[asin].proc.kill();
  delete global.audible.cancelMap[asin];
}

// const cancelMap: { [key: string]: {
//   canceled: boolean,
//   proc: child_process.ChildProcessWithoutNullStreams,
//   error: BookDownloadError
// } } = {}

export const cancel = async (asin: string): Promise<boolean> => {
  if (asin in global.audible.cancelMap) {
    global.audible.cancelMap[asin].canceled = true;
    global.audible.cancelMap[asin].proc.kill();
    return true;
  }
  return false;
}

export const download = async (asin: string, processID: string, tmpDir: string): Promise<{e: BookDownloadError, sourceId?: string}> => {
  // Check if audible is locked
  if (isLocked()) return { e: BookDownloadError.AUDIBLE_LOCKED };

  const debug = await settings.get('system.debug');

  if (debug) console.log('Downloading', asin, processID);

  // Get the book from the DB
  const book = await prisma.book.findUnique({ 
    where: { asin: asin },
    include: {
      sources: {
        where: {
          NOT: { audible: null },
          type: SourceType.AUDIBLE
        },
        include: {
          audible: true
        }
      },
      cover: true
    }
  });

  // Check that the book exists and that there is a profile
  if (book === null) return { e: BookDownloadError.BOOK_NOT_FOUND };
  if (book.sources.length === 0) return { e: BookDownloadError.NO_PROFILE };

  let cli_id: string | undefined = undefined;
  let sourceId: string | undefined = undefined;
  for (const source of book.sources) {
    if (source.type === SourceType.AUDIBLE && source.audible !== null) {
      const audibleAccount = source.audible;
      if (audibleAccount.activation_bytes !== null) {
        cli_id = audibleAccount.cli_id;
        sourceId = source.id;
        break;
      }
    }
  }

  if (cli_id === undefined || sourceId === undefined) return { e: BookDownloadError.NO_PROFILE_WITH_AUTHCODE };

  // Update process progress for download to 0
  await prisma.processQueue.update({
    where: { id: processID }, data: {
      book: {
        update: {
          download_progress: 0,
          process_progress: 0
        }
      }
    }
  });
  events.emitProgress('processor.book', processID, {
    r: true,
    d: false,
    p: 0,
    t: Event.Progress.Processor.BOOK.Task.DOWNLOAD
  });

  // Make sure the config file is written
  await writeConfigFile();

  // Create the audible child_process
  // audible -P 175aaff6-4f92-4a2c-b592-6758e1b54e5f download -o /app/db/download/skunk -a B011LR4PW4 --aaxc --pdf --cover --cover-size 1215 --chapter --annotation
  const audible = child_process.spawn(
    AUDIBLE_CMD,
    ['-P', cli_id, 'download', '-o', tmpDir, '-a', asin, '--aaxc', '--pdf', '--cover', '--cover-size', '1215', '--chapter', '--annotation'],
    { env: { AUDIBLE_CONFIG_DIR: AUDIBLE_FOLDER } }
  );

  if (debug) console.log('Audible CLI instance created');

  // Assign cancel map
  global.audible.cancelMap[asin] = {
    proc: audible,
    canceled: false,
    error: BookDownloadError.NO_ERROR
  }

  // Wrap this in a promise so we can respond from this function
  const promise = new Promise<BookDownloadError>((resolve, reject) => {

    // Create the function for handling data
    const dataProcessorFiles = (d: Buffer) => {
      // Convert the buffer data to a string
      const data = d.toString();

      console.log(data.replaceAll('\n', '\\n\n').replaceAll('\r', '\\r\n'));

      // Check for a network error
      if (data.indexOf('audible.exceptions.NetworkError') !== -1) {
        global.audible.cancelMap[asin].error = BookDownloadError.NETWORK_ERROR;
        audible.kill();
      }

    }

    // Create the function for handling data
    const dataProcessorLoading = async (d: Buffer) => {
      // Convert the buffer data to a string
      const data = d.toString();

      const regex = /(?<percent>[0-9]+)%\|[█▉▊▋▌▍▎▏\s]+\| (?<downloaded>[0-9.]+)(?<downloadUnit>[MG])\/(?<total>[0-9.]+)(?<totalUnit>[MG]) \[.+ (?<speed>[0-9.]+)[a-zA-Z]+\/s]/;

      type RegexMatchGroups = { percent: string, downloaded: string, downloadUnit: 'M' | 'G', total: string, totalUnit: 'M' | 'G', speed: string };

      const groups: RegexMatchGroups = data.match(regex)?.groups as RegexMatchGroups;

      if (groups !== undefined) {
        const progress = parseFloat(groups.percent) / 100;
        const downloaded = parseFloat(groups.downloaded) * (groups.downloadUnit === 'M' ? 1 : 1024);
        const total = parseFloat(groups.total) * (groups.totalUnit === 'M' ? 1 : 1024);
        const speed = parseFloat(groups.speed);

        try{
          await prisma.processQueue.update({ 
            where: { id: processID },
            data: {
              book: {
                update: {
                  download_progress: isNaN(progress) ? 0 : progress,
                  downloaded_mb: isNaN(downloaded) ? null : downloaded,
                  total_mb: isNaN(total) ? null : total,
                  speed: isNaN(speed) ? null : speed
                }
              }
            }
          });
          events.emitProgress('processor.book', processID, {
            r: true,
            d: false,
            p: isNaN(progress) ? 0 : helpers.round(progress),
            mb: isNaN(downloaded) ? undefined : downloaded,
            tb: isNaN(total) ? undefined : total,
            s: isNaN(speed) ? undefined : speed,
            t: Event.Progress.Processor.BOOK.Task.DOWNLOAD
          });
        } catch(e) {
          console.log('ERR Process Loading', e);
          // If this errors, the processQueue entry has been deleted.
          // This may have happened because the account was deleted. We are done.
          await LibraryManager.cancelBook(asin);
        }
      }

    }

    // Attach the data processor to the output of the command
    audible.stdout.on('data', dataProcessorFiles)
    audible.stderr.on('data', dataProcessorLoading)

    // Attach to the exit event
    audible.on('exit', async () => {
      if (debug) console.log('Audible CLI exited');
      if (global.audible.cancelMap[asin] !== undefined) {
        if (global.audible.cancelMap[asin].canceled === true) {
          delete global.audible.cancelMap[asin];
          resolve(BookDownloadError.CANCELED);
        } else if (global.audible.cancelMap[asin].error !== BookDownloadError.NO_ERROR) {
          const err = global.audible.cancelMap[asin].error;
          delete global.audible.cancelMap[asin];
          resolve(err);
        } else {
          delete global.audible.cancelMap[asin];
          resolve(BookDownloadError.NO_ERROR);
        }
      } else {
        console.log('audible exit but cancelMap does not exist');
        resolve('UNKNOWN' as BookDownloadError);
      }

    });
  });

  // // Wait for the download to finish
  const results = await promise;

  // Check that there were no errors
  if (results === BookDownloadError.NO_ERROR) {
    // We need to register each artifact

    // Before we get started, we need to see if a cover image was created. If not, we will copy in one we have.
    // This is so the cover can be encoded in the file properly by AAXtoMP3
    // Before we bother, check if we have a cover
    if (book.cover !== null) {
      // We have a cover. Get the files in the directory
      const files = fs.readdirSync(tmpDir);
      // Make a variable to tell if we have found an image
      let foundImage = false;
      // Loop through the files and see if we find an image
      for (const file of files) {
        // If we do, break
        if (path.extname(file) === '.jpg') {
          foundImage = true;
          break;
        }
      }
      // Check if we found an image
      if (foundImage === false) {
        // We didn't. Add one. Must match this format: .*(####).jpg
        // Check if this is a UI Avatars image
        let cover: Buffer;
        if (book.cover.url_500.indexOf('ui-avatars.com')) {
          // We can request a png and convert it to a jpg, otherwise it will be an SVG
          cover = helpers.toBuffer(await (await fetch(book.cover.url_500 + '&format=png')).arrayBuffer());
        } else {
          // Just grab the image
          cover = helpers.toBuffer(await (await fetch(book.cover.url_500)).arrayBuffer());
        }
        // Make sure the image is a jpg
        cover = await sharp(cover).toFormat('jpeg').jpeg({ quality: 100, force: true }).toBuffer();
        // We will name it starting with zzz so AAXtoMP3 picks another image if one exists
        const r = fs.writeFileSync(path.join(tmpDir, 'zzz_provided_cover_(500).jpg'), cover)
        console.log(book.cover.url_500, cover, r);

        if (debug) console.log('Created cover image because one could not be found');
      }
    }

    // Get the files that are in the temp folder
    const filesToAdd = fs.readdirSync(tmpDir);
    const jsonFiles: string[] = [];

    // Remove files associated with this book if any exist
    await prisma.media.deleteMany({ where: { bookAsin: book.asin } });

    // Clean the media folder before we begin
    await media.clean();

    // Add each file
    for (const file of filesToAdd) {
      const extension = path.extname(file);
      console.log('extension', extension);
      let title: string;
      let description: string | undefined = undefined;
      switch(extension) {
        case '.pdf':
          title = path.basename(file, extension).replaceAll('_', ' ');
          description = 'PDF included with the audio book by Audible';
          break;
        case '.aax':
        case '.aaxc':
          // We will skip the protected files, as we will later save the processed one instead
          continue;
        case '.voucher':
          title = book.asin
          description = 'Voucher specifying permission to own this audio book';
          break;
        case '.jpg':
          title = book.title
          description = 'Cover image';
          break;
        case '.json':
          // Skip the JSON files because we'll add those separately
          jsonFiles.push(file);
          continue;
        default:
          title = path.basename(file, extension);
          break;
      }
      // Save the file
      await media.saveFile(tmpDir + '/' + file, book.asin, sourceId, { description, title });
    }

    // Loop through the JSON files
    for (const jsonFile of jsonFiles) {
      try {
        if (jsonFile.endsWith('chapters.json')) {
          const chapterObj = JSON.parse(fs.readFileSync(tmpDir + '/' + jsonFile, 'utf8')) as AmazonChapterData;

          if (chapterObj === undefined || chapterObj === null) continue;
          if (chapterObj.content_metadata === undefined) continue;
          if (chapterObj.content_metadata.chapter_info === undefined) continue;
          if (chapterObj.content_metadata.chapter_info.chapters === undefined) continue;

          // Delete old chapters
          await prisma.chapter.deleteMany({ where: { bookAsin: book.asin } });

          // Delete old branding
          await prisma.branding.deleteMany({ where: { asin: book.asin } });

          // Create new branding
          await prisma.branding.create({ data: {
            asin: book.asin,
            intro_duration_ms: chapterObj.content_metadata.chapter_info.brandIntroDurationMs,
            outro_duration_ms: chapterObj.content_metadata.chapter_info.brandOutroDurationMs
          }});

          let sequence = 0;
          for (const chapter of chapterObj.content_metadata.chapter_info.chapters) {
            if (chapter.chapters !== undefined) {
              // TODO: Process the top-level of chapters as "Parts". See Bobiverse "We Are Legion"
              for (const chapterNested of chapter.chapters) {
                try {
                  await prisma.chapter.create({
                    data: {
                      id: uuidv4(),
                      bookAsin: book.asin,
                      start_offset_ms: chapterNested.start_offset_ms,
                      sequence,
                      title: chapterNested.title,
                      length_ms: chapterNested.length_ms
                    }
                  })
                } catch (e) {
                  console.log('chapter create', e);
                }
                sequence++;
              }
            } else {
              try {
                await prisma.chapter.create({
                  data: {
                    id: uuidv4(),
                    bookAsin: book.asin,
                    start_offset_ms: chapter.start_offset_ms,
                    sequence,
                    title: chapter.title,
                    length_ms: chapter.length_ms
                  }
                })
              } catch (e) {
                console.log('chapter create', e);
              }
              sequence++;
            }
          }
        }
      } catch(e){
        // Nothing to do. Just skip.
      }
    }


    // Assign the book as downloaded
    await prisma.book.update({
      where: { asin: book.asin },
      data: {
        downloaded: true
      }
    });

  } else {
    // Assign the book as not downloaded
    try {
      await prisma.book.update({
        where: { asin: book.asin },
        data: { downloaded: false, processed: false }
      });
    } catch (e) { }
  }

  // Assign progress
  try {
    await prisma.processQueue.update({
      where: { id: processID },
      data: {
        book: {
          update: {
            download_progress: 1,
            downloaded_mb: null,
            total_mb: null,
            speed: null
          }
        }
      }
    });
    events.emitProgress('processor.book', processID, {
      r: true,
      d: false,
      p: 1,
      t: Event.Progress.Processor.BOOK.Task.DOWNLOAD
    });
  } catch (e) { }

  return {
    e: results,
    sourceId: sourceId
  }

}