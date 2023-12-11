import type cron from 'node-cron';

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
		declare namespace plex {
			let interval: NodeJS.Interval | undefined;
		}
		declare namespace manager {
			let interval: NodeJS.Interval | undefined;
			let cronTask: cron.ScheduledTask | undefined;
			let runProcess: () => void;
		}
	}
}

export {};
