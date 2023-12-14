import Fuse from 'fuse.js'; 
import * as settings from '$lib/server/settings';
import * as types from '../types';
import prisma from '$lib/server/prisma';

// -------------------------------------------------------------------------------------------------
// Search / Selection
// -------------------------------------------------------------------------------------------------

/**
 * Search plex for an entry
 * @param sectionKey the library to search
 * @param title the title of the item
 * @param type the type of item
 * @param plexURL the Plex URL
 * @param plexToken the Plex token
 * @param debug debug
 * @returns the search results, or null
 */
export const search = async (sectionKey: string, title: string, type: types.SearchType, plexURL: string, plexToken: string, debug = 0): Promise<null | types.SearchResult> => {
  const results = await resource(`/library/sections/${sectionKey}/all`, types.Method.GET, { type: type.toString(), title }, plexURL, plexToken, debug);
  if (results === null || results.status !== 200 || results.value === null) return null;
  return results.value as types.SearchResult;
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

/**
 * Select the best book based on search results
 * @param results the search results (via `search` above)
 * @param book the book that we are trying to match
 * @param debug debug
 * @returns the best option for the search
 */
export const selectBestResult = (results: types.SearchResult | null, book: types.BookType, debug = 0): types.SearchMetadata | null => {
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

// -------------------------------------------------------------------------------------------------
// API Tools
// -------------------------------------------------------------------------------------------------

/**
 * Make a direct API call to Plex
 * @param resource the resource handle
 * @param method the request method
 * @param params params for the request, in object form
 * @param plexURL the Plex URL
 * @param plexToken the Plex token
 * @param debug debug
 * @param parseJSON whether or not to parse the result as a JSON
 * @returns the data
 */
export const resource = async (resource: string, method: types.Method, params: { [key: string]: string }, plexURL: string, plexToken: string, debug = 0, parseJSON = true): Promise<types.ResourceResult> => {
  // Make sure the params make sense
  if (plexToken === '' || plexURL === '' || plexToken === undefined || plexURL === undefined) return null;
  // Make sure we are allowed to interact with the Plex API
  if (await settings.get('plex.enable') !== true) return null;

  // Initialize a variable to hold the url
  let url;

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

/**
 * Get the machine ID for a Plex instance
 * @param plexURL the Plex URL
 * @param plexToken the Plex token
 * @returns the Machine ID, or null
 */
export const getServerIdentity = async (plexURL: string, plexToken: string): Promise<null | types.IdentityResult> => {
  const results = await resource('/identity', types.Method.GET, {}, plexURL, plexToken);
  if (results === null || results.status !== 200) return null;
  return results.value as unknown as types.IdentityResult;
}

/**
 * Get the API timeout time, protected to a reasonable value
 * @returns the API timeout time
 */
export const getAPITimeout = async () => {
  const apiTimeout = await settings.get('plex.apiTimeout');
  if (apiTimeout > 10000) return 10000;
  return apiTimeout;
}

// -------------------------------------------------------------------------------------------------
// Plex Key Matching
// -------------------------------------------------------------------------------------------------

/**
 * Associate a book with a plex key
 * @param asin the book to associate
 * @param plexURL the plex URL
 * @param plexToken the plex Token
 * @returns whether or not the book Plex Key was successfully updated
 */
export const matchBookToPlexEntry = async (asin: string, plexURL?: string, plexToken?: string, recursionDepth = 0): Promise<null | string> => {
  // Check that plex is enabled
  if (await settings.get('plex.enable') !== true) return null;
  // Get debug
  const debug = await settings.get('system.debug');
  // Populate the plex URL and token if they are not populated
  if (plexURL === undefined) plexURL = await settings.get('plex.address');
  if (plexToken === undefined) plexToken = await settings.get('plex.token');
  if (debug) console.log('associate', asin);
  // Get the book from the BB
  const book: types.BookType | null = await prisma.book.findUnique({ where: { asin: asin }, include: { authors: true } });
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
    const authorLookup = await resource(`/library/metadata/${authorKey}`, types.Method.GET, {}, plexURL, plexToken, debug)// as unknown as null | types.SearchResult;
    if (authorLookup !== null && authorLookup.status === 200 && authorLookup.value !== null && (authorLookup.value as types.SearchResult).MediaContainer.size > 0 && (authorLookup.value as types.SearchResult).MediaContainer.Metadata.length > 0 && (authorLookup.value as types.SearchResult).MediaContainer.Metadata[0].type === 'artist') {
      if (debug) console.log('author validated', authorKey);
      // We have an author key and the author exists in Plex. Good start.
      const bookLookup = await resource(`/library/metadata/${authorKey}/children`, types.Method.GET, {
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
          await prisma.book.update({ where: { asin: book.asin }, data: { plexKey: bookKey } });
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
