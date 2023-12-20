// import { LIBRARY_FOLDER } from "$lib/server/env";
import prisma from "$lib/server/prisma";
import * as fs from 'node:fs';
import * as media from '$lib/server/media';
import * as settings from '$lib/server/settings';
import sanitize from "sanitize-filename";
import { sanitizeFile } from "$lib/server/helpers";

/**
 * Create a temporary directory based on an asin
 * @param asin the asin
 * @returns the created directory
 */
export const createTempDir = (asin: string): string => {
  let tmpDir = `/tmp/${asin}`;
  // Remove the temp folder and files
  try {
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
  } catch (e) {
    // Nothing to do if this fails
    console.log('unlink', tmpDir, e);
  }
  // Create the temp folder
  if (!fs.existsSync(tmpDir)) {
    try {
      fs.mkdirSync(tmpDir);
    } catch(e) {
      tmpDir = fs.mkdtempSync(asin);
    }
  } 
  return tmpDir;
}

/**
 * Clear a directory
 * @param dir 
 */
export const clearDir = (dir: string) => {
  try {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
  } catch (e) {
    // Nothing to do if this fails
  }
}

/**
 * Deletes the physical download and media for a book, but does not remove the book from the DB.
 * @param asin 
 */
export const cleanBook = async (asin: string) => {
  const book = await prisma.book.findUnique({ where: { asin }, include: { authors: true } });
  if (book === null || book === undefined) return;
  // Delete all the physical files that are associated with books that just got deleted
  const debug = await settings.get('system.debug') > 0;
  const LIBRARY_FOLDER = await settings.get('library.location');
  try {
    const rm = `${LIBRARY_FOLDER}/${sanitizeFile(book.authors[0].name)}/${sanitizeFile(book.title)}`;
    if (debug) console.log('Remove', rm);
    fs.rmSync(rm, { recursive: true, force: true });
  } catch (e) {
    if (debug) console.log(e);
    // Nothing to do if it didn't exist anyway
  }
  // TODO: Clean authors if there are no more books present
  await prisma.media.deleteMany({ where: { bookAsin: book.asin } });
  await prisma.book.update({ where: { asin }, data: { downloaded: false, processed: false } });
  await media.clean();
}

/**
 * Deletes the physical download and media for a book, but does not remove the book from the DB.
 * @param asin 
 */
export const cleanSeries = async (id: string) => {
  const series = await prisma.series.findUnique({ where: { id }, include: { books: { include: { authors: true } } } });
  if (series === null || series === undefined) return;
  const debug = await settings.get('system.debug') > 0;
  const LIBRARY_FOLDER = await settings.get('library.location');
  for (const book of series.books) {
    // Delete all the physical files that are associated with books that just got deleted
    try {
      const rm = `${LIBRARY_FOLDER}/${sanitizeFile(book.authors[0].name)}/${sanitizeFile(book.title)}`;
      if (debug) console.log('Remove', rm)
      fs.rmSync(rm, { recursive: true, force: true });
    } catch (e) {
      // Nothing to do if it didn't exist anyway
      if (debug) console.log(e);
    }
    await prisma.media.deleteMany({ where: { bookAsin: book.asin } });
    try {
      await prisma.book.update({ where: { asin: book.asin }, data: { downloaded: false, processed: false } });
    } catch (e) {
      console.log('ERR cleanSeries', e);
    }
  }
  // TODO: Clean authors if there are no more books present
  await media.clean();
}

/**
 * Delete a book from the DB and remove associated files
 * @param asin the book to delete
 */
export const deleteBook = async (asin: string) => {
  const book = await prisma.book.findUnique({ where: { asin }, include: { authors: true } });
  if (book === null || book === undefined) return;
  try {
    await prisma.book.delete({ where: { asin: book.asin } });
  } catch(e) {
    // Nothing to do if it didn't exist anyway
  }
  // Clean the rest of the DB / files
  await cleanAll();
}

/**
 * Delete an account and the associated books
 * @param id the account to delete
 */
export const deleteSource = async (id: string) => {
  try {
    await prisma.source.delete({ where: { id } });
  } catch (e) {
    // Nothing to do if it didn't exist anyway
    // console.log('ERROR:','deleting source', e, 'end of message');
  }
  // Clean the rest of the DB / files
  await cleanAll();
}

/**
 * Clean all books and elements that are hanging
 */
export const cleanAll = async () => {
  // TODO: BUG: There is a bug where if the account that has the book gets deleted, the files get removed but
  //       the DB entry for the book still has downloaded and processed = true
  console.log('CLEAN!');
  try {
    const books = await prisma.book.findMany({
      where: { sources: { none: {} } },
      include: { authors: true }
    });
    await prisma.book.deleteMany({ where: { sources: { none: {} } } });
    const authors = await prisma.author.findMany({ where: { books: { none: {} } } });
    await prisma.series.deleteMany({ where: { books: { none: {} } } });
    await prisma.author.deleteMany({ where: { books: { none: {} } } });
    await prisma.narrator.deleteMany({ where: { books: { none: {} } } });
    await prisma.genre.deleteMany({ where: { books: { none: {} } } });

    const debug = await settings.get('system.debug') > 0;
    const LIBRARY_FOLDER = await settings.get('library.location');

    // Delete all the physical files that are associated with books that just got deleted
    for (const book of books) {
      try {
        const rm = `${LIBRARY_FOLDER}/${sanitizeFile(book.authors[0].name)}/${sanitizeFile(book.title)}`;
        if (debug) console.log('Remove', rm)
        fs.rmSync(rm, { recursive: true, force: true });
        await prisma.book.update({ where: { asin: book.asin }, data: { downloaded: false, processed: false }});
      } catch (e) {
        // Nothing to do if it didn't exist anyway
      }
    }
    // Delete all the physical files that are associated with authors that just got deleted
    for (const author of authors) {
      try {
        const rm = `${LIBRARY_FOLDER}/${sanitizeFile(author.name)}`;
        if (debug) console.log('Remove', rm)
        fs.rmSync(rm, { recursive: true, force: true });
      } catch (e) {
        // Nothing to do if it didn't exist anyway
      }
    }
    await media.clean();
  } catch (e) {
    // Nothing to do if it didn't exist anyway
    console.log('clean all failed', e);
  }
}
