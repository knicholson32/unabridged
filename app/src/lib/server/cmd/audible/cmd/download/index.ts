import * as child_process from 'node:child_process';
import * as fs from 'fs'
import { v4 as uuidv4 } from 'uuid';
import { isLocked } from '../../';
import prisma from '$lib/server/prisma';
import * as helpers from '$lib/helpers';
import * as aax from '$lib/server/cmd/AAXtoMP3';
import * as media from '$lib/server/media';
import * as path from 'node:path';
import { BookDownloadError } from '../../types';
import type { AmazonChapterData } from '../../types';
import type { Issuer, ModalTheme, ProgressStatus } from '$lib/types';
import { ConversionError } from '$lib/server/cmd/AAXtoMP3/types';

// --------------------------------------------------------------------------------------------
// Download helpers
// --------------------------------------------------------------------------------------------


// --------------------------------------------------------------------------------------------
// Download Functions
// --------------------------------------------------------------------------------------------

export const download = async (asin: string): Promise<BookDownloadError> => {
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

  // Create a temp directory for this library
  const tmpDir = `/tmp/${asin}`;

  // Remove the temp folder and files
  try {
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
  } catch (e) {
    // Nothing to do if this fails
    console.log('unlink', tmpDir, e);
  }
  // Create the temp folder
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

  // Delete any old progress info relating to this sync
  try {
    await prisma.progress.delete({
      where: { id_type: { id: asin, type: 'download' } }
    });
  } catch (e) {
    // Nothing to do
  }

  // Create the progress entry
  await prisma.progress.create({
    data: {
      id: book.asin,
      type: 'download',
      progress: 0,
      status: 'RUNNING' satisfies ProgressStatus,
      ref: 'audible.cmd.download.download',
      message: ''
    }
  });

  // Create the audible child_process
  // audible -P 175aaff6-4f92-4a2c-b592-6758e1b54e5f download -o /app/db/download/skunk -a B011LR4PW4 --aaxc --pdf --cover --cover-size 1215 --chapter --annotation
  const audible = child_process.spawn('audible', ['-P', profileID, 'download', '-o', tmpDir, '-a', asin, '--aaxc', '--pdf', '--cover', '--cover-size', '1215', '--chapter', '--annotation']);

  // Wrap this in a promise so we can respond from this function
  const promise = new Promise<BookDownloadError>((resolve, reject) => {

    // Create the function for handling data
    const dataProcessorFiles = (d: Buffer) => {
      // Convert the buffer data to a string
      const data = d.toString();

      // Chapter file saved to /tmp/B011LR4PW4/Skunk_Works_A_Personal_Memoir_of_My_Years_of_Lockheed-chapters.json.\n
      //
      // File /tmp/B011LR4PW4/Skunk_Works_A_Personal_Memoir_of_My_Years_of_Lockheed_(1215).jpg downloaded in 0:00:00.208721.\n
      //
      // Voucher file saved to /tmp/B011LR4PW4/Skunk_Works_A_Personal_Memoir_of_My_Years_of_Lockheed-AAX_22_64.voucher.\n
      //
      // Annotation file saved to /tmp/B011LR4PW4/Skunk_Works_A_Personal_Memoir_of_My_Years_of_Lockheed-annotations.json.\n
      //
      // File /tmp/B011LR4PW4/Skunk_Works_A_Personal_Memoir_of_My_Years_of_Lockheed.pdf downloaded in 0:00:09.566029.\n
      //
      // File /tmp/B011LR4PW4/Skunk_Works_A_Personal_Memoir_of_My_Years_of_Lockheed-AAX_22_64.aaxc downloaded in 0:00:23.590630.\n
      //
      // The download ended with the following result:\n
      // New aaxc files: 1\n
      // New annotation files: 1\n
      // New chapter files: 1\n
      // New cover files: 1\n
      // New pdf files: 1\n
      // New voucher files: 1\n
      console.log(data.replaceAll('\n', '\\n\n').replaceAll('\r', '\\r\n'));

      // // Add the data from the audible-cli to the running audibleData string
      // audibleData += data;

      // // Keep track of the state so we can see if it changes during this function. This is used
      // // to automatically clear the audibleData string when the state changes
      // const lastState = profileState;

    }

    // Create the function for handling data
    const dataProcessorLoading = async (d: Buffer) => {
      // Convert the buffer data to a string
      const data = d.toString();

      // Chapter file saved to /tmp/B011LR4PW4/Skunk_Works_A_Personal_Memoir_of_My_Years_of_Lockheed-chapters.json.\n
      //
      // File /tmp/B011LR4PW4/Skunk_Works_A_Personal_Memoir_of_My_Years_of_Lockheed_(1215).jpg downloaded in 0:00:00.208721.\n
      //
      // Voucher file saved to /tmp/B011LR4PW4/Skunk_Works_A_Personal_Memoir_of_My_Years_of_Lockheed-AAX_22_64.voucher.\n
      //
      // Annotation file saved to /tmp/B011LR4PW4/Skunk_Works_A_Personal_Memoir_of_My_Years_of_Lockheed-annotations.json.\n
      //
      // File /tmp/B011LR4PW4/Skunk_Works_A_Personal_Memoir_of_My_Years_of_Lockheed.pdf downloaded in 0:00:09.566029.\n
      //
      // File /tmp/B011LR4PW4/Skunk_Works_A_Personal_Memoir_of_My_Years_of_Lockheed-AAX_22_64.aaxc downloaded in 0:00:23.590630.\n
      //
      // The download ended with the following result:\n
      // New aaxc files: 1\n
      // New annotation files: 1\n
      // New chapter files: 1\n
      // New cover files: 1\n
      // New pdf files: 1\n
      // New voucher files: 1\n
      const regex = /(?<percent>[0-9]+)%\|[█▉▊▋▌▍▎▏\s]+\| (?<downloaded>[0-9.]+)[MG]\/(?<total>[0-9.]+)[MG] \[.+ (?<speed>[0-9.]+)[a-zA-Z]+\/s]/;

      type RegexMatchGroups = { percent: string, downloaded: string, total: string, speed: string };

      const groups: RegexMatchGroups = data.match(regex)?.groups as RegexMatchGroups;

      if (groups !== undefined) {
        const progress = parseFloat(groups.percent) / 100;
        const downloaded = parseFloat(groups.downloaded);
        const total = parseFloat(groups.total);
        const speed = parseFloat(groups.speed);

        try{
          await prisma.progress.update({
            where: {
              id_type: {
                id: book.asin,
                type: 'download'
              }
            },
            data: {
              progress: isNaN(progress) ? undefined : progress,
              downloaded_mb: isNaN(downloaded) ? undefined : downloaded,
              total_mb: isNaN(total) ? undefined : total,
              speed_mb_s: isNaN(speed) ? undefined : speed
            }
          });
        } catch(e) {
          console.log('ERR', e);
        }
      }

      // // Add the data from the audible-cli to the running audibleData string
      // audibleData += data;

      // // Keep track of the state so we can see if it changes during this function. This is used
      // // to automatically clear the audibleData string when the state changes
      // const lastState = profileState;

    }

    // Attach the data processor to the output of the command
    audible.stdout.on('data', dataProcessorFiles)
    audible.stderr.on('data', dataProcessorLoading)

    // Attach to the exit event
    audible.on('exit', async () => {
      try {
        await prisma.progress.update({
          where: {
            id_type: {
              id: book.asin,
              type: 'download'
            }
          },
          data: {
            progress: 1,
            status: 'DONE' satisfies ProgressStatus
          }
        });
      } catch(e) {
        // Nothing to do
      }
      resolve(BookDownloadError.NO_ERROR);
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
            } catch(e) {
              console.log('chapter create', e);
            }
            sequence++;
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

    // Process the book
    let results: ConversionError | undefined = undefined;
    
    try {
      results = await aax.cmd.convert.exec(book.asin);
    } catch(e) {
      // Nothing to do
      console.log('Conversion crash', e);
    }

    if (results !== ConversionError.NO_ERROR) {
      // Remove the temp folder and files
      console.log('conversion failure', results);
      try {
        if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
      } catch (e) {
        // Nothing to do if this fails
        console.log('unlink', tmpDir, e);
      }
      return BookDownloadError.CONVERSION_ERROR;
    }

    console.log('Create notification');
    await prisma.notification.create({
      data: {
        id: uuidv4(),
        issuer: 'audible.download' satisfies Issuer,
        identifier: book.cover?.url_100,
        theme: 'info' satisfies ModalTheme,
        text: `<a href="/library/books/${book.asin}">${book.title}</a> <span class="text-gray-600">Downloaded</span>`,
        sub_text: new Date().toISOString(),
        linger_time: 10000,
        needs_clearing: true,
        auto_open: true
      }
    });
  }

  // Remove the temp folder and files
  try {
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
  } catch(e) {
    // Nothing to do if this fails
    console.log('unlink', tmpDir, e);
  }

  return BookDownloadError.NO_ERROR;

}