import * as child_process from 'node:child_process';
import * as fs from 'fs'
import { v4 as uuidv4 } from 'uuid';
import prisma from '$lib/server/prisma';
import * as helpers from '$lib/helpers';
import * as media from '$lib/server/media';
import { LIBRARY_FOLDER } from '$env/static/private';
import * as path from 'node:path';
import type { Issuer, ModalTheme, ProgressStatus } from '$lib/types';
import { ConversionError } from '../../types';

// --------------------------------------------------------------------------------------------
// Download helpers
// --------------------------------------------------------------------------------------------


// --------------------------------------------------------------------------------------------
// Download Functions
// --------------------------------------------------------------------------------------------

export const exec = async (asin: string): Promise<ConversionError> => {
  // Get the book from the DB
  const book = await prisma.book.findUnique({
    where: { asin },
    include: {
      profiles: true,
      authors: true,
    }
  });

  // Check that the book exists and that there is a profile
  if (book === null) return ConversionError.BOOK_NOT_FOUND;
  if (book.profiles.length === 0) return ConversionError.NO_PROFILE;

  // Create a temp directory for this library
  const tmpDir = `/tmp/${asin}`;

  // Create the temp folder
  if (!fs.existsSync(tmpDir)) return ConversionError.FILES_DONT_EXIST;

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

  // Delete this book from the downloaded library if it exists
  const destinationFolder = LIBRARY_FOLDER + '/' + book.authors[0].name + '/' + book.title + '/';
  try {
    fs.rmSync(destinationFolder, { recursive: true, force: true});
  } catch(e) {
    // Nothing to do
  }
  if (!fs.existsSync(destinationFolder)) fs.mkdirSync(destinationFolder, { recursive: true });

  // Delete any old progress info relating to this sync
  try {
    await prisma.progress.delete({
      where: { id_type: { id: asin, type: 'process' } }
    });
  } catch (e) {
    // Nothing to do
  }

  // Create the progress entry
  await prisma.progress.create({
    data: {
      id: book.asin,
      type: 'process',
      progress: 0,
      status: 'RUNNING' satisfies ProgressStatus,
      ref: 'AAXtoMP3.cmd.convert.exec',
      message: ''
    }
  });

  // AAXtoMP3 -e:m4b -s --author "Martha Wells" --authcode 4165af03 --dir-naming-scheme '$artist/$title' --file-naming-scheme '$title' --use-audible-cli-data -t /app/db/export ./*.aaxc
  const args = ['-e:m4b', '-s', '--author', `"${book.authors[0].name}"`, '--authcode', authCode, '--dir-naming-scheme', `'${book.authors[0].name}/${book.title}'`, '--file-naming-scheme', `'${book.title}'`, '--use-audible-cli-data', '-t', LIBRARY_FOLDER, './*.aaxc']
  console.log(`AAXtoMP3 ${args.join(' ')}`);
  const aax = child_process.spawn(
    'AAXtoMP3',
    args,
    { 
      cwd: tmpDir,
      detached: true,
      shell: true
    }
  );

  // Wrap this in a promise so we can respond from this function
  const promise = new Promise<ConversionError>((resolve, reject) => {

    // Create the function for handling data
    const dataProcessorFiles = (d: Buffer) => {
      // Convert the buffer data to a string
      const data = d.toString();

      if (data.indexOf('ERROR') !== -1) {
        console.error(data);
        reject(ConversionError.CONVERSION_ERROR)
      }

      console.log(data.replaceAll('\n', '\\n\n').replaceAll('\r', '\\r\n'));

    }


    const bookRuntime_s = (book.runtime_length_min ?? 0 ) * 60;

    // Create the function for handling data
    const dataProcessorLoading = async (d: Buffer) => {
      // Convert the buffer data to a string
      const data = d.toString();

      const regex = /size=\s+(?<size>[0-9]+)kB\s+time=(?<hr>[0-9][0-9]):(?<min>[0-9][0-9]):(?<sec>[0-9][0-9].[0-9][0-9])\s+bitrate=\s+(?<bitrate>[0-9]+.[0-9])kbits/;

      type RegexMatchGroups = { size: string, hr: string, min: string, sec: string, bitrate: string };

      const groups: RegexMatchGroups = data.match(regex)?.groups as RegexMatchGroups;

      if (groups !== undefined && bookRuntime_s !== 0) {
        const bookTime_s = parseInt(groups.hr) * 3600 + parseInt(groups.min) * 60 + parseFloat(groups.sec);
        let progress = bookTime_s / bookRuntime_s;
        if (!isNaN(progress) && progress > 1) progress = 1;
        try {
          await prisma.progress.update({
            where: {
              id_type: {
                id: book.asin,
                type: 'process'
              }
            },
            data: {
              progress: isNaN(progress) ? undefined : progress
            }
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
      try {
        await prisma.progress.update({
          where: {
            id_type: {
              id: book.asin,
              type: 'process'
            }
          },
          data: {
            progress: 1,
            status: 'DONE' satisfies ProgressStatus
          }
        });
      } catch (e) {
        // Nothing to do  
      }
      resolve(ConversionError.NO_ERROR);
    });
  });

  // Wait for the download to finish
  const results = await promise;

  // Add the converted file to the media attachments
  await media.saveFile(destinationFolder + '/' + book.title + '.m4b', book.asin, {
    description: 'Playable audio book file',
    title: book.title,
    noCopy: true,
  });

  // Assign the book as processed
  await prisma.book.update({
    where: { asin: book.asin },
    data: {
      processed: true
    }
  });

  return results;
}