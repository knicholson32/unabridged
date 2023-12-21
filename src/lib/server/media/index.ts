import type { Prisma } from '@prisma/client';
import { MEDIA_FOLDER } from '$lib/server/env';
import * as child_process from 'node:child_process';
import prisma from '$lib/server/prisma';
import * as mime from 'mime-types';
import * as fs from 'node:fs';
import * as path from 'node:path'
import { v4 as uuidv4 } from 'uuid';

export type Media = Prisma.MediaGetPayload<{}>;

/**
 * Save a file to a book
 * @param srcPath the path of the file to be saved
 * @param asin the asin of the book to attach the file to
 * @param title the title of the file to save (optional)
 * @returns the ID of the saved file
 */
export const saveFile = async (srcPath: string, asin: string, sourceId: string, options?: { description?: string, title?: string, noCopy?: boolean }): Promise<string> => {
  // Create an ID for this file
  const id = uuidv4();

  console.log('Saving', srcPath, asin);

  if (options === undefined) options = {};

  srcPath = `${srcPath.replaceAll('"', '')}`;

  let extension = path.extname(srcPath);
  if (extension.charAt(0) == '.') extension = extension.substring(1);

  const stat = fs.statSync(srcPath);
  console.log('Made it here!');
  let data: Buffer | undefined = undefined;

  if (options.noCopy === true) {
    console.log('Added via path!');
  } else {
    if (stat.size > 1000000) {
      // Copy the file using the system cp
      if (!fs.existsSync(MEDIA_FOLDER)) fs.mkdirSync(MEDIA_FOLDER, { recursive: true });
      await new Promise<void>((resolve) => {
        child_process.exec(`/bin/cp -f "${srcPath}" "${MEDIA_FOLDER}/${id}"`, () => resolve());
      });
      console.log('Added via file!');
    } else {
      data = fs.readFileSync(srcPath);
      console.log('Added via db!');
    }
  }

  if (options.title === undefined) options.title = path.basename(srcPath, extension);

  await prisma.media.create({
    data: {
      id,
      bookAsin: asin,
      extension,
      title: options.title,
      data,
      sourceId,
      path: options.noCopy === true ? srcPath : undefined,
      size_b: stat.size,
      description: options.description,
      is_file: data === undefined,
      content_type: mime.contentType(extension) || 'application/octet-stream'
    }
  });

  return id;
}

/**
 * Delete a file by media ID
 * @param id the file to delete
 */
export const deleteFile = async (id: string) => {
  try{ 
    await prisma.media.delete({ where: { id } });
  } catch(e) {
    // Nothing to do
  }
  await clean();
}


/**
 * Delete hanging files or DB entries that don't exist on both sides
 */
export const clean = async () => {
  // While we are here, prune the media folder
  const dbFiles = (await prisma.media.findMany({
    select: {
      id: true,
      is_file: true,
      path: true
    }
  }));

  // Create the media folder if it doesn't exist
  if (!fs.existsSync(MEDIA_FOLDER)) fs.mkdirSync(MEDIA_FOLDER, { recursive: true });

  // Get the files that are actually in the folder
  const presentFiles = fs.readdirSync(MEDIA_FOLDER);

  // Delete files that aren't supposed to be there
  // TODO: Delete db entries that don't have a file
  const dbToRemove: string[] = [];
  for (const f of presentFiles) if (dbFiles.findIndex((e) => e.id === f) === -1) fs.unlinkSync(MEDIA_FOLDER + '/' + f);
  for (const f of dbFiles) {
    if (f.path !== null) {
      if (!fs.existsSync(f.path)) {
        dbToRemove.push(f.id);
      }
    } else if (f.is_file === true && !presentFiles.includes(f.id)) dbToRemove.push(f.id);
  }

  await prisma.media.deleteMany({ where: { id: { in: dbToRemove } } });
}