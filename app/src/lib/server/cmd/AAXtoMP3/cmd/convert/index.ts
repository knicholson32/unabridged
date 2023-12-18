import * as child_process from 'node:child_process';
import * as fs from 'fs'
import * as settings from '$lib/server/settings';
import prisma from '$lib/server/prisma';
import * as events from '$lib/server/events';
import * as media from '$lib/server/media';
import { AAXtoMP3_COMMAND } from '$lib/server/env';
import { ConversionError } from '../../types';
import { sanitizeFile } from '$lib/server/helpers';
import { Event } from '$lib/types';
import { round } from '$lib/helpers';

// --------------------------------------------------------------------------------------------
// Download helpers
// --------------------------------------------------------------------------------------------

const cancelMap: {
  [key: string]: {
    canceled: boolean,
    proc: child_process.ChildProcessWithoutNullStreams
  }
} = {}

export const cancel = async (asin: string): Promise<boolean> => {
  if (asin in cancelMap) {
    cancelMap[asin].canceled = true;
    cancelMap[asin].proc.kill();
    return true;
  }
  return false;
}

// --------------------------------------------------------------------------------------------
// Download Functions
// --------------------------------------------------------------------------------------------

export const exec = async (asin: string, processID: string, tmpDir: string): Promise<ConversionError> => {
  // Get the book from the DB
  const book = await prisma.book.findUnique({
    where: { asin },
    include: {
      profiles: true,
      authors: true,
      cover: true
    }
  });

  // Check that the book exists and that there is a profile
  if (book === null) return ConversionError.BOOK_NOT_FOUND;
  if (book.profiles.length === 0) return ConversionError.NO_PROFILE;

  // Create the temp folder
  if (!fs.existsSync(tmpDir)) return ConversionError.NO_FOLDER;

  let authCode: string | undefined = undefined;
  let profileID: string | undefined = undefined;
  for (const profile of book.profiles) {
    if (profile.activation_bytes !== null) {
      authCode = profile.activation_bytes;
      profileID = profile.id
      break;
    }
  }

  // Exit if no authcode
  if (authCode === undefined || profileID === undefined) return ConversionError.NO_PROFILE_WITH_AUTHCODE;

  const LIBRARY_FOLDER = await settings.get('library.location');

  // Delete this book from the downloaded library if it exists
  const destinationFolder = `${LIBRARY_FOLDER}/${sanitizeFile(book.authors[0].name)}/${sanitizeFile(book.title)}`;
  console.log('removing / replacing destination folder', destinationFolder);
  try {
    fs.rmSync(destinationFolder, { recursive: true, force: true});
  } catch(e) {
    // Nothing to do
  }
  if (!fs.existsSync(destinationFolder)) fs.mkdirSync(destinationFolder, { recursive: true });


  // Check that the destination folder is writable
  try {
    fs.accessSync(destinationFolder, fs.constants.R_OK | fs.constants.W_OK);
  } catch (err) {
    return ConversionError.DESTINATION_NOT_WRITABLE;
  }

  // Update process progress for process to 0
  await prisma.processQueue.update({ where: { id: processID }, data: { book: { update: { process_progress: 0 } } } });
  events.emitProgress('processor.book', {
    id: processID,
    r: true,
    d: false,
    p: round(0),
    t: Event.Progress.Processor.BOOK.Task.PROCESS
  });

  // AAXtoMP3 -e:m4b -s --author "Martha Wells" --authcode 4165af03 --dir-naming-scheme '$artist/$title' --file-naming-scheme '$title' --use-audible-cli-data -t /app/db/export ./*.aaxc
  // '--debug', `--audible-cli-library-file`, `"/db/audible/${profileID}.library.tsv"`
  // TODO: Save the directory and filename so we can just save them to the DB to make deleting books easier
  const args = ['-e:m4b', `-L`, `/db/audible/${profileID}.library.tsv`, '-s', '--skip-dir-checks', '--author', `"${book.authors[0].name}"`, '--title', `"${book.title}"`, '--authcode', authCode, '--dir-naming-scheme', `'"${sanitizeFile(book.authors[0].name)}/${sanitizeFile(book.title)}"'`, '--file-naming-scheme', `'"${sanitizeFile(book.title)}"'`, '--use-audible-cli-data', '-t', LIBRARY_FOLDER, './*.aaxc']
  // Check if we should use debug mode
  if (await settings.get('system.debug') > 0) args.unshift('--debug');
  console.log(`${AAXtoMP3_COMMAND} ${args.join(' ')}`);
  const aax = child_process.spawn(
    AAXtoMP3_COMMAND,
    args,
    { 
      cwd: tmpDir,
      detached: true,
      shell: true
    }
  );

  // Assign cancel map
  cancelMap[asin] = {
    proc: aax,
    canceled: false
  }

  // Wrap this in a promise so we can respond from this function
  const promise = new Promise<ConversionError>((resolve, reject) => {

    // Create the function for handling data
    const dataProcessorFiles = (d: Buffer) => {
      // Convert the buffer data to a string
      const data = d.toString();

      if (data.indexOf('ERROR') !== -1) {
        console.error(data);
        aax.kill();
        if (data.indexOf('Target Directory does not exist or is not writable') !== -1) {
          reject(ConversionError.DESTINATION_NOT_WRITABLE);
        } else if (data.indexOf('Invalid File') !== -1){
          reject(ConversionError.INVALID_FILE);
        } else {
          reject(ConversionError.CONVERSION_ERROR);
        }
      } else {
        console.log(data.replaceAll('\n', '\\n\n').replaceAll('\r', '\\r\n'));
      }

    }

    const bookRuntime_s = (book.runtime_length_min ?? 0 ) * 60;

    // Create the function for handling data
    const dataProcessorLoading = async (d: Buffer) => {
      // Convert the buffer data to a string
      const data = d.toString();

      // console.log(data.replaceAll('\n', '\\n\n').replaceAll('\r', '\\r\n'));

      const regex = /size=\s+(?<size>[0-9]+)kB\s+time=(?<hr>[0-9][0-9]):(?<min>[0-9][0-9]):(?<sec>[0-9][0-9].[0-9][0-9])\s+bitrate=\s+(?<bitrate>[0-9]+.[0-9])kbits\/s\s*speed=\s*(?<speed>[0-9.e+]+)/;

      type RegexMatchGroups = { size: string, hr: string, min: string, sec: string, bitrate: string, speed: string };

      const groups: RegexMatchGroups = data.match(regex)?.groups as RegexMatchGroups;

      if (groups !== undefined && bookRuntime_s !== 0) {
        const bookTime_s = parseInt(groups.hr) * 3600 + parseInt(groups.min) * 60 + parseFloat(groups.sec);
        let progress = bookTime_s / bookRuntime_s;
        const speed = parseFloat(groups.speed);
        if (!isNaN(progress) && progress > 1) progress = 1;
        try {
          await prisma.processQueue.update({
            where: { id: processID },
            data: {
              book: {
                update: {
                  process_progress: isNaN(progress) ? 0 : progress,
                  speed: isNaN(speed) ? null : speed
                }
              }
            }
          });
          events.emitProgress('processor.book', {
            id: processID,
            r: true,
            d: false,
            p: isNaN(progress) ? 0 : round(progress),
            s: isNaN(speed) ? undefined : speed,
            t: Event.Progress.Processor.BOOK.Task.PROCESS
          });
        } catch (e) {
          console.log('ERR', e);
        }
      }

    }

    // Attach the data processor to the output of the command
    aax.stdout.on('data', dataProcessorFiles)
    aax.stderr.on('data', dataProcessorLoading)

    // Attach to the exit event
    aax.on('exit', async () => {
      if (asin in cancelMap && cancelMap[asin].canceled === true) {
        delete cancelMap[asin];
        resolve(ConversionError.CANCELED);
      } else {
        delete cancelMap[asin];
        resolve(ConversionError.NO_ERROR);
      }
    });
  });

  // Wait for the download to finish
  const results = await promise;


  if (results === ConversionError.NO_ERROR) {
    try {
      // Add the converted file to the media attachments
      await media.saveFile(`${destinationFolder}/${sanitizeFile(book.title)}.m4b`, book.asin, {
        description: 'Playable audio book file',
        title: book.title,
        noCopy: true,
      });

      // Update the progress
      await prisma.processQueue.update({
        where: { id: processID },
        data: {
          book: {
            update: {
              process_progress: 1,
              downloaded_mb: null,
              total_mb: null,
              speed: null
            }
          }
        }
      });
      events.emitProgress('processor.book', {
        id: processID,
        r: true,
        d: false,
        p: 1,
        t: Event.Progress.Processor.BOOK.Task.PROCESS
      });

      // Assign the book as processed
      await prisma.book.update({
        where: { asin: book.asin },
        data: {
          processed: true
        }
      });
    } catch(e) {
      console.log('Conversion error', e);
      return ConversionError.COULD_NOT_SAVE;
    }
  } else {
    // Assign the book as not processed
    await prisma.book.update({
      where: { asin: book.asin },
      data: { processed: false }
    });
  }

  // Delete the tmp folder (if not debug)
  const debug = await settings.get('system.debug');
  if (debug === 0) {
    try {
      fs.rmSync('tmpDir')
    } catch(e) {
      // Nothing to do
    }
  }

  return results;
}