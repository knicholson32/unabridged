import * as child_process from 'node:child_process';
import * as fs from 'fs'
import { v4 as uuidv4 } from 'uuid';
import { isLocked } from '../../';
import prisma from '$lib/server/prisma';
import * as helpers from '$lib/helpers';
import * as tools from '$lib/server/cmd/tools';
import * as aax from '$lib/server/cmd/AAXtoMP3';
import * as media from '$lib/server/media';
import * as path from 'node:path';
import { BookDownloadError } from '../../types';
import type { AmazonChapterData } from '../../types';
import type { Issuer, ModalTheme, ProgressStatus } from '$lib/types';
import { ConversionError } from '$lib/server/cmd/AAXtoMP3/types';
import { writeConfigFile } from '../profile';
import { AUDIBLE_FOLDER, AUDIBLE_CMD } from '$lib/server/env';

// --------------------------------------------------------------------------------------------
// Download helpers
// --------------------------------------------------------------------------------------------


// --------------------------------------------------------------------------------------------
// Download Functions
// --------------------------------------------------------------------------------------------

const cancelMap: { [key: string]: {
  canceled: boolean,
  proc: child_process.ChildProcessWithoutNullStreams
} } = {}

export const cancel = async (asin: string) => {
  if (asin in cancelMap) {
    cancelMap[asin].canceled = true;
    cancelMap[asin].proc.kill();
  }
}

export const download = async (asin: string, processID: string, tmpDir: string): Promise<BookDownloadError> => {
  // Check if audible is locked
  if (isLocked()) return BookDownloadError.AUDIBLE_LOCKED;

  // Get the book from the DB
  const book = await prisma.book.findUnique({ 
    where: { asin },
    include: {
      profiles: true,
      cover: true
    }
  });

  // Check that the book exists and that there is a profile
  if (book === null) return BookDownloadError.BOOK_NOT_FOUND;
  if (book.profiles.length === 0) return BookDownloadError.NO_PROFILE;

  let profileID: string | undefined = undefined;
  for (const profile of book.profiles) {
    if (profile.activation_bytes !== null) {
      profileID = profile.id
      break;
    }
  }

  if (profileID === undefined) return BookDownloadError.NO_PROFILE_WITH_AUTHCODE;

  // Make sure the config file is written
  await writeConfigFile();

  // Update process progress for download to 0
  await prisma.processQueue.update({ where: { id: processID }, data: { download_progress: 0 } });

  // // Create the progress entry
  // await prisma.progress.create({
  //   data: {
  //     id: book.asin,
  //     type: 'download',
  //     progress: 0,
  //     status: 'RUNNING' satisfies ProgressStatus,
  //     ref: 'audible.cmd.download.download',
  //     message: ''
  //   }
  // });

  // Create the audible child_process
  // audible -P 175aaff6-4f92-4a2c-b592-6758e1b54e5f download -o /app/db/download/skunk -a B011LR4PW4 --aaxc --pdf --cover --cover-size 1215 --chapter --annotation
  const audible = child_process.spawn(
    AUDIBLE_CMD,
    ['-P', profileID, 'download', '-o', tmpDir, '-a', asin, '--aaxc', '--pdf', '--cover', '--cover-size', '1215', '--chapter', '--annotation'],
    { env: { AUDIBLE_CONFIG_DIR: AUDIBLE_FOLDER } }
  );

  // Assign cancel map
  cancelMap[asin] = {
    proc: audible,
    canceled: false
  }

  // Wrap this in a promise so we can respond from this function
  const promise = new Promise<BookDownloadError>((resolve, reject) => {

    // Create the function for handling data
    const dataProcessorFiles = (d: Buffer) => {
      // Convert the buffer data to a string
      const data = d.toString();

      console.log(data.replaceAll('\n', '\\n\n').replaceAll('\r', '\\r\n'));

    }

    // Create the function for handling data
    const dataProcessorLoading = async (d: Buffer) => {
      // Convert the buffer data to a string
      const data = d.toString();

      const regex = /(?<percent>[0-9]+)%\|[█▉▊▋▌▍▎▏\s]+\| (?<downloaded>[0-9.]+)[MG]\/(?<total>[0-9.]+)[MG] \[.+ (?<speed>[0-9.]+)[a-zA-Z]+\/s]/;

      type RegexMatchGroups = { percent: string, downloaded: string, total: string, speed: string };

      const groups: RegexMatchGroups = data.match(regex)?.groups as RegexMatchGroups;

      if (groups !== undefined) {
        const progress = parseFloat(groups.percent) / 100;
        const downloaded = parseFloat(groups.downloaded);
        const total = parseFloat(groups.total);
        const speed = parseFloat(groups.speed);

        try{
          // await prisma.progress.update({
          //   where: {
          //     id_type: {
          //       id: book.asin,
          //       type: 'download'
          //     }
          //   },
          //   data: {
          //     progress: isNaN(progress) ? undefined : progress,
          //     downloaded_mb: isNaN(downloaded) ? undefined : downloaded,
          //     total_mb: isNaN(total) ? undefined : total,
          //     speed_mb_s: isNaN(speed) ? undefined : speed
          //   }
          // });
          await prisma.processQueue.update({ 
            where: { id: processID },
            data: { 
              download_progress: isNaN(progress) ? 0 : progress,
              downloaded_mb: isNaN(downloaded) ? null : downloaded,
              total_mb: isNaN(total) ? null : total,
              speed: isNaN(speed) ? null : speed
            }
          });
        } catch(e) {
          console.log('ERR', e);
        }
      }

    }

    // Attach the data processor to the output of the command
    audible.stdout.on('data', dataProcessorFiles)
    audible.stderr.on('data', dataProcessorLoading)

    // Attach to the exit event
    audible.on('exit', async () => {
      if (cancelMap[asin].canceled === true) {
        delete cancelMap[asin];
        resolve(BookDownloadError.CANCELED);
      } else {
        delete cancelMap[asin];
        resolve(BookDownloadError.NO_ERROR);
      }

    });
  });

  // // Wait for the download to finish
  const results = await promise;

  // Check that there were no errors
  if (results === BookDownloadError.NO_ERROR) {
    // We need to register each artifact

    // Get the files that are in the temp folder
    const filesToAdd = fs.readdirSync(tmpDir);
    const jsonFiles: string[] = [];

    // Remove files associated with this book if any exist
    await prisma.media.deleteMany({ where: { bookAsin: book.asin } })

    // Clean the media folder before we begin
    await media.clean()

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
      await media.saveFile(tmpDir + '/' + file, book.asin, { description, title });
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
    // Assign the book as downloaded
    await prisma.book.update({
      where: { asin: book.asin },
      data: { downloaded: false, processed: false }
    });
  }

  // Assign progress
  await prisma.processQueue.update({
    where: { id: processID },
    data: {
      download_progress: 1,
      downloaded_mb: null,
      total_mb: null,
      speed: null
    }
  });

  return results;

}