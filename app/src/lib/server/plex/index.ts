import * as types from './types';
import * as publicTypes from '$lib/types';
import * as settings from '$lib/server/settings';
import prisma from '../prisma';
import * as helpers from '$lib/server/helpers';
import Fuse from 'fuse.js';
import fetch, { AbortError } from 'node-fetch';
import type { Prisma } from '@prisma/client';
import WebSocket from 'ws';
import { LibraryManager } from '../cmd';

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

    // Test the websocket connection
    const connectTest = new Promise<void>((resolve, reject) => {
      if(debug) console.log(helpers.convertToWebsocketURL(plexURL) + '/:/websockets/notifications');
      const ws = new WebSocket(helpers.convertToWebsocketURL(plexURL) + '/:/websockets/notifications', { headers: { 'X-Plex-Token': plexToken } });
      const timeout = setTimeout(() => {
        ws.terminate();
        reject('timeout waiting for connection');
      }, 3000);
      // Reject on failed connection
      ws.on('error', (error) => {
        clearTimeout(timeout);
        ws.terminate();
        if(debug) console.log('websocket join error', error);
        reject(error.message);
      });
      // Resolve on succeeded connections
      ws.on('open', () => {
        clearTimeout(timeout);
        ws.close();
        resolve();
      });
    });

    // Try the websocket test
    try {
      await connectTest;
    } catch (e) {
      console.log(e);
      return { success: false, source: 'plex.address', message: 'Could not connect to Plex API Websocket: ' + e };
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

enum Method {
  GET = 'get',
  POST = 'post',
  PUT = 'put',
  DELETE = 'delete',
}

type ResourceResult = {
  status: number,
  value: unknown
} | null;

const resource = async (resource: string, method: Method, params: { [key: string]: string }, plexURL: string, plexToken: string, debug = 0, parseJSON=true): Promise<ResourceResult> => {
  // Make sure the params make sense
  if (plexToken === '' || plexURL === '' || plexToken === undefined || plexURL === undefined) return null;
  // Make sure we are allowed to interact with the Plex API
  if (await settings.get('plex.enable') !== true) return null;
  // Adjust the plexURL so it doesn't have a '/' at the end
  // TODO: Do this adjustment when storing it in the DB instead
  if (plexURL.endsWith('/')) plexURL = plexURL.substring(0, plexURL.length - 1);

  // Initialize a variable to hold the url
  let url;

  console.log('resource with debug ' + debug);

  // const escapedParams: { [key: string]: string } = {};
  // // Make sure the param values are escaped
  // for (const key of Object.keys(params)) {
  //   if (debug > 2) console.log(params[key], 'to', encodeURI(params[key]));
  //   escapedParams[key] = encodeURI(params[key]);
  // }

  // Parse the params
  const paramsString = new URLSearchParams(params).toString();

  // Assign the URL based on if we have params or not
  if (paramsString === '') url = `${plexURL}${resource}`;
  else url = `${plexURL}${resource}?${paramsString}`;

  // Debug message
  if (debug) console.log(`${method}: ${url}`);

  // Initialize a variable to hold the status so we can return it if there is a parse error
  let status: number | null = null;

  // Get the data
  try {
    // Make the fetch request
    const response = await fetch(url, {
      method: method,
      headers: {
        'Accept': 'application/json',
        'X-Plex-Token': plexToken
      }
    });

    // Print some extra data if debugging
    if (debug && response.status === 401) console.log('unauthorized', response.status, response.statusText, plexToken);

    // Assign status just in case we error
    status = response.status;

    // Switch based on if we are expecting JSON or TEXT
    if (parseJSON) {
      // Parse the response
      const j = await response.json();
      // Debug if required
      if (debug > 2) console.log('json parsed', JSON.stringify(j));
      // Return
      return {
        status: response.status,
        value: j
      }
    } else {
      // Parse the response
      const t = await response.text();
      // Debug if required
      if (debug > 2) console.log('text parsed', t);
      // Return
      return {
        status: response.status,
        value: t
      }
    }
  } catch (e) {
    // We had a parse error
    const err = e as Error;
    // Debug if required
    if (debug) console.error('get error', err.message);
    // Return
    return {
      status: status ?? 0,
      value: null
    }
  }
}

export const getServerIdentity = async (plexURL: string, plexToken: string): Promise<null | types.IdentityResult> => {
  const results = await resource('/identity', Method.GET, {}, plexURL, plexToken);
  if (results === null || results.status !== 200) return null;
  return results.value as unknown as types.IdentityResult;
}

export const getSections = async (plexURL: string, plexToken: string): Promise<null | types.Sections> => {
  const results = await resource('/library/sections', Method.GET, {}, plexURL, plexToken);
  if (results === null || results.status !== 200 || results.value === null) return null;
  return results.value as types.Sections;
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
  if (plexToken === undefined) plexToken = await settings.get('plex.token');
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
      console.log('author search', authorSearch);
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
    const authorLookup = await resource(`/library/metadata/${authorKey}`, Method.GET, {}, plexURL, plexToken, debug)// as unknown as null | types.SearchResult;
    if (authorLookup !== null && authorLookup.status === 200 && authorLookup.value !== null && (authorLookup.value as types.SearchResult).MediaContainer.size > 0 && (authorLookup.value as types.SearchResult).MediaContainer.Metadata.length > 0 && (authorLookup.value as types.SearchResult).MediaContainer.Metadata[0].type === 'artist') {
      if (debug) console.log('author validated', authorKey);
      // We have an author key and the author exists in Plex. Good start.
      const bookLookup = await resource(`/library/metadata/${authorKey}/children`, Method.GET, {
        title: book.title,
        type: types.SearchType.ALBUM.toString()
      }, plexURL, plexToken, debug);
      const selectedBook = selectBestResult(bookLookup?.value as null | types.SearchResult, book, debug);
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

const createCollection = async (title: string, sectionId: string, plexURL: string, plexToken: string, debug=0): Promise<string | null> => {
  // Make the collection
  const results = await resource('/library/collections', Method.POST, {
    'type': types.SearchType.ALBUM.toString(),
    'smart': '0',
    'sectionId': sectionId,
    'title': title
  }, plexURL, plexToken, debug);
  // Exit if it failed
  if (results === null || results.status !== 200 || results.value === null) return null;
  // Convert the results
  const parsed = results.value as types.SearchResult;
  // Check if the results have any content and return if it does
  if (parsed.MediaContainer.size > 0 && parsed.MediaContainer.Metadata.length > 0) return parsed.MediaContainer.Metadata[0].ratingKey;
  // Failed
  return null;
}

/**
 * Get the URL that would point to a collection
 * @param collectionKey the plex key for the collection
 * @param plexURL the URL of the plex install
 * @param serverID the serverID / machineID for the plex install
 * @returns 
 */
export const getCollectionWebURL = async (collectionKey: string, plexURL?: string, serverID?: string): Promise<string | null> => { 
  // Populate the plex URL and token if they are not populated
  if (await settings.get('plex.enable') === false) return null;
  if (plexURL === undefined) plexURL = await settings.get('plex.address');
  if (plexURL.endsWith('/')) plexURL = plexURL.substring(0, plexURL.length - 1);
  if (serverID === undefined) serverID = await settings.get('plex.machineId');
  if (serverID === '') return null;
  console.log(plexURL, serverID, collectionKey);
  return `${plexURL}/web/index.html#!/server/${serverID}/details?key=%2Flibrary%2Fcollections%2F${collectionKey}`;
}

/**
 * For a list of collection keys, get the current thumbnail icon
 * @param collectionKeys an array of collection keys
 * @param plexURL the plex URL
 * @param plexToken the plex Token
 * @returns an object of collection key - value format
 */
export const getCollectionThumbnailURLs = async (collectionKeys: string[], plexURL?: string, plexToken?: string): Promise<{[key: string]: string} | null> => {
  // Populate the plex URL and token if they are not populated
  const debug = await settings.get('system.debug');
  if (plexToken === undefined) plexToken = await settings.get('plex.token');
  if (plexURL === undefined) plexURL = await settings.get('plex.address');
  if (plexURL.endsWith('/')) plexURL = plexURL.substring(0, plexURL.length - 1);

  const promiseList: Promise<null | unknown>[] = [];
  for (const collectionKey of collectionKeys) promiseList.push(resource(`/library/collections/${collectionKey}`, Method.GET, {}, plexURL, plexToken, debug));
  const results = await Promise.allSettled(promiseList);
  const exportResults: { [key: string]: string } = {};

  for (const r of results) {
    if (r.status === 'rejected' || r.value === null) continue;
    const rParsed = r.value as Awaited<ReturnType<typeof resource>>;
    if (rParsed !== null && rParsed.status === 200 && rParsed.value !== null && (rParsed.value as types.SearchResult).MediaContainer.size > 0 && (rParsed.value as types.SearchResult).MediaContainer.Metadata.length > 0) {
      const metadata = (rParsed.value as types.SearchResult).MediaContainer.Metadata[0];
      exportResults[metadata.ratingKey] = `${plexURL}${metadata.thumb}&X-Plex-Token=${plexToken}`;
    }
  }

  return exportResults;
}

/**
 * Delete a collection with the specified plex key
 * @param plexKey the plex key of the collection
 * @param plexURL the plex api URL
 * @param plexToken the plex token
 * @param debug debug
 * @returns whether or not the debug was successful
 */
export const deleteCollection = async (plexKey: string, plexURL?: string, plexToken?: string, debug?: number): Promise<boolean> => {
  // Check that plex is enabled
  if (await settings.get('plex.enable') !== true) return false;
  // Get debug
  if (debug === undefined) debug = await settings.get('system.debug');
  // Populate the plex URL and token if they are not populated
  if (plexURL === undefined) plexURL = await settings.get('plex.address');
  if (plexToken === undefined) plexToken = await settings.get('plex.token');
  if (debug) console.log('delete', plexKey);


  console.log(plexToken);

  // Make the collection
  const results = await resource(`/library/collections/${plexKey}`, Method.DELETE, {}, plexURL, plexToken, debug, false);
  // Exit if it failed
  if (results === null || results.status !== 200) return false;
  else return true
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
  if (plexToken === undefined) plexToken = await settings.get('plex.token');
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
    const collectionLookup = await resource(`/library/collections/${series.plexKey}`, Method.GET, {}, plexURL, plexToken, debug);
    if (collectionLookup !== null && collectionLookup.status === 200 && collectionLookup.value !== null && (collectionLookup.value as types.SearchResult).MediaContainer.size > 0 && (collectionLookup.value as types.SearchResult).MediaContainer.Metadata.length > 0) {
      // The collection exists. Assign the collection key
      collectionKey = series.plexKey;
      // Check the title to see if it is the one we want
      if ((collectionLookup.value as types.SearchResult).MediaContainer.Metadata[0].title !== series.title) {
        // It is not. Rename it to match.
        await resource(`/library/collections/${series.plexKey}`, Method.PUT, { 'title': series.title }, plexURL, plexToken, debug, false);
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
  const results = await resource(`/library/collections/${collectionKey}/items`, Method.PUT, { 
    'uri': `server://${serverID}/com.plexapp.plugins.library/library/metadata/${keysToAdd.join(',')}`
  }, plexURL, plexToken, debug, false);

  // Exit as failed if the command failed
  if (results === null || results.status !== 200) return false

  // Done!
  return true;

}

/**
 * Start a library file scan with Plex
 * @returns whether or not the library scan was started
 */
export const scanLibraryFiles = async (): Promise<void> => {

  // The scan is starting, so should no longer be scheduled
  await settings.set('plex.library.autoScan.nextRun', -1);

  // Return a promise for the duration of the scan
  return new Promise(async (resolve, reject) => {

    // Get settings
    const plexSettings = await settings.getSet('plex');
    const constSettings = await settings.getMany('system.debug');

    // Get debug
    const debug = constSettings['system.debug'];

    // Check that plex is enabled
    if (plexSettings['plex.enable'] !== true || plexSettings['plex.library.autoScan.enable'] !== true) return reject();

    // Set some initial settings
    await settings.set('plex.library.autoScan.inProgress', true);
    await settings.set('plex.library.autoScan.progress', 0);

    // Populate the plex URL and token
    const plexURL = plexSettings['plex.address'];
    const plexToken = plexSettings['plex.token'];
    const sectionId = plexSettings['plex.library.key'];

    // If the book does not exist or we have no section key, exit
    if (sectionId === '') return reject('no section id');

    // Save a variable to hold the timeoout
    if (global.plex.generalTimeout !== undefined) clearInterval(global.plex.generalTimeout);
    try {
      const scan = new Promise<void>((resolve, reject) => {
        if (debug) console.log(helpers.convertToWebsocketURL(plexURL) + '/:/websockets/notifications');
        const ws = new WebSocket(helpers.convertToWebsocketURL(plexURL) + '/:/websockets/notifications', { headers: { 'X-Plex-Token': plexToken } });
        global.plex.generalTimeout = setTimeout(() => {
          ws.terminate();
          reject('timeout waiting for connection');
        }, 3000);
        // Reject on failed connection
        ws.on('error', (error) => {
          clearTimeout(global.plex.generalTimeout);
          global.plex.generalTimeout = undefined;
          ws.terminate();
          reject(error);
        });
        // Resolve on succeeded connections
        ws.on('open', async () => {
          clearTimeout(global.plex.generalTimeout);
          global.plex.generalTimeout = setTimeout(() => {
            ws.terminate();
            reject('timeout waiting for scan to finish');
          }, plexSettings['plex.library.autoScan.timeout'] * 1000);
          // Reset the progress
          await settings.set('plex.library.autoScan.progress', 0);
          // Issue the library refresh (in 200ms to let the websocket settle)
          await helpers.delay(200);
          // Get the result from the library refresh
          if (debug) console.log(`/library/sections/${sectionId}/refresh`);
          const result = await resource(`/library/sections/${sectionId}/refresh`, Method.GET, {}, plexURL, plexToken, debug, false);
          // If it is a failure, reject
          if (result === null || result.status !== 200) {
            clearTimeout(global.plex.generalTimeout);
            global.plex.generalTimeout = undefined;
            ws.close();
            reject(result)
            return;
          }
        });
        // On messages
        ws.on('message', async (d) => {
          // Parse the message as a notification
          const data = JSON.parse(d.toString()) as types.Notification;
          // Nothing to do if there is no content
          if (data.NotificationContainer.size === 0) return;
          // If it isn't an activity notification, we don't care about it
          if (data.NotificationContainer.type !== 'activity') return;
          // Loop through each activity notification in the message packet
          for (const entry of data.NotificationContainer.ActivityNotification) {
            // If there is no library context, the id doesn't match the library that Unabridged has access to, or it isn't for a library scan, nothing to do
            if (entry.Activity.type !== 'library.update.section') continue;
            if (entry.Activity.Context === undefined) continue;
            if (entry.Activity.Context.librarySectionID !== sectionId) continue
            // Switch based on the message type
            if (entry.event === 'updated') {
              // Set the new progress
              await settings.set('plex.library.autoScan.progress', entry.Activity.progress / 100);
            } else if (entry.event === 'ended') {
              // Clear the timer
              clearTimeout(global.plex.generalTimeout);
              global.plex.generalTimeout = undefined;
              console.log('Message: ended', entry.uuid);
              // Set the progress as complete
              await settings.set('plex.library.autoScan.progress', 1);
              // Close the websocket and resolve
              ws.close();
              resolve();
            }
          }
        });
      });

      try {
        // Wait for the library scan process to finish
        await scan;
        // Done
        resolve();
      } catch (e) {
        console.log('ERROR: The scan could not be completed', e);
        reject(e);
      } 
    } catch (e) {
      console.log('ERROR: Could not establish a websocket connection');
      clearTimeout(global.plex.generalTimeout);
      global.plex.generalTimeout = undefined;
      reject(e);
    }
    // Make sure the timeouts are clear, just in case
    clearTimeout(global.plex.generalTimeout);
    global.plex.generalTimeout = undefined;
  });
}

/**
 * Reset the Plex subsystem. Should be ran on system start.
 */
export const reset = async () => {
  await settings.set('plex.library.autoScan.inProgress', false);
  await settings.set('plex.library.autoScan.nextRun', -1);
  if (global.plex === undefined) global.plex = { interval: undefined, generalTimeout: undefined };
  if (global.plex.interval !== undefined) clearInterval(global.plex.interval);
  if (global.plex.generalTimeout !== undefined) clearInterval(global.plex.generalTimeout);
}

const scheduler = async (overrideChecks=false) => {
  console.log('scheduler run')
  // Get the next run time
  const constSettings = await settings.getMany('plex.library.autoScan.nextRun', 'plex.library.autoScan.inProgress');
  // Check to see if we are ready to run
  if (overrideChecks || (constSettings['plex.library.autoScan.nextRun'] !== -1 && constSettings['plex.library.autoScan.inProgress'] === false && Math.floor(Date.now() / 1000) - constSettings['plex.library.autoScan.nextRun'] > 0)) {
    console.log('scheduler trigger')
    // Stop the scheduler
    await settings.set('plex.library.autoScan.nextRun', -1);
    if (global.plex === undefined) global.plex = { interval: undefined, generalTimeout: undefined };
    if (global.plex.interval !== undefined) clearInterval(global.plex.interval);
    if (global.plex.generalTimeout !== undefined) clearInterval(global.plex.generalTimeout);

    // Get settings
    let plexSettings = await settings.getSet('plex');

    // Check permissions
    if (plexSettings['plex.enable'] === false || plexSettings['plex.library.autoScan.enable'] === false || LibraryManager.getNoneWorking() === false) return;

    // We are now in-progress
    await settings.set('plex.library.autoScan.progress', 0);
    await settings.set('plex.library.collection.progress', 0);
    await settings.set('plex.library.autoScan.inProgress', true);
    // Surround with a try-catch so we don't de-sync params
    try {
      // Test the plex connection
      const result = await testPlexConnection(plexSettings['plex.address'], plexSettings['plex.token'], false);
      console.log('test result', result)
      if (result.success === true) {
        // The connection worked
        try {
          // Scan the library files
          console.log('start scan');
          await scanLibraryFiles();
          console.log('scan done');
          // Delay for 1 second to give Plex time to catch up
          await helpers.delay(1000);
          // Get settings since it may have been a while
          let plexSettings = await settings.getSet('plex');
          // Check if we should do a collection update
          if (plexSettings['plex.collections.enable'] === true) {
            console.log('start collecting');
            await settings.set('plex.library.collection.progress', 0);
            try {
              if (plexSettings['plex.collections.by'] === publicTypes.CollectionBy.series) {
                console.log('collection by series');
                const series = await prisma.series.findMany({
                  where: { books: { some: { processed: true } } },
                  include: { books: true }
                });
                for (let i = 0; i < series.length; i++) {
                  const s = series[i];
                  await collectBySeries(s);
                  await settings.set('plex.library.collection.progress', i / series.length);
                }
              } else if (plexSettings['plex.collections.by'] === publicTypes.CollectionBy.album) {
                console.log(`ERROR: Unimplemented collection by: ${plexSettings['plex.collections.by']}`);
              } else {
                console.log(`ERROR: Unimplemented collection by: ${plexSettings['plex.collections.by']}`);
              }
            } catch(e) {
              // There was an error adding the collections
              console.log(e);
            }
            console.log('done collecting');
            await settings.set('plex.library.collection.progress', 1);
          }
        } catch(e) {
          // The library scan failed
          console.log(e);
        }
      }
      await settings.set('plex.library.autoScan.inProgress', false);
    } catch(e) {
      console.log('ERROR', e);
      await settings.set('plex.library.autoScan.inProgress', false);
    }
  }
}

/**
 * Scan the library and collect right now
 * @returns whether or not it was successful
 */
export const scanLibraryFilesAndCollect = async () => {
  // Get settings
  const plexSettings = await settings.getSet('plex');
  const constSettings = await settings.getMany('system.debug');

  // Check that we have permission to do this sync
  if (plexSettings['plex.enable'] === false || plexSettings['plex.library.autoScan.enable'] === false) return true;

  // Check if there is one running right now. If so, don't schedule but also don't resolve the schedule request.
  if (plexSettings['plex.library.autoScan.inProgress'] === true) return false;

  // Test the plex connection
  const result = await testPlexConnection(plexSettings['plex.address'], plexSettings['plex.token'], false);
  if (result.success === false) return true;

  // Reset the scheduler
  if (global.plex === undefined) global.plex = { interval: undefined, generalTimeout: undefined };
  if (global.plex.interval !== undefined) clearInterval(global.plex.interval);
  if (global.plex.generalTimeout !== undefined) clearInterval(global.plex.generalTimeout);

  // Trigger the scheduler
  await scheduler(true);

  // Done!
  return true;
}

/**
 * Trigger a scheduled library scan, after the correct delay
 * @returns 
 */
export const scheduleScanLibraryFilesAndCollect = async () => {
  // Get settings
  const plexSettings = await settings.getSet('plex');
  const constSettings = await settings.getMany('system.debug');

  // Check that we have permission to do this sync
  if (plexSettings['plex.enable'] === false || plexSettings['plex.library.autoScan.enable'] === false || plexSettings['plex.library.autoScan.scheduled'] === true) return true;

  // Check if there is one running right now. If so, don't schedule but also don't resolve the schedule request.
  if (plexSettings['plex.library.autoScan.inProgress'] === true) return false;

  // Test the plex connection
  const result = await testPlexConnection(plexSettings['plex.address'], plexSettings['plex.token'], false);
  if (result.success === false) return true;

  // Set the schedule time
  const scheduleTime = Math.floor(Date.now() / 1000) + plexSettings['plex.library.autoScan.delay'];
  await settings.set('plex.library.autoScan.nextRun', scheduleTime);

  // Set the scheduler
  if (global.plex === undefined) global.plex = { interval: undefined, generalTimeout: undefined };
  if (global.plex.interval !== undefined) clearInterval(global.plex.interval);
  if (global.plex.generalTimeout !== undefined) clearInterval(global.plex.generalTimeout);

  global.plex.interval = setInterval(scheduler, 1000);
  global.plex.interval.unref();

  // Done!
  return true;

}

export const search = async (sectionKey: string, title: string, type: types.SearchType, plexURL: string, plexToken: string, debug=0): Promise<null | types.SearchResult> => {
  const results = await resource(`/library/sections/${sectionKey}/all`, Method.GET, { type: type.toString(), title}, plexURL, plexToken, debug);
  if (results === null || results.status !== 200 || results.value === null) return null;
  return results.value as types.SearchResult;
}