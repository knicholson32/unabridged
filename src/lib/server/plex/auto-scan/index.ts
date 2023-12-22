import * as settings from '$lib/server/settings';
import * as helpers from '$lib/server/helpers';
import * as publicTypes from '$lib/types';
import * as tools from '../tools';
import * as types from '../types';
import * as collections from '../collections';
import WebSocket from 'ws';
import prisma from '$lib/server/prisma';

/**
 * Start a library file scan with Plex
 * @returns whether or not the library scan was started
 */
export const scanLibraryFiles = async (
	progressCallback?: (progress: number) => void
): Promise<publicTypes.ScanAndGenerate> => {
	// The scan is starting, so should no longer be scheduled
	await settings.set('plex.library.autoScan.nextRun', -1);

	// Return a promise for the duration of the scan
	return new Promise(async (resolve) => {
		// Get settings
		const plexSettings = await settings.getSet('plex');
		const constSettings = await settings.getMany('system.debug');

		// Get debug
		const debug = constSettings['system.debug'];

		// Check that plex is enabled
		if (plexSettings['plex.enable'] !== true)
			return resolve(publicTypes.ScanAndGenerate.PLEX_DISABLED);
		if (plexSettings['plex.library.autoScan.enable'] !== true)
			return resolve(publicTypes.ScanAndGenerate.AUTO_SCAN_DISABLED);

		// Set some initial settings
		await settings.set('plex.library.autoScan.inProgress', true);
		// await settings.set('plex.library.autoScan.progress', 0);
		if (progressCallback !== undefined) progressCallback(0);

		// Populate the plex URL and token
		const plexURL = plexSettings['plex.address'];
		const plexToken = plexSettings['plex.token'];
		const sectionId = plexSettings['plex.library.key'];

		// If the book does not exist or we have no section key, exit
		if (sectionId === '') return resolve(publicTypes.ScanAndGenerate.NO_LIBRARY_CONFIGURED);

		// Save a variable to hold the timeout
		if (global.plex.generalTimeout !== undefined) clearTimeout(global.plex.generalTimeout);

		// Make a promise for the websocket connection
		const scan = new Promise<publicTypes.ScanAndGenerate>((resolve) => {
			if (debug)
				console.log(helpers.convertToWebsocketURL(plexURL) + '/:/websockets/notifications');
			const ws = new WebSocket(
				helpers.convertToWebsocketURL(plexURL) + '/:/websockets/notifications',
				{ headers: { 'X-Plex-Token': plexToken } }
			);
			global.plex.generalTimeout = setTimeout(() => {
				ws.terminate();
				resolve(publicTypes.ScanAndGenerate.SCAN_TIMEOUT_WAITING_FOR_CONNECTION);
			}, 3000);
			// Reject on failed connection
			ws.on('error', (error) => {
				clearTimeout(global.plex.generalTimeout);
				global.plex.generalTimeout = undefined;
				ws.terminate();
				resolve(publicTypes.ScanAndGenerate.SCAN_CONNECTION_ERROR);
			});
			// Resolve on succeeded connections
			ws.on('open', async () => {
				clearTimeout(global.plex.generalTimeout);
				global.plex.generalTimeout = setTimeout(() => {
					ws.terminate();
					resolve(publicTypes.ScanAndGenerate.SCAN_TIMEOUT_WAITING_FOR_FINISH);
				}, plexSettings['plex.library.autoScan.timeout'] * 1000);
				// Reset the progress
				// await settings.set('plex.library.autoScan.progress', 0);
				if (progressCallback !== undefined) progressCallback(0);
				// Issue the library refresh (in 200ms to let the websocket settle)
				await helpers.delay(200);
				// Get the result from the library refresh
				if (debug) console.log(`/library/sections/${sectionId}/refresh`);
				const result = await tools.resource(
					`/library/sections/${sectionId}/refresh`,
					types.Method.GET,
					{},
					plexURL,
					plexToken,
					debug,
					false
				);
				// If it is a failure, reject
				if (result === null || result.status !== 200) {
					clearTimeout(global.plex.generalTimeout);
					global.plex.generalTimeout = undefined;
					ws.close();
					console.log('Failed to start the library scan:', result);
					return resolve(publicTypes.ScanAndGenerate.SCAN_START_FAILED);
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
					if (entry.Activity.Context.librarySectionID !== sectionId) continue;
					// Switch based on the message type
					if (entry.event === 'updated') {
						// Set the new progress
						// await settings.set('plex.library.autoScan.progress', entry.Activity.progress / 100);
						if (progressCallback !== undefined) progressCallback(entry.Activity.progress / 100);
					} else if (entry.event === 'ended') {
						// Clear the timer
						clearTimeout(global.plex.generalTimeout);
						global.plex.generalTimeout = undefined;
						console.log('Message: ended', entry.uuid);
						// Set the progress as complete
						// await settings.set('plex.library.autoScan.progress', 1);
						if (progressCallback !== undefined) progressCallback(1);
						// Close the websocket and resolve
						ws.close();
						return resolve(publicTypes.ScanAndGenerate.NO_ERROR);
					}
				}
			});
		});

		// Wait for the library scan process to finish
		const result = await scan;

		// Clear timeouts
		clearTimeout(global.plex.generalTimeout);
		global.plex.generalTimeout = undefined;

		// Resolve with whatever result we got
		return resolve(result);
	});
};

/**
 * Generate Plex collections
 * @returns
 */
export const generateCollections = async (
	progressCallback?: (progress: number) => void
): Promise<publicTypes.ScanAndGenerate> => {
	// Get settings since it may have been a while
	const plexSettings = await settings.getSet('plex');
	const debug = await settings.get('system.debug');
	// Check if we should do a collection update
	if (plexSettings['plex.collections.enable'] === false)
		return publicTypes.ScanAndGenerate.COLLECTIONS_DISABLED;
	console.log('start collecting');
	// Set the collection progress to 0
	// await settings.set('plex.library.collection.progress', 0);
	if (progressCallback !== undefined) progressCallback(0);
	try {
		// Switch based on the collection type
		if (plexSettings['plex.collections.by'] === publicTypes.CollectionBy.series) {
			console.log('collection by series');
			// Get every series
			const series = await prisma.series.findMany({
				where: { books: { some: { processed: true } } },
				include: { books: true }
			});
			// Loop through every series and collect it
			for (let i = 0; i < series.length; i++) {
				const s = series[i];
				await collections.collectBySeries(
					s,
					plexSettings['plex.address'],
					plexSettings['plex.token'],
					debug
				);
				// Update the collection progress
				// await settings.set('plex.library.collection.progress', i / series.length);
				if (progressCallback !== undefined) progressCallback(i / series.length);
			}
			// Get all books that don't have a series
			const books = await prisma.book.findMany({
				where: { processed: true, seriesId: null },
				include: { authors: true }
			});
			// Check if we should also manage the collection for singles
			if (plexSettings['plex.collections.groupSingles'] === true && books.length > 0) {
				console.log('Collect singles');
				// Make a collection for the single books if one doesn't exist
				let key: string | null = plexSettings['plex.collections.singlesKey'];
				if (key === '') {
					key = await collections.createCollection(
						'No Series',
						plexSettings['plex.library.key'],
						plexSettings['plex.address'],
						plexSettings['plex.token'],
						debug
					);
					await settings.set('plex.collections.singlesKey', key ?? '');
				}
				// Check to see that the key worked
				if (
					key !== null &&
					key !== '' &&
					(await collections.checkCollectionExists(
						key,
						plexSettings['plex.address'],
						plexSettings['plex.token'],
						debug
					))
				) {
					console.log('Adding books', books);
					// Add all the books to the collection
					await collections.collectToSpecificCollection(
						books,
						key,
						plexSettings['plex.address'],
						plexSettings['plex.token'],
						debug
					);
				}
			} else {
				// We should not. Delete it if it exists
				if (plexSettings['plex.collections.singlesKey'] !== '')
					if (
						await collections.deleteCollection(
							plexSettings['plex.collections.singlesKey'],
							plexSettings['plex.address'],
							plexSettings['plex.token'],
							debug
						)
					)
						await settings.set('plex.collections.singlesKey', '');
			}
		} else {
			console.log(`ERROR: Unimplemented collection by: ${plexSettings['plex.collections.by']}`);
			return publicTypes.ScanAndGenerate.UNIMPLEMENTED_COLLECTION_TYPE;
		}
	} catch (e) {
		// There was an error adding the collections. It could be related to any of the commands taken
		console.log(e);
		return publicTypes.ScanAndGenerate.UNKNOWN_ERROR;
	}
	// Done!
	return publicTypes.ScanAndGenerate.NO_ERROR;
};
