import { sveltekit } from '@sveltejs/kit/vite';
import resolve from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';

/** @type {import('vite').UserConfig} */
const config = {
    plugins: [
        sveltekit(), resolve({
            browser: true,
            preferBuiltins: false,
            dedupe: ['svelte'],
          }), json()
    ]
};

export default config;