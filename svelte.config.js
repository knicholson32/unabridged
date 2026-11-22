// import adapter from '@sveltejs/adapter-auto';
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/kit/vite';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			precompress: true
		}),
		// Cross-site form protection is done in src/hooks.server.ts instead. SvelteKit's check
		// compares against the ORIGIN variable only, so every form fails silently when the instance
		// is opened at any other address.
		csrf: {
			checkOrigin: false
		}
	},
	preprocess: vitePreprocess()
};

export default config;
