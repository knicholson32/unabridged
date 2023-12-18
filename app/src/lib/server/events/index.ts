import EventEmitter from 'node:events';
import type { Event } from '$lib/types';

// Assign globals so duplicate emitters don't get created during development (vite dev)
if (global.events === undefined) global.events = { base: undefined, progress: undefined };
if (global.events.base !== undefined) {
  global.events.base.removeAllListeners();
  global.events.base = undefined;
}
if (global.events.progress !== undefined) {
  global.events.progress.removeAllListeners();
  global.events.progress = undefined;
}

// Export the event emitters so the API endpoints can attach to them
export const base = new EventEmitter();
export const progress = new EventEmitter();

// Assign globals
global.events.base = base;
global.events.progress = progress;

/**
 * Emit a base event
 * @param event the event type
 * @param data the data
 */
export const emit = <T extends Event.Base.Name>(event: T, data: Event.Base.Type<T>) => {
  console.log('Base event emitted', event);
  base.emit(event, data);
}

/**
 * Emit a progress event
 * @param event the event type
 * @param data the data
 */
export const emitProgress = <T extends Event.Progress.Name>(event: T, data: Event.Progress.Type<T>) => {
  console.log('Base event emitted', event);
  progress.emit(event, data);
}