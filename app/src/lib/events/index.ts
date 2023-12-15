import { browser } from '$app/environment';
import { EventNames, type EventName, type EventType } from '$lib/types';

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

// { [K in EventName]: ((data: EventType<K>) => void)[] }
const callbackMap: {[key: string]: any[]} = {};
for (const e of EventNames) callbackMap[e] = [];

const restore = () => {
  for (const e of EventNames) for (const callback of callbackMap[e]) evtSource.addEventListener(e, (d) => callback(JSON.parse(d.data)));
}

export const on = <T extends EventName>(event: T, callback: (data: EventType<T>) => void) => {
  console.log('Adding event listener', event);
  callbackMap[event].push(callback);
  if (browser) {
    evtSource.addEventListener(event, (d) => callback(JSON.parse(d.data) as EventType<T>));
  }
}