import { eventEmitter } from '$lib/server/events';
import { EventNames, type EventName, type EventType, type Notification } from '$lib/types';

// function delay(ms: number): Promise<void> {
//   return new Promise((res) => setTimeout(res, ms));
// }

const encoder = new TextEncoder();
const packageEvent = (event: EventName, data: any, id = 'event'): Uint8Array => encoder.encode(`id: ${id}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

export function GET() {

  const callbackMap: { [key: string]: (data: any) => void } = {};

  const cleanup = () => {
    console.log('cleanup');
    for (const e of EventNames) if (callbackMap[e] !== undefined) eventEmitter.off(e, callbackMap[e]);
  }

  let controller: ReadableStreamDefaultController<any> | null = null;
  let timeout: NodeJS.Timeout | null = null;

  // export const on = <T extends EventName>(event: T, callback: (data: EventType<T>) => void) => {
  const emit = <T extends EventName>(event: T) => {
    const callback = (data: any) => {
      console.log('emit', event, data);
      if (controller !== null) {
        try {
          controller.enqueue(packageEvent(event, data));
        } catch (e) {
          controller = null;
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

  const response = new Response(readable, {
    headers: {
      'content-type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });

  // Attach the abort controller's signal to the response
  // (response as any).signal = ac.signal;

  return response;
}