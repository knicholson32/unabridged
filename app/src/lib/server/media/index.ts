import type { Prisma } from '@prisma/client';
import { MEDIA_FOLDER } from '$env/static/private';
import prisma from '$lib/server/prisma';
import * as mime from 'mime-types';
import * as fs from 'node:fs/promises';
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
export const saveFile = async (srcPath: string, asin: string, title?: string): Promise<string> => {
  // Create an ID for this file
  const id = uuidv4();

  const extension = path.extname(srcPath);
  await fs.copyFile(srcPath, MEDIA_FOLDER + '/' + id);

  if (title === undefined) title = path.basename(srcPath);

  await prisma.media.create({
    data: {
      id,
      bookAsin: asin,
      extension,
      title,
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
      id: true
    }
  })).map((f) => f.id);

  // Get the files that are actually in the folder
  const presentFiles = await fs.readdir(MEDIA_FOLDER);

  // Delete files that aren't supposed to be there
  // TODO: Delete db entries that don't have a file
  const promises: Promise<void>[] = [];
  const dbToRemove: string[] = [];
  for (const f of presentFiles) if (!dbFiles.includes(f)) promises.push(fs.unlink(MEDIA_FOLDER + '/' + f));
  for (const f of dbFiles) if (!presentFiles.includes(f)) dbToRemove.push(f);

  // Wait for all the files to be deleted
  await Promise.allSettled(promises);
  await prisma.media.deleteMany({ where: { id: { in: dbToRemove } } });
}