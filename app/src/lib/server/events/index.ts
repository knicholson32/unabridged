import EventEmitter from 'node:events';
import type { EventName, EventType, Notification } from '$lib/types';


if (global.events === undefined) global.events = { eventEmitter: undefined };
if (global.events.eventEmitter !== undefined) {
  global.events.eventEmitter.removeAllListeners();
  global.events.eventEmitter = undefined;
}

export const eventEmitter = new EventEmitter();
global.events.eventEmitter = eventEmitter;

export const emit = <T extends EventName>(event: T, data: EventType<T>) => {
  console.log('Event emitted', event);
  eventEmitter.emit(event, data);
}