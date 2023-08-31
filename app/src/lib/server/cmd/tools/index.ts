import { LIBRARY_FOLDER } from "$lib/server/env";
import prisma from "$lib/server/prisma";
import * as fs from 'node:fs';
import * as media from '$lib/server/media';
import sanitize from "sanitize-filename";

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
  try {
    fs.rmSync(`${LIBRARY_FOLDER}/${sanitize(book.authors[0].name)}/${sanitize(book.title)}`, { recursive: true, force: true });
  } catch (e) {
    // Nothing to do if it didn't exist anyway
  }
  // // Delete all the physical files that are associated with authors that just got deleted
  // for (const author of book.authors) {
  //   try {
  //     fs.rmSync(`${LIBRARY_FOLDER}/${sanitize(author.name)}`, { recursive: true, force: true });
  //   } catch (e) {
  //     // Nothing to do if it didn't exist anyway
  //   }
  // }
  await prisma.media.deleteMany({ where: { bookAsin: book.asin } });
  await prisma.book.update({ where: { asin }, data: { downloaded: false, processed: false }});
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
  try {
    await prisma.progress.deleteMany({ where: { id: book.asin } });
  } catch (e) {
    // Nothing to do if it didn't exist anyway
  }
  // Clean the rest of the DB / files
  await cleanAll();
}

/**
 * Delete an account and the associated books
 * @param id the account to delete
 */
export const deleteAccount = async (id: string) => {
  try {
    await prisma.profile.delete({ where: { id } });
  } catch (e) {
    // Nothing to do if it didn't exist anyway
  }
  try {
    await prisma.progress.deleteMany({ where: { id } });
  } catch (e) {
    // Nothing to do if it didn't exist anyway
  }
  // Clean the rest of the DB / files
  await cleanAll();
}

/**
 * Clean all books and elements that are hanging
 */
export const cleanAll = async () => {
  console.log('CLEAN!');
  try {
    const books = await prisma.book.findMany({
      where: { profiles: { none: {} } },
      include: { authors: true }
    });
    await prisma.book.deleteMany({ where: { profiles: { none: {} } } });
    const authors = await prisma.author.findMany({ where: { books: { none: {} } } });
    await prisma.series.deleteMany({ where: { books: { none: {} } } });
    await prisma.author.deleteMany({ where: { books: { none: {} } } });
    await prisma.narrator.deleteMany({ where: { books: { none: {} } } });
    await prisma.genre.deleteMany({ where: { books: { none: {} } } });

    // Delete all the physical files that are associated with books that just got deleted
    for (const book of books) {
      try {
        fs.rmSync(`${LIBRARY_FOLDER}/${sanitize(book.authors[0].name)}/${sanitize(book.title)}`, { recursive: true, force: true });
      } catch (e) {
        // Nothing to do if it didn't exist anyway
      }
    }
    // Delete all the physical files that are associated with authors that just got deleted
    for (const author of authors) {
      try {
        fs.rmSync(`${LIBRARY_FOLDER}/${sanitize(author.name)}`, { recursive: true, force: true });
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
