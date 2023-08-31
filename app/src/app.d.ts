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
		declare namespace manager {
			let interval: NodeJS.Interval | undefined;
			let runProcess: () => void;
		}
	}
}

export {};
