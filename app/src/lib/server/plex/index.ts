import * as types from './types';
import type * as publicTypes from '$lib/types';
import * as settings from '$lib/server/settings';
import prisma from '../prisma';
import * as helpers from '$lib/server/helpers';
import Fuse from 'fuse.js';
import fetch, { AbortError } from 'node-fetch';
import type { Prisma } from '@prisma/client';

export * as types from './types';


const getAPITimeout = async () => {
  const apiTimeout = await settings.get('plex.apiTimeout');
  if (apiTimeout > 10000) return 10000;
  return apiTimeout;
}


// AbortController was added in node v14.17.0 globally
const AbortController = globalThis.AbortController || await import('abort-controller')

export const testPlexConnection = async (address: string, token: string, saveData = true): Promise<publicTypes.ConnectionTestResult> => {
  // Set the default source (if we don't have a better source to blame for the issue)
  const defaultSource: settings.TypeName = 'plex.address';

  // Get debug
  const debug = await settings.get('system.debug');

  // Get the plex URL and make sure it makes sense
  let plexURL = helpers.removeTrailingSlashes(address);
  if (plexURL === '') return { success: false,source: 'plex.address',  message: 'Plex URL is not set. Enter a valid URL.' };
  if (!plexURL.startsWith('http')) return { success: false, source: 'plex.address', message: 'Plex URL must start with \'http\' or \'https\'.' };

  // Get the plex token and make sure it exists
  const plexToken = token;
  if (plexToken === '') return { success: false, source: 'plex.token', message: 'Plex token is not set. Sign in or input a valid token.' };

  // Create an abort contriller so we can kill the fetch after a couple seconds (or whatever is configured)
  const controller = new AbortController();
  const apiTimeout = await getAPITimeout();
  const timeout = setTimeout(() => {
    controller.abort();
  }, apiTimeout);

  // Try to fetch data about the plex server
  try {
    // Make a fetch with the plex token to the base URL
    const response = await fetch(`${plexURL}/`, {
      method: 'get',
      headers: {
        'Accept': 'application/json',
        'X-Plex-Token': plexToken
      },
      signal: controller.signal
    });

    if (debug > 2) console.log('response', response);

    // Check for unauthorized
    if (response.status === 401) return { success: false, source: 'plex.token', message: 'Unauthorized.' };

    // Check for a non-ok status code
    if (response.status !== 200) return { success: false, source: 'plex.address', message: 'Invalid response code: ' + response.status + ', ' + response.statusText };

    // Decode the response as base data
    const base = await response.json() as types.Base;

    if (debug > 2) console.log('base', base);

    // Check to see that the base data makes sense
    if (base === undefined || base.MediaContainer === undefined || base.MediaContainer.myPlexUsername === undefined) {
      // It does not. Log an error
      console.error('ERROR: Received:', JSON.stringify(base));
      return { success: false, source: 'plex.address', message: 'Could not fetch data from the server. See logs for more info.' };
    }

    // It does. Save data based on the new connection if required
    if (saveData) {
      // Save friendly name
      await settings.set('plex.friendlyName', base.MediaContainer.friendlyName ?? '');
      // Save server ID
      const serverIdentity = await getServerIdentity(address, token);
      if (serverIdentity !== null) await settings.set('plex.machineId', serverIdentity.MediaContainer.machineIdentifier);
    }

    // Return success
    return { success: true, source: defaultSource, message: `Success. Account '${base.MediaContainer.myPlexUsername}' detected.` };
  } catch (e) {
    if (e instanceof AbortError) {
      return { success: false, source: 'plex.address', message: 'Host did not respond. Aborted.' };
    } else {
      // There was a network or parse error
      const err = e as Error;
      console.error(err.message);
      return { success: false, source: 'plex.address', message: err.message };
    }
  } finally {
    clearTimeout(timeout);
  }
}

const get = async (resource: string, plexURL?: string, plexToken?: string, debug=0): Promise<null | unknown> => {
  if (await settings.get('plex.enable') !== true) return null;
  if (plexToken === undefined) plexToken = await helpers.decrypt(await settings.get('plex.token'));
  if (plexURL === undefined) plexURL = await settings.get('plex.address');
  if (plexToken === '') return null;

  if (plexURL.endsWith('/')) plexURL = plexURL.substring(0, plexURL.length - 1);

  if (debug) console.log('get ', `${plexURL}${resource}`)

  try {
    const response = await fetch(`${plexURL}${resource}`, {
      method: 'get',
      headers: {
        'Accept': 'application/json',
        'X-Plex-Token': plexToken
      }
    });

    if (response.status === 401) {
      if (debug) console.log('unauthorized', response.status, response.statusText, plexToken)
      return null;
    }

    if (debug) console.log('get cover to json with response', response.status, response.statusText)
    const json = await response.json();
    if (debug > 2) console.log('json parsed', json)
    else console.log('json parsed')
    return json;
  } catch (e) {
    const err = e as Error;
    console.error('get error', err.message);
    return null;
  }
}

// const additionalURLParams = {
//   '[context][device][deviceName]': 'Unabridged',
//   '[context][device][version]': process.env.GIT_COMMIT?.substring(0, 7) ?? 'unknown',
//   'forwardUrl': `${helpers.removeTrailingSlashes(process.env.ORIGIN ?? '127.0.0.1')}/settings/plex/oauth/${pinId}`
// }
// new URLSearchParams(additionalURLParams).toString()

const put = async (resource: string, params: { [key: string]: string }, plexURL?: string, plexToken?: string, debug = 0): Promise<null | unknown> => {
  if (await settings.get('plex.enable') !== true) return null;
  if (plexToken === undefined) plexToken = await helpers.decrypt(await settings.get('plex.token'));
  if (plexURL === undefined) plexURL = await settings.get('plex.address');
  if (plexToken === '') return null;

  if (plexURL.endsWith('/')) plexURL = plexURL.substring(0, plexURL.length - 1);

  if (debug) console.log('put ', `${plexURL}${resource}?${new URLSearchParams(params).toString()}`)

  try {
    const response = await fetch(`${plexURL}${resource}?${new URLSearchParams(params).toString()}`, {
      method: 'put',
      headers: {
        'Accept': 'application/json',
        'X-Plex-Token': plexToken
      }
    });

    if (response.status === 401) {
      if (debug) console.log('unauthorized', response.status, response.statusText, plexToken)
      return null;
    }

    if (debug) console.log('get cover to json with response', response.status, response.statusText)
    const json = await response.json();
    if (debug > 2) console.log('json parsed', json)
    else console.log('json parsed')
    return json;
  } catch (e) {
    const err = e as Error;
    console.error('get error', err.message);
    return null;
  }
}

const post = async (resource: string, params: { [key: string]: string }, plexURL?: string, plexToken?: string, debug = 0): Promise<null | unknown> => {
  if (await settings.get('plex.enable') !== true) return null;
  if (plexToken === undefined) plexToken = await helpers.decrypt(await settings.get('plex.token'));
  if (plexURL === undefined) plexURL = await settings.get('plex.address');
  if (plexToken === '') return null;

  if (plexURL.endsWith('/')) plexURL = plexURL.substring(0, plexURL.length - 1);

  if (debug) console.log('post ', `${plexURL}${resource}?${new URLSearchParams(params).toString()}`)

  try {
    const response = await fetch(`${plexURL}${resource}?${new URLSearchParams(params).toString()}`, {
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'X-Plex-Token': plexToken
      }
    });

    if (response.status === 401) {
      if (debug) console.log('unauthorized', response.status, response.statusText, plexToken)
      return null;
    }

    if (debug) console.log('get cover to json with response', response.status, response.statusText)
    const json = await response.json();
    if (debug > 2) console.log('json parsed', json)
    else console.log('json parsed')
    return json;
  } catch (e) {
    const err = e as Error;
    console.error('get error', err.message);
    return null;
  }
}

export const getServerIdentity = async (plexURL?: string, plexToken?: string): Promise<null | types.IdentityResult> => {
  const results = await get('/identity', plexURL, plexToken);
  if (results === null) return null;
  return results as unknown as types.IdentityResult;
}

export const getSections = async (plexURL?: string, plexToken?: string): Promise<null | types.Sections> => {
  const results = get('/library/sections', plexURL, plexToken);
  if (results === null) return null;
  return results as unknown as types.Sections;
}

// TODO: Optimize these options for book searching
const fuseOptions = {
  // isCaseSensitive: false,
  // includeScore: false,
  shouldSort: true,
  // includeMatches: false,
  // findAllMatches: false,
  // minMatchCharLength: 1,
  // location: 0,
  threshold: 0.6,
  // distance: 100,
  // useExtendedSearch: false,
  // ignoreLocation: false,
  // ignoreFieldNorm: false,
  // fieldNormWeight: 1,
  keys: [
    'title',
  ]
};

type BookType = Prisma.BookGetPayload<{ include: { authors: true } }>;

const selectBestResult = (results: types.SearchResult | null, book: BookType, debug=0): types.SearchMetadata | null => {
  // Exit if we don't have the required info
  if (results === null || results.MediaContainer.size === 0 || results.MediaContainer.Metadata.length === 0) return null;

  // Get some basic params that we will use to narrow down the search
  const title = book.title.toLocaleLowerCase().trim();
  const authors = book.authors.map((a) => a.name.toLocaleLowerCase().trim());
  const year = new Date(Number(book.release_date) * 1000).getFullYear();

  if (debug > 1) console.log('searching using', title, authors, year);

  // --- Zero'th attempt: If there is only 1 option, pick that one
  if (results.MediaContainer.Metadata.length === 1) return results.MediaContainer.Metadata[0];

  // --- First attempt: See if there is an exact title match with author match
  if (debug > 1) console.log('method 1');
  let options: types.SearchMetadata[] = [];
  for (const option of results.MediaContainer.Metadata) {
    // Check if the title matches
    if (debug > 1) console.log(option.title.toLocaleLowerCase().trim(), '===', title, '=', option.title.toLocaleLowerCase().trim() === title);
    if (option.title.toLocaleLowerCase().trim() === title) {
      // Check that at least one of the authors matches. If so, push it as an option
      for (const author of authors) {
        if (debug > 1) console.log(author, '===', option.parentTitle.toLocaleLowerCase().trim(), '=', author === option.parentTitle.toLocaleLowerCase().trim());
        if (author === option.parentTitle.toLocaleLowerCase().trim()) options.push(option);
      }
    }
  }
  // If only 1 option exists, that is what we are looking for
  if (options.length === 1) return options[0];

  // --- Second attempt: See if using the production year narrows it down to one option
  if (debug > 1) console.log('method 2');
  options = [];
  for (const option of results.MediaContainer.Metadata) {
    if (debug > 1) console.log(option.year, '===', year, '=', option.year === year);
    if (option.year === year) {
      // Check that at least one of the authors matches. If so, push it as an option
      for (const author of authors) {
        if (debug > 1) console.log(author, '===', option.parentTitle.toLocaleLowerCase().trim(), '=', author === option.parentTitle.toLocaleLowerCase().trim());
        if (author === option.parentTitle.toLocaleLowerCase().trim()) options.push(option);
      }
    }
  }
  // If only 1 option exists, that is what we are looking for
  if (options.length === 1) return options[0];

  // --- Third attempt: Use fuzzy search based on the title to pick a book
  const searchResults = new Fuse(results.MediaContainer.Metadata, fuseOptions).search(book.title).map((v) => v.item);
  if (debug > 1) console.log('method 3', searchResults);

  // Pick the best one from the fuzzy search
  if (searchResults.length > 0) return searchResults[0];

  return null;
}

/**
 * Associate a book with a plex key
 * @param asin the book to associate
 * @param plexURL the plex URL
 * @param plexToken the plex Token
 * @returns whether or not the book Plex Key was successfully updated
 */
export const matchBookToPlexEntry = async (asin: string, plexURL?: string, plexToken?: string, recursionDepth=0): Promise<null | string> => {
  // Check that plex is enabled
  if (await settings.get('plex.enable') !== true) return null;
  // Get debug
  const debug = await settings.get('system.debug');
  // Populate the plex URL and token if they are not populated
  if (plexURL === undefined) plexURL = await settings.get('plex.address');
  if (plexToken === undefined) plexToken = await helpers.decrypt(await settings.get('plex.token'));
  if (debug) console.log('associate', asin);
  // Get the book from the BB
  const book: BookType | null = await prisma.book.findUnique({ where: { asin: asin }, include: { authors: true } });
  // Get the secion key fron the DB
  const sectionKey = await settings.get('plex.library.key');
  // If the book does not exist or we have no section key, exit
  if (book === null || sectionKey === '') return null;
  if (debug) console.log('sectionKey', sectionKey);
  // Get an author (if one exists). We will use it to refine the search
  const author = (book.authors.length > 0 ? book.authors[0] : null);
  let authorKey: string | null = null;
  // Check if we have an author
  if (author !== null) {
    if (debug) console.log('author', author.name, author.plexKey);
    // We do have an author. See if we have a PlexKey already
    if (author.plexKey === null) {
      // We don't. We'll start with this
      const authorSearch = await search(sectionKey, author.name, types.SearchType.ARTIST, plexURL, plexToken, debug);
      if (authorSearch !== null && authorSearch.MediaContainer.size > 0 && authorSearch.MediaContainer.Metadata.length > 0) {
        // We found an author (or more than one. We'll pick the first one)
        authorKey = authorSearch.MediaContainer.Metadata[0].ratingKey;
        if (debug) console.log('authorKey found', authorKey);
        // Check that the key makes sense
        if (typeof authorKey === 'string' && authorKey.length > 0) {
          // It does. Save it to the author
          await prisma.author.update({ where: { name: author.name }, data: { plexKey: authorKey } });
        } else {
          // It does not, reset it.
          authorKey = null;
        }
      }
    } else {
      authorKey = author.plexKey;
    }
  }

  // Check if we can search with a plex key
  if (authorKey !== null) {
    if (debug) console.log('author lookup');
    // We can. Use it to make better searches
    // First, check that the author exists. If it doesn't, we can use recursion to try again once.
    const authorLookup = await get(`/library/metadata/${authorKey}`, plexURL, plexToken, debug) as unknown as null | types.SearchResult;
    if (authorLookup !== null && authorLookup.MediaContainer.size > 0 && authorLookup.MediaContainer.Metadata.length > 0 && authorLookup.MediaContainer.Metadata[0].type === 'artist') {
      if (debug) console.log('author validated', authorKey);
      // We have an author key and the author exists in Plex. Good start.
      const bookLookup = await get(`/library/metadata/${authorKey}/children?title=${encodeURIComponent(book.title)}&type=${types.SearchType.ALBUM}`, plexURL, plexToken, debug) as unknown as null | types.SearchResult;
      const selectedBook = selectBestResult(bookLookup, book, debug);
      if (selectedBook !== null) {
        // We found the book
        const bookKey = selectedBook.ratingKey;
        if (debug) console.log('book found', bookKey, selectedBook);
        if (typeof authorKey === 'string' && authorKey.length > 0) {
          // The key is probably valid
          // TODO: Make an API request to test the authorKey
          await prisma.book.update({ where: { asin: book.asin }, data: { plexKey: bookKey }});
          return bookKey;
        }
        // The key is not valid. We will fall out of here and end up searching without an author key.
      }
      // We didn't find it. We will fall out of here and end up searching without an author key.
    } else {
      // The author doesn't exist with this key. We'll erase the key from the author entry in the DB and try again
      if (recursionDepth === 0 && author !== null) {
        // Remove the plex key so we can look it up
        await prisma.author.update({ where: { name: author.name }, data: { plexKey: null } });
        if (debug) console.log('RECURSION HERE', recursionDepth + 1);
        return matchBookToPlexEntry(asin, plexURL, plexToken, recursionDepth++);;
      }
      // If we fall out here, we will end up searching without an author key
    }
  }

  if (debug) console.log('basic search');

  // Search without an author key
  const bookLookup = await search(sectionKey, book.title, types.SearchType.ALBUM, plexURL, plexToken, debug);
  const selectedBook = selectBestResult(bookLookup, book, debug);
  if (selectedBook !== null) {
    // We found the book.
    const bookKey = selectedBook.ratingKey;
    if (debug) console.log('book found basic', bookKey, selectedBook);
    if (typeof bookKey === 'string' && bookKey.length > 0) {
      // The key is probably valid
      // TODO: Make an API request to test the bookKey
      await prisma.book.update({ where: { asin: book.asin }, data: { plexKey: bookKey } });
      return bookKey;
    }
  }

  // We could not find the book in Plex.
  return null;
}

type SeriesType = Prisma.SeriesGetPayload<{ include: { books: true } }>;

const createCollection = async (title: string, sectionId: string, plexURL?: string, plexToken?: string, debug=0): Promise<string | null> => {
  // Make the collection
  const results = await post('/library/collections', {
    'type': types.SearchType.ALBUM.toString(),
    'smart': '0',
    'sectionId': sectionId,
    'title': title
  }, plexURL, plexToken, debug);
  // Exit if it failed
  if (results === null) return null;
  // Convert the results
  const parsed = results as unknown as types.SearchResult;
  // Check if the results have any content and return if it does
  if (parsed.MediaContainer.size > 0 && parsed.MediaContainer.Metadata.length > 0) return parsed.MediaContainer.Metadata[0].ratingKey;
  // Failed
  return null;
}

/**
 * Make or update a collection to reflect a current series
 * @param series the series to make a collection for
 * @param plexURL the URL of the plex server
 * @param plexToken the token of the plex server
 * @returns whether or not the collection was made and books were added
 */
export const collectBySeries = async (series: SeriesType, plexURL?: string, plexToken?: string): Promise<boolean> => {
  // Check that plex is enabled
  if (await settings.get('plex.enable') !== true) return false;
  // Get debug
  const debug = await settings.get('system.debug');
  const libraryKey = await settings.get('plex.library.key');
  // Populate the plex URL and token if they are not populated
  if (plexURL === undefined) plexURL = await settings.get('plex.address');
  if (plexToken === undefined) plexToken = await helpers.decrypt(await settings.get('plex.token'));
  if (debug) console.log('series', series.id);

  // Create an array to hold the keys to add
  const keysToAdd: string[] = [];

  // Loop through each book and add it to the collection
  for (const book of series.books) {
    // If the book isn't processed, skip
    if (book.processed !== true) continue;
    // Get the plex key
    let bookKey: null | string = book.plexKey;
    // If the book doesn't have a key, try and match one
    if (bookKey === null) {
      bookKey = await matchBookToPlexEntry(book.asin, plexURL, plexToken);
      // If the key still isn't there, skip
      if (bookKey === null) continue;
    }
    // Add the book to the collection
    keysToAdd.push(bookKey);
  }

  // Exit successfully if there were no books to add
  if (keysToAdd.length === 0) return true;

  // Initialize the collection key
  let collectionKey : string | null = null;

  // Check if a collection already exists for this series
  if (series.plexKey !== null) {
    // We need to verify that the collection exists in Plex also
    const collectionLookup = await get(`/library/collections/${series.plexKey}`, plexURL, plexToken, debug) as unknown as null | types.SearchResult;
    if (collectionLookup !== null && collectionLookup.MediaContainer.size > 0 && collectionLookup.MediaContainer.Metadata.length > 0) {
      // The collection exists. Assign the collection key
      collectionKey = series.plexKey;
      // Check the title to see if it is the one we want
      if (collectionLookup.MediaContainer.Metadata[0].title !== series.title) {
        // It is not. Rename it to match.
        await put(`/library/collections/${series.plexKey}`, { 'title': series.title }, plexURL, plexToken, debug);
      }
    } else {
      // The collection does not exist. Create one.
      collectionKey = await createCollection(series.title, libraryKey, plexURL, plexToken, debug)
      // Update the series if it worked
      if (collectionKey !== null) await prisma.series.update({ where: { id: series.id }, data: { plexKey: collectionKey } });
    }
  } else {
    // The collection does not exist. Create one.
    collectionKey = await createCollection(series.title, libraryKey, plexURL, plexToken, debug)
    // Update the series if it worked
    if (collectionKey !== null) await prisma.series.update({ where: { id: series.id }, data: { plexKey: collectionKey } });
  }

  // Only continue if we have a collection to work with
  if (collectionKey === null) return false;

  // Get the server ID
  let serverID = await settings.get('plex.machineId');
  // If it doesn't exist, try to fetch it
  if (serverID === '') {
    // Try and fetch it
    await testPlexConnection(plexURL, plexToken, true);
    // Get the server ID again
    serverID = await settings.get('plex.machineId');
    // If it still doesn't exist, exit
    if (serverID === '') return false;
  }

  // Add the books to the collection
  const results = await put(`/library/collections/${collectionKey}/items`, { 
    'uri': `server://${serverID}/com.plexapp.plugins.library/library/metadata/${keysToAdd.join(',')}`
  }, plexURL, plexToken, debug);

  // Exit as failed if the command failed
  if (results === null) return false

  // Done!
  return true;

}


export const search = async (sectionKey: string, title: string, type: types.SearchType, plexURL?: string, plexToken?: string, debug=0): Promise<null | types.SearchResult> => {
  const results = get(`/library/sections/${sectionKey}/all?type=${type}&title=${encodeURIComponent(title)}`, plexURL, plexToken, debug);
  if (results === null) return null;
  return results as unknown as types.SearchResult;
}