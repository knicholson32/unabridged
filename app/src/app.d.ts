import type cron from 'node-cron';
import EventEmitter from 'node:events';

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface Platform {}
	}
	declare namespace globalThis {
		interface BigInt {
			toJSON(): string | number
		}
		declare namespace plex {
			let generalTimeout: NodeJS.Timeout | undefined;
		}
		declare namespace manager {
			let interval: NodeJS.Interval | undefined;
			let cronTask: cron.ScheduledTask | undefined;
			let runProcess: () => void;
		}
		declare namespace events {
			let base: EventEmitter | undefined;
			let progress: EventEmitter | undefined;
		}
	}
}

export {};
