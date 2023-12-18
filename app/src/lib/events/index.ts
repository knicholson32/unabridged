import { browser } from '$app/environment';
import { EventNames, type EventName, type EventType, type ProgressEvents } from '$lib/types';

let reconnectFrequencySeconds = 1;
let evtSource: EventSource;

// Putting these functions in extra variables is just for the sake of readability
const waitFunc = () => { return reconnectFrequencySeconds * 1000 };
const tryToSetupFunc = () => {
  onMount();
  reconnectFrequencySeconds *= 2;
  if (reconnectFrequencySeconds >= 64) {
    reconnectFrequencySeconds = 64;
  }
};

const reconnectFunc = () => { setTimeout(tryToSetupFunc, waitFunc()) };

export const onMount = () => {
  console.log(browser);
  if (browser) {
    evtSource = new EventSource("/api/events");
    evtSource.onopen = (e) => reconnectFrequencySeconds = 1;
    evtSource.onerror = function (e) {
      evtSource.close();
      reconnectFunc();
    };

    restore();
  }
  // // TODO: Make this refresh if we don't get a ping every so often
  // setTimeout(() => {
  //   evtSource.close();
  //   onMount();
  // }, 10000);
}

const callbackMap: {[key: string]: any[]} = {};
for (const e of EventNames) callbackMap[e] = [];

const restore = () => {
  for (const e of EventNames) for (const callback of callbackMap[e]) evtSource.addEventListener(e, callback);
}

/**
 * Attach a function to an event type
 * @param event the event type
 * @param callback the callback function
 * @return a function to remove this event attachment
 */
export const on = <T extends EventName>(event: T, callback: (data: EventType<T>) => void) => {
  console.log('Adding event listener', event);

  // Create the callback
  const c = (d: MessageEvent<any>) => callback(JSON.parse(d.data) as EventType<T>);

  // Add the callback to the map for restoration if the evtSource gets recreated
  callbackMap[event].push(c);

  // If this is in the browser, add the attachment
  if (browser && evtSource !== undefined) evtSource.addEventListener(event, c);

  // Return the removal function
  return () => {
    console.log('Removing event listener', event);
    callbackMap[event] = callbackMap[event].filter((_c) => _c !== c);
    try {
      evtSource.removeEventListener(event, c);
    } catch (e) {
      // Noting to do if the attachment didn't exist
    } 
  }
}

/**
 * Attach a function to a progress event with a specific ID
 * @param event the type of event to attach to (must be a progress event)
 * @param id th ID of the progress event
 * @param callback the callback to run when this event occurs
 * @returns a function to run to remove this event attachment
 */
export const onProgress = <T extends ProgressEvents>(event: T, id: string, callback: (data: EventType<T>) => void) => {;
  return on(event, (data: EventType<T>) => {
    if (data.id === id) callback(data);
  });
}