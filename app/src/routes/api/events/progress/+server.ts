import { progress } from '$lib/server/events';
import { API, Event } from '$lib/types';
import zlib from 'node:zlib';

/**
 * Lifecycle
 * 1. The client connects to this endpoint. Functions are assigned that routes all events from the 
 *    server event system to this endpoint handler, using `progress.on(...)`.
 * 2. An event is triggered in the server code somewhere. For example, a notification is emitted.
 * 3. A callback function we assigned in step 1 is triggered, and pipes the data to the readable stream.
 * 4. The connection is closed, and the callback functions are removed using `progress.off(...)`
 */

export function GET({ request, url }) {
  
  // Get the events that the client is interested in
  const targets = url.searchParams.getAll('targets') as Event.Progress.Name[];

  // There must be at least one event type to capture
  if (targets.length === 0) return API.response._400({ missingURLParams: ['targets'] });

  // All the event types being captured must be valid
  let problematicTargets: string[] = [];
  for (const t of targets) if (!Event.Progress.Names.includes(t)) problematicTargets.push(t);
  if (problematicTargets.length > 0) return API.response._400({ message: `The following targets do not exist: '${problematicTargets.join(', ')}'. Options: '${Event.Progress.Names.join(', ')}'` });

  // Get the types of encoding we can use
  const encoding =
    // request.headers.get('accept-encoding')?.includes('br') ? 'br' :
    //   request.headers.get('accept-encoding')?.includes('gzip') ? 'gzip' :
    //     request.headers.get('accept-encoding')?.includes('deflate') ? 'deflate' :
          'none';

  // Assign the headers based on the encoding
  const headers: { [key: string]: string } = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  }
  if (encoding !== 'none') headers['Content-Encoding'] = encoding;

  // Initialize a function that will be used to encode data
  let packageEvent: (event: Event.Progress.Name, id: string, data: any) => Uint8Array;

  // Assign the function based on what encoding we can use
  switch (encoding) {
    // case 'br':
    //   packageEvent = (event, data): Uint8Array => zlib.brotliCompressSync(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    //   break;
    // case 'gzip':
    //   packageEvent = (event, data): Uint8Array => zlib.gzipSync(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    //   break;
    // case 'deflate':
    //   packageEvent = (event, data): Uint8Array => zlib.deflateSync(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    //   break;
    default:
      const encoder = new TextEncoder();
      packageEvent = (event, id, data): Uint8Array => encoder.encode(`id: ${id}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      break;
  }

  // Create a variable to hold all the callbacks. We do this so we can remove the callbacks when the connection
  // closes, so we don't have hanging events
  const callbackMap: { [key: string]: (id: string, data: any) => void } = {};

  // Create a function that will clean up the callbacks upon connection close
  const cleanup = () => {
    console.log('cleanup');
    for (const e of Event.Progress.Names) if (callbackMap[e] !== undefined) progress.off(e, callbackMap[e]);
  }

  // Create a Readable Stream Controller. This will be assigned when the connection is made, and
  // will be used to emit data to the client
  let controller: ReadableStreamDefaultController<any> | null = null;

  // Create a function to route data from the server event system to the client
  const emit = <T extends Event.Progress.Name>(event: T) => {
    // Create a callback function that will handle data from the event system. We create this as a variable
    // so we can store it, which makes removing it later possible.
    const callback = (id: string, data: any) => {
      // Make sure the controller exists
      if (controller !== null) {
        try {
          // Package and send the data
          controller.enqueue(packageEvent(event, id, data));
          console.log('/api/events/progress/ -> emitted', event, id, data);
        } catch (e) {
          // If this didn't work, the connection is broken. Remove it and de-register all callbacks
          controller = null;
          cleanup();
        }
      }
    }
    // Assign the callback to the map so we can remove it later
    callbackMap[event] = callback;
    // return the callback, as this function will now be assigned to the progress event system
    return callback;
  }

  // Create a ReadableStream that will be returned in the response. All data goes through this
  const readable = new ReadableStream({
    async start(c) {
      // Upon connection start, assign the controller
      controller = c;
      // Loop through every event name that we want to attach to and create a handler function.
      for (const t of targets) progress.on(t, emit(t));
      controller.enqueue(packageEvent('initialize' as Event.Progress.Name, '', { targets }));
      console.log('progress event stream opened');
    },
    async cancel(reason) {
      console.log('progress event stream closed', reason);
      // Upon disconnect, clean up all callback handlers
      cleanup();
    }
  });

  // Return the response
  return new Response(readable, { headers });;
}