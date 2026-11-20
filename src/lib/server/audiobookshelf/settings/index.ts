// Glue between Unabridged's settings and the Audiobookshelf client. Kept apart from the client
// (../index.ts) so the client has no dependency on the settings or database.

import * as settings from '$lib/server/settings';
import type { Connection } from '../types';

/**
 * Build the client connection from the saved settings
 * @returns the connection, or null if Audiobookshelf is disabled or not configured
 */
export const getConnection = async (): Promise<Connection | null> => {
	const s = await settings.getMany('abs.enable', 'abs.address', 'abs.apiKey', 'abs.apiTimeout');
	if (s['abs.enable'] !== true || s['abs.address'] === '' || s['abs.apiKey'] === '') return null;
	return { address: s['abs.address'], apiKey: s['abs.apiKey'], timeoutMs: s['abs.apiTimeout'] };
};

/**
 * Get the connection plus the selected library
 * @returns null if Audiobookshelf is disabled, not configured, or no library is selected
 */
export const getLibraryConfig = async (): Promise<{
	conn: Connection;
	libraryId: string;
	folderId: string | null;
} | null> => {
	const conn = await getConnection();
	if (conn === null) return null;
	const s = await settings.getMany('abs.library.id', 'abs.library.folderId');
	if (s['abs.library.id'] === '') return null;
	return {
		conn,
		libraryId: s['abs.library.id'],
		folderId: s['abs.library.folderId'] === '' ? null : s['abs.library.folderId']
	};
};

/**
 * The base URL for links that open Audiobookshelf in the browser. This is the Link URL setting when
 * set, since the Server URL is often an address only Unabridged can reach (e.g. a Docker service
 * name).
 * @returns the base URL, or null if Audiobookshelf is disabled or has no URL
 */
export const getLinkBase = async (): Promise<string | null> => {
	const s = await settings.getMany('abs.enable', 'abs.address', 'abs.linkAddress');
	if (s['abs.enable'] !== true) return null;
	const base = s['abs.linkAddress'] !== '' ? s['abs.linkAddress'] : s['abs.address'];
	return base === '' ? null : base;
};

/**
 * Reset runtime scan state. Run on startup, since a scan cannot survive a restart.
 */
export const reset = async () => {
	await settings.set('abs.scan.inProgress', false);
	await settings.set('abs.scan.nextRun', -1);
};
