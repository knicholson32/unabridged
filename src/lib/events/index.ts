import { browser } from '$app/environment';
import { Event } from '$lib/types';

let evtSourceBase: EventSource | null = null;
let evtSourceProgress: EventSource | null = null;

export const onMount = () => {
	console.log(browser);
	if (browser) {
		evtSourceBase = new EventSource('/api/events');
		evtSourceBase.onopen = (e) => console.log('base connect');
		evtSourceBase.onerror = function (e) {
			console.log('event source base error', e);
		};

		restoreBase();
	}
};

// Initialize variables to hold attached callbacks for the Base and Progress endpoints
const callbackMapBase: { [key: string]: any[] } = {};
const callbackMapProgress: { [key: string]: any[] } = {};
for (const e of Event.Base.Names) callbackMapBase[e] = [];
for (const e of Event.Progress.Names) callbackMapProgress[e] = [];

// Create a function to re-attach all callbacks when the EventSource is created or re-created
const restoreBase = () => {
	if (evtSourceBase === null) return;
	for (const e of Event.Base.Names)
		for (const callback of callbackMapBase[e]) evtSourceBase.addEventListener(e, callback);
};

// Create a function to re-attach all callbacks when the EventSource is created or re-created
const restoreProgress = () => {
	if (evtSourceProgress !== null)
		for (const e of Event.Progress.Names)
			for (const callback of callbackMapProgress[e])
				evtSourceProgress.addEventListener(e, callback);
};

/**
 * Attach a function to a base event type
 * @param event the base event type
 * @param callback the callback function
 * @return a function to remove this event attachment
 */
export const on = <T extends Event.Base.Name>(
	event: T,
	callback: (data: Event.Base.Type<T>) => void
) => {
	// Only attach if in the browser
	if (!browser) return () => {};

	console.log('Adding base event listener', event);

	// Create the callback
	const c = (d: MessageEvent<any>) => callback(JSON.parse(d.data) as Event.Base.Type<T>);

	// Add the callback to the map for restoration if the evtSource gets recreated
	callbackMapBase[event].push(c);

	// If this is in the browser, add the attachment
	if (evtSourceBase !== null) evtSourceBase.addEventListener(event, c);

	// Return the removal function
	return () => {
		console.log('Removing base event listener', event);
		callbackMapBase[event] = callbackMapBase[event].filter((_c) => _c !== c);
		try {
			if (evtSourceBase !== null) evtSourceBase.removeEventListener(event, c);
		} catch (e) {
			// Noting to do if the attachment didn't exist
		}
	};
};

let targets: Event.Progress.Name[] = [];

/**
 * Connect to the Progress Event endpoint, using the correct targets
 */
const connectProgress = () => {
	// Check if we have any targets
	if (targets.length === 0) {
		// We don't. We can close this connection
		console.log('closing progress event connection');
		evtSourceProgress?.close();
		evtSourceProgress = null;
	} else {
		// We do. We need to connect with these targets
		// Close the connection if it is open
		if (evtSourceProgress !== null) {
			evtSourceProgress.close();
			evtSourceProgress = null;
		}
		const url = `/api/events/progress?${targets.map((el, idx) => 'targets=' + el).join('&')}`;
		console.log('connecting progress event', url, targets);
		evtSourceProgress = new EventSource(url);
		evtSourceProgress.onopen = () => {
			restoreProgress();
		};
		evtSourceProgress.onerror = () => {
			evtSourceProgress?.close();
			evtSourceProgress = null;
			// Try to reconnect in 3 seconds
			console.log('progress event connection error. Retry in 3 seconds');
			setTimeout(connectProgress, 3000);
		};
	}
};

/**
 * Attach a function to a progress event type
 * @param event the progress event type
 * @param id the ID of progress event to attach to, or null for all
 * @param callback the callback function
 * @returns a function to remove this event attachment
 */
export type IDType = string | null;
export type OnProgressCallback<ID extends IDType, T extends Event.Progress.Name> = ID extends string
	? (data: Event.Progress.Type<T>) => void
	: ID extends null
	? (id: string, data: Event.Progress.Type<T>) => void
	: never;
export const onProgress = <ID extends IDType, T extends Event.Progress.Name>(
	event: T,
	id: ID,
	callback: OnProgressCallback<ID, T>
) => {
	// Only attach if in the browser
	if (!browser) return () => {};

	// Check if we are listening for this event
	if (!targets.includes(event)) {
		// We are not. We need to reconnect with this target included
		targets.push(event);
		// Connect to the progress endpoint
		connectProgress();
	}

	console.log('Adding progress event listener', event);

	// Create the callback
	let c: (d: MessageEvent<any>) => void;

	// Assign the callback to either take every message and pass each one to the callback,
	// or just pass the messages with the correct ID. This callback changes based on if an ID
	// was provided to `onProgress`.
	if (id === null)
		c = (d: MessageEvent<any>) =>
			(callback as OnProgressCallback<null, T>)(
				d.lastEventId,
				JSON.parse(d.data) as Event.Progress.Type<T>
			);
	else
		c = (d: MessageEvent<any>) =>
			d.lastEventId === id
				? (callback as OnProgressCallback<string, T>)(JSON.parse(d.data) as Event.Progress.Type<T>)
				: null;

	// Add the callback to the map for restoration if the evtSource gets recreated
	callbackMapProgress[event].push(c);

	// If this is in the browser, add the attachment
	if (browser && evtSourceProgress !== null) evtSourceProgress.addEventListener(event, c);

	// Return the removal function
	return () => {
		console.log('Removing progress event listener', event);
		callbackMapProgress[event] = callbackMapProgress[event].filter((_c) => _c !== c);
		try {
			if (evtSourceProgress !== null) evtSourceProgress.removeEventListener(event, c);
		} catch (e) {
			// Noting to do if the attachment didn't exist
		}
		// Check to see if we are using this target anymore
		if (callbackMapProgress[event].length === 0) {
			// We are not. We need to remove it from the target list and reconnect
			targets = targets.filter((t) => t !== event);
			// Connect to the progress endpoint with the new target list
			connectProgress();
		}
	};
};

// /**
//  * Attach a function to a progress event with a specific ID
//  * @param event the type of event to attach to (must be a progress event)
//  * @param id th ID of the progress event
//  * @param callback the callback to run when this event occurs
//  * @returns a function to run to remove this event attachment
//  */
// export const onProgress = <T extends ProgressEvents>(event: T, id: string, callback: (data: EventType<T>) => void) => {;
//   return on(event, (data: EventType<T>) => {
//     if (data.id === id) callback(data);
//   });
// }
