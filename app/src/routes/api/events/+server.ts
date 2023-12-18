import { eventEmitter } from '$lib/server/events';
import { EventNames, type EventName } from '$lib/types';
import zlib from 'node:zlib';


export function GET({ request }) {
  // Get the types of encoding we can use
  const encoding = 
    // request.headers.get('accept-encoding')?.includes('br') ? 'br' :
    // request.headers.get('accept-encoding')?.includes('gzip') ? 'gzip' : 
    // request.headers.get('accept-encoding')?.includes('deflate') ? 'deflate' : 
    'none';
  const headers: {[key: string]: string} = {
    'content-type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  }
  if (encoding !== 'none') headers['Content-Encoding'] = encoding;

  let packageEvent: (event: EventName, data: any, id?: string) => Uint8Array;
  

  switch(encoding) {
    // case 'br':
    //   packageEvent = (event: EventName, data: any, id = 'event'): Uint8Array => zlib.brotliCompressSync(`id: ${id}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    //   break;
    // case 'gzip':
    //   packageEvent = (event: EventName, data: any, id = 'event'): Uint8Array => zlib.gzipSync(`id: ${id}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    //   break;
    // case 'deflate':
    //   packageEvent = (event: EventName, data: any, id = 'event'): Uint8Array => zlib.deflateSync(`id: ${id}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    //   break;
    default:
      const encoder = new TextEncoder();
      packageEvent = (event: EventName, data: any, id = 'event'): Uint8Array => encoder.encode(`id: ${id}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      break;
  }

  const callbackMap: { [key: string]: (data: any) => void } = {};

  const cleanup = () => {
    console.log('cleanup');
    for (const e of EventNames) if (callbackMap[e] !== undefined) eventEmitter.off(e, callbackMap[e]);
  }

  let controller: ReadableStreamDefaultController<any> | null = null;

  // export const on = <T extends EventName>(event: T, callback: (data: EventType<T>) => void) => {
  const emit = <T extends EventName>(event: T) => {
    const callback = (data: any) => {
      if (controller !== null) {
        try {
          const d = packageEvent(event, data);
          controller.enqueue(d);
          console.log('emitted', event, data, d.length);
        } catch (e) {
          controller = null;
          cleanup();
        }
      }
    }
    callbackMap[event] = callback;
    return callback;
  }

  const readable = new ReadableStream({
    async start(c) {
      controller = c;
      for (const e of EventNames) eventEmitter.on(e, emit(e));
    },
    async cancel(reason) {
      console.log('cancel', reason);
      cleanup();
    }
  });

  const response = new Response(readable, { headers });

  return response;
}