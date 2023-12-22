import * as settings from '$lib/server/settings';
import * as types from '../types';
import * as tools from '../tools';
import prisma from '$lib/server/prisma';
import { testPlexConnection } from '..';

// -------------------------------------------------------------------------------------------------
// Collection Lifecycle
// -------------------------------------------------------------------------------------------------

/**
 * Create a new collection
 * @param title the title for the collection
 * @param sectionId the Plex library that this collection should be added to
 * @param plexURL the Plex url
 * @param plexToken the Plex token
 * @param debug debug
 * @returns the ID of the new collection, or null
 */
export const createCollection = async (
	title: string,
	sectionId: string,
	plexURL: string,
	plexToken: string,
	debug = 0
): Promise<string | null> => {
	// Make the collection
	const results = await tools.resource(
		'/library/collections',
		types.Method.POST,
		{
			type: types.SearchType.ALBUM.toString(),
			smart: '0',
			sectionId: sectionId,
			title: title
		},
		plexURL,
		plexToken,
		debug
	);
	// Exit if it failed
	if (results === null || results.status !== 200 || results.value === null) return null;
	// Convert the results
	const parsed = results.value as types.SearchResult;
	// Check if the results have any content and return if it does
	if (parsed.MediaContainer.size > 0 && parsed.MediaContainer.Metadata.length > 0)
		return parsed.MediaContainer.Metadata[0].ratingKey;
	// Failed
	return null;
};

/**
 * Delete a collection with the specified plex key
 * @param plexKey the plex key of the collection
 * @param plexURL the plex api URL
 * @param plexToken the plex token
 * @param debug debug
 * @returns whether or not the debug was successful
 */
export const deleteCollection = async (
	plexKey: string,
	plexURL: string,
	plexToken: string,
	debug = 0
): Promise<boolean> => {
	// Make the collection
	const results = await tools.resource(
		`/library/collections/${plexKey}`,
		types.Method.DELETE,
		{},
		plexURL,
		plexToken,
		debug,
		false
	);
	// Exit if it failed
	if (results === null || results.status !== 200) return false;
	else return true;
};

/**
 * Check that a collection exists in Plex
 * @param collectionKey the collection to check
 * @param plexURL the URL of the plex server
 * @param plexToken the token of the plex server
 * @returns whether or not the collection currently exists on the plex server
 */
export const checkCollectionExists = async (
	collectionKey: string,
	plexURL: string,
	plexToken: string,
	debug = 0
): Promise<boolean> => {
	// Check if the collection actually exists
	// We need to verify that the collection exists in Plex also
	const collectionLookup = await tools.resource(
		`/library/collections/${collectionKey}`,
		types.Method.GET,
		{},
		plexURL,
		plexToken,
		debug
	);
	return (
		collectionLookup !== null &&
		collectionLookup.status === 200 &&
		collectionLookup.value !== null &&
		(collectionLookup.value as types.SearchResult).MediaContainer.size > 0 &&
		(collectionLookup.value as types.SearchResult).MediaContainer.Metadata.length > 0
	);
};

// -------------------------------------------------------------------------------------------------
// Collection URLs
// -------------------------------------------------------------------------------------------------

/**
 * Get the URL that would point to a collection
 * @param collectionKey the plex key for the collection
 * @param plexURL the URL of the plex install
 * @param serverID the serverID / machineID for the plex install
 * @returns
 */
export const getCollectionWebURL = async (
	collectionKey: string,
	plexURL: string,
	serverID?: string
): Promise<string | null> => {
	// Populate the plex URL and token if they are not populated
	if (serverID === undefined) serverID = await settings.get('plex.machineId');
	if (serverID === '') return null;
	console.log(plexURL, serverID, collectionKey);
	return `${plexURL}/web/index.html#!/server/${serverID}/details?key=%2Flibrary%2Fcollections%2F${collectionKey}`;
};

/**
 * For a list of collection keys, get the current thumbnail icon
 * @param collectionKeys an array of collection keys
 * @param plexURL the plex URL
 * @param plexToken the plex Token
 * @returns an object of collection key - value format
 */
export const getCollectionThumbnailURLs = async (
	collectionKeys: string[],
	plexURL: string,
	plexToken: string
): Promise<{ [key: string]: string } | null> => {
	// Populate the plex URL and token if they are not populated
	const debug = await settings.get('system.debug');

	const promiseList: Promise<null | unknown>[] = [];
	for (const collectionKey of collectionKeys)
		promiseList.push(
			tools.resource(
				`/library/collections/${collectionKey}`,
				types.Method.GET,
				{},
				plexURL,
				plexToken,
				debug
			)
		);
	const results = await Promise.allSettled(promiseList);
	const exportResults: { [key: string]: string } = {};

	for (const r of results) {
		if (r.status === 'rejected' || r.value === null) continue;
		const rParsed = r.value as Awaited<ReturnType<typeof tools.resource>>;
		if (
			rParsed !== null &&
			rParsed.status === 200 &&
			rParsed.value !== null &&
			(rParsed.value as types.SearchResult).MediaContainer.size > 0 &&
			(rParsed.value as types.SearchResult).MediaContainer.Metadata.length > 0
		) {
			const metadata = (rParsed.value as types.SearchResult).MediaContainer.Metadata[0];
			exportResults[metadata.ratingKey] = `${plexURL}${metadata.thumb}&X-Plex-Token=${plexToken}`;
		}
	}

	return exportResults;
};

// -------------------------------------------------------------------------------------------------
// Collection Actions
// -------------------------------------------------------------------------------------------------

/**
 * Make or update a collection to reflect a current series
 * @param series the series to make a collection for
 * @param plexURL the URL of the plex server
 * @param plexToken the token of the plex server
 * @returns whether or not the collection was made and books were added
 */
export const collectBySeries = async (
	series: types.SeriesType,
	plexURL: string,
	plexToken: string,
	debug = 0
): Promise<boolean> => {
	// Check that plex is enabled
	if ((await settings.get('plex.enable')) !== true) return false;
	const libraryKey = await settings.get('plex.library.key');
	// Populate the plex URL and token if they are not populated
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
			bookKey = await tools.matchBookToPlexEntry(book.asin, plexURL, plexToken);
			// If the key still isn't there, skip
			if (bookKey === null) continue;
		}
		// Add the book to the collection
		keysToAdd.push(bookKey);
	}

	// Exit successfully if there were no books to add
	if (keysToAdd.length === 0) return true;

	// Initialize the collection key
	let collectionKey: string | null = null;

	// Check if a collection already exists for this series
	if (series.plexKey !== null) {
		// We need to verify that the collection exists in Plex also
		const collectionLookup = await tools.resource(
			`/library/collections/${series.plexKey}`,
			types.Method.GET,
			{},
			plexURL,
			plexToken,
			debug
		);
		if (
			collectionLookup !== null &&
			collectionLookup.status === 200 &&
			collectionLookup.value !== null &&
			(collectionLookup.value as types.SearchResult).MediaContainer.size > 0 &&
			(collectionLookup.value as types.SearchResult).MediaContainer.Metadata.length > 0
		) {
			// The collection exists. Assign the collection key
			collectionKey = series.plexKey;
			// Check the title to see if it is the one we want
			if (
				(collectionLookup.value as types.SearchResult).MediaContainer.Metadata[0].title !==
				series.title
			) {
				// It is not. Rename it to match.
				await tools.resource(
					`/library/collections/${series.plexKey}`,
					types.Method.PUT,
					{ title: series.title },
					plexURL,
					plexToken,
					debug,
					false
				);
			}
		} else {
			// The collection does not exist. Create one.
			collectionKey = await createCollection(series.title, libraryKey, plexURL, plexToken, debug);
			// Update the series if it worked
			if (collectionKey !== null)
				await prisma.series.update({ where: { id: series.id }, data: { plexKey: collectionKey } });
		}
	} else {
		// The collection does not exist. Create one.
		collectionKey = await createCollection(series.title, libraryKey, plexURL, plexToken, debug);
		// Update the series if it worked
		if (collectionKey !== null)
			await prisma.series.update({ where: { id: series.id }, data: { plexKey: collectionKey } });
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
	const results = await tools.resource(
		`/library/collections/${collectionKey}/items`,
		types.Method.PUT,
		{
			uri: `server://${serverID}/com.plexapp.plugins.library/library/metadata/${keysToAdd.join(
				','
			)}`
		},
		plexURL,
		plexToken,
		debug,
		false
	);

	// Exit as failed if the command failed
	if (results === null || results.status !== 200) return false;

	// Done!
	return true;
};

/**
 * Ad a book to a specific collection
 * @param series the book to add
 * @param collectionKey the collection to add it to
 * @param plexURL the URL of the plex server
 * @param plexToken the token of the plex server
 * @param debug debug
 * @returns whether or not the collection was made and books were added
 */
export const collectToSpecificCollection = async (
	books: types.BookType[],
	collectionKey: string,
	plexURL: string,
	plexToken: string,
	debug = 0
): Promise<boolean> => {
	// Check that the collectionKey looks valid
	if (
		collectionKey.length === 0 ||
		!(await checkCollectionExists(collectionKey, plexURL, plexToken, debug))
	)
		return false;

	// Create an array to hold the keys to add
	const keysToAdd: string[] = [];

	// Loop through each book and add it to the collection
	for (const book of books) {
		// If the book isn't processed, skip
		if (book.processed !== true) continue;
		// Get the plex key
		let bookKey: null | string = book.plexKey;
		// If the book doesn't have a key, try and match one
		if (bookKey === null) {
			bookKey = await tools.matchBookToPlexEntry(book.asin, plexURL, plexToken);
			// If the key still isn't there, skip
			if (bookKey === null) continue;
		}
		// Add the book to the collection
		keysToAdd.push(bookKey);
	}

	// Exit successfully if there were no books to add
	if (keysToAdd.length === 0) return true;

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
	const results = await tools.resource(
		`/library/collections/${collectionKey}/items`,
		types.Method.PUT,
		{
			uri: `server://${serverID}/com.plexapp.plugins.library/library/metadata/${keysToAdd.join(
				','
			)}`
		},
		plexURL,
		plexToken,
		debug,
		false
	);

	// Exit as failed if the command failed
	if (results === null || results.status !== 200) return false;

	// Done!
	return true;
};
