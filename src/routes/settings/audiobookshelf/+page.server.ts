import * as settings from '$lib/server/settings';
import prisma from '$lib/server/prisma';
import * as abs from '$lib/server/audiobookshelf';
import { AbsError, type Connection } from '$lib/server/audiobookshelf/types';

const ACTION_INTEGRATION = '?/updateIntegration';

type Option = { value: string; title: string; unset?: boolean };

/** Which form field an error belongs to, so the page shows it in the right place */
const fieldForError = (e: AbsError): string => {
	switch (e) {
		case AbsError.NO_API_KEY:
		case AbsError.UNAUTHORIZED:
		case AbsError.NOT_ADMIN:
			return 'abs.apiKey';
		case AbsError.NOT_FOUND:
		case AbsError.NOT_A_BOOK_LIBRARY:
			return 'abs.library.id';
		default:
			return 'abs.address';
	}
};

/** Forget ABS IDs cached for books and series. Needed when the library or server changes. */
const clearCachedIds = async () => {
	await prisma.book.updateMany({ where: { absItemId: { not: null } }, data: { absItemId: null } });
	await prisma.series.updateMany({
		where: { absSeriesId: { not: null } },
		data: { absSeriesId: null }
	});
};

type ActionResult = { success?: boolean; message?: string; name?: string } | void;

/**
 * Log an action's outcome. Saving these settings is rare and the result is what matters when it
 * goes wrong, so this is logged whatever the debug level.
 */
const logged =
	<A extends unknown[], R extends ActionResult>(name: string, action: (...args: A) => Promise<R>) =>
	async (...args: A): Promise<R> => {
		try {
			const result = await action(...args);
			if (result && result.success === false)
				console.log(`Audiobookshelf settings: ${name} failed (${result.name}): ${result.message}`);
			else
				console.log(
					`Audiobookshelf settings: ${name} done${result?.message ? `: ${result.message}` : ''}`
				);
			return result;
		} catch (e) {
			console.error(`Audiobookshelf settings: ${name} threw`, e);
			throw e;
		}
	};

/** @type {import('./$types').PageServerLoad} */
export const load = async () => {
	const settingValues = await settings.getSet('abs');

	const details = async () => {
		let connected = false;
		let issue: string | null = null;
		let serverVersion: string | null = null;
		let username: string | null = null;
		const libraries: Option[] = [];
		const folders: Option[] = [];

		if (
			settingValues['abs.enable'] &&
			settingValues['abs.address'] !== '' &&
			settingValues['abs.apiKey'] !== ''
		) {
			const conn: Connection = {
				address: settingValues['abs.address'],
				apiKey: settingValues['abs.apiKey'],
				timeoutMs: settingValues['abs.apiTimeout']
			};
			const test = await abs.testConnection(conn);
			if (test.ok) {
				serverVersion = test.value.serverVersion;
				username = test.value.username;
				const result = await abs.getLibraries(conn, false);
				if (result.ok) {
					connected = true;
					for (const library of result.value) {
						if (library.mediaType === 'book')
							libraries.push({ value: library.id, title: library.name });
						else
							libraries.push({
								value: library.id,
								title: `${library.name} (Podcasts)`,
								unset: true
							});
					}
					const selected = result.value.find((l) => l.id === settingValues['abs.library.id']);
					if (selected === undefined) {
						if (settingValues['abs.library.id'] !== '')
							issue = `The selected library '${settingValues['abs.library.name']}' no longer exists in Audiobookshelf.`;
						settingValues['abs.library.id'] = '';
						libraries.push({ value: '', title: 'Unset', unset: true });
					} else if (selected.folders.length > 1) {
						for (const folder of selected.folders)
							folders.push({ value: folder.id, title: folder.fullPath });
					}
				} else issue = result.message;
			} else issue = test.message;
		}

		// Not connected: show the saved library so the disabled select still says something useful
		if (!connected) {
			libraries.push(
				settingValues['abs.library.id'] === ''
					? { value: '', title: 'Unset', unset: true }
					: {
							value: settingValues['abs.library.id'],
							title: settingValues['abs.library.name'],
							unset: true
					  }
			);
		}

		return { connected, issue, serverVersion, username, libraries, folders };
	};

	return { settingValues, abs: await details() };
};

export const actions = {
	updateIntegration: logged('save', async ({ request }: { request: Request }) => {
		const data = await request.formData();
		const enableRaw = data.get('abs.enable') as string | null;
		const addressRaw = data.get('abs.address') as string | null;
		const apiKeyRaw = data.get('abs.apiKey') as string | null;
		const linkAddressRaw = data.get('abs.linkAddress') as string | null;
		const libraryId = data.get('abs.library.id') as string | null;
		const folderId = data.get('abs.library.folderId') as string | null;

		const saved = await settings.getSet('abs');
		const enable = enableRaw === null ? saved['abs.enable'] : enableRaw === 'true';
		const address = addressRaw === null ? saved['abs.address'] : addressRaw.trim();
		const apiKey = apiKeyRaw === null ? saved['abs.apiKey'] : apiKeyRaw.trim();
		console.log(
			`Audiobookshelf settings: saving enabled=${enable}, address='${address}', ` +
				`API key ${
					apiKey === '' ? 'empty' : apiKey === saved['abs.apiKey'] ? 'unchanged' : 'changed'
				}, ` +
				`library=${libraryId === null ? '(not sent)' : `'${libraryId}'`}`
		);

		// Normalize the address (drop trailing slashes) unless it is being cleared
		let normalized = '';
		if (address !== '') {
			const n = abs.normalizeAddress(address);
			if (n === null)
				return {
					action: ACTION_INTEGRATION,
					name: 'abs.address',
					success: false,
					message: abs.types.absErrorToString(AbsError.INVALID_ADDRESS)
				};
			normalized = n;
		}

		// Link URL: optional, only needs to be a valid URL (the browser uses it, not Unabridged)
		const linkAddress = linkAddressRaw === null ? saved['abs.linkAddress'] : linkAddressRaw.trim();
		let normalizedLink = '';
		if (linkAddress !== '') {
			const n = abs.normalizeAddress(linkAddress);
			if (n === null)
				return {
					action: ACTION_INTEGRATION,
					name: 'abs.linkAddress',
					success: false,
					message: "The Link URL must start with 'http://' or 'https://'."
				};
			normalizedLink = n;
		}

		// Disabled: save without contacting the server
		if (!enable) {
			await settings.set('abs.enable', false);
			await settings.set('abs.address', normalized);
			await settings.set('abs.linkAddress', normalizedLink);
			await settings.set('abs.apiKey', apiKey);
			return { action: ACTION_INTEGRATION, name: 'abs.enable', success: true, message: 'Saved' };
		}

		// Enabled: the connection has to work before anything is saved
		const conn: Connection = { address: normalized, apiKey, timeoutMs: saved['abs.apiTimeout'] };
		const test = await abs.testConnection(conn);
		if (!test.ok)
			return {
				action: ACTION_INTEGRATION,
				name: fieldForError(test.error),
				success: false,
				message: test.message
			};

		// Check the library before saving, so a bad choice saves nothing
		let library: abs.types.Library | null = null;
		if (libraryId !== null && libraryId !== '') {
			const result = await abs.getLibrary(conn, libraryId);
			if (!result.ok)
				return {
					action: ACTION_INTEGRATION,
					name: fieldForError(result.error),
					success: false,
					message: result.message
				};
			library = result.value;
			if (folderId !== null && folderId !== '' && !library.folders.some((f) => f.id === folderId))
				return {
					action: ACTION_INTEGRATION,
					name: 'abs.library.folderId',
					success: false,
					message: 'That folder is not part of the selected library.'
				};
		}

		// Cached IDs belong to one server and library; forget them if either changes
		const serverChanged = normalized !== saved['abs.address'];
		const libraryChanged = library !== null && library.id !== saved['abs.library.id'];
		if (serverChanged || libraryChanged) await clearCachedIds();

		await settings.set('abs.enable', true);
		await settings.set('abs.address', normalized);
		await settings.set('abs.linkAddress', normalizedLink);
		await settings.set('abs.apiKey', apiKey);
		await settings.set('abs.serverVersion', test.value.serverVersion);
		await settings.set('abs.username', test.value.username);
		if (library !== null) {
			await settings.set('abs.library.id', library.id);
			await settings.set('abs.library.name', library.name);
			// A single-folder library needs no choice; keep a choice only if it is still valid
			await settings.set(
				'abs.library.folderId',
				library.folders.length > 1 && folderId !== null ? folderId : ''
			);
		} else if (serverChanged) {
			// The old library ID means nothing on a different server
			await settings.set('abs.library.id', '');
			await settings.set('abs.library.name', '');
			await settings.set('abs.library.folderId', '');
		}

		return {
			action: ACTION_INTEGRATION,
			name: 'abs.enable',
			success: true,
			message: `Connected to Audiobookshelf ${test.value.serverVersion} as '${test.value.username}'.`
		};
	}),
	testIntegration: logged('test', async () => {
		const s = await settings.getSet('abs');
		const conn: Connection = {
			address: s['abs.address'],
			apiKey: s['abs.apiKey'],
			timeoutMs: s['abs.apiTimeout']
		};
		const test = await abs.testConnection(conn);
		if (!test.ok)
			return {
				action: ACTION_INTEGRATION,
				invalidatedParams: false,
				name: fieldForError(test.error),
				success: false,
				message: test.message
			};
		if (s['abs.library.id'] !== '') {
			const library = await abs.getLibrary(conn, s['abs.library.id']);
			if (!library.ok)
				return {
					action: ACTION_INTEGRATION,
					invalidatedParams: false,
					name: 'abs.library.id',
					success: false,
					message: library.message
				};
		}
		return {
			action: ACTION_INTEGRATION,
			invalidatedParams: false,
			name: 'abs.enable',
			success: true,
			message: `Connected to Audiobookshelf ${test.value.serverVersion} as '${test.value.username}'.`
		};
	}),
	clearIntegration: logged('clear', async () => {
		await settings.set('abs.enable', false);
		await settings.set('abs.address', '');
		await settings.set('abs.linkAddress', '');
		await settings.set('abs.apiKey', '');
		await settings.set('abs.serverVersion', '');
		await settings.set('abs.username', '');
		await settings.set('abs.library.id', '');
		await settings.set('abs.library.name', '');
		await settings.set('abs.library.folderId', '');
		await clearCachedIds();
		return {
			action: '?/clearIntegration',
			name: 'abs.clear',
			success: true,
			message: 'Cleared Integration'
		};
	}),
	updateScan: logged('scan settings', async ({ request }: { request: Request }) => {
		const data = await request.formData();
		const enable = data.get('abs.scan.enable') as string | null;
		if (enable !== null) await settings.set('abs.scan.enable', enable === 'true');
		const scheduled = data.get('abs.scan.scheduled') as string | null;
		if (scheduled !== null) await settings.set('abs.scan.scheduled', scheduled === 'true');
		const delay = data.get('abs.scan.delay') as string | null;
		if (delay !== null) {
			const value = parseInt(delay);
			if (isNaN(value) || value < 0 || value > 600)
				return {
					action: '?/updateScan',
					name: 'abs.scan.delay',
					success: false,
					message: 'The delay must be between 0 and 600 seconds.'
				};
			await settings.set('abs.scan.delay', value);
		}
	}),
	updateAPI: logged('API settings', async ({ request }: { request: Request }) => {
		const data = await request.formData();
		const apiTimeout = data.get('abs.apiTimeout') as string | null;
		if (apiTimeout !== null) {
			const value = parseInt(apiTimeout);
			if (isNaN(value) || value < 100 || value > 60000)
				return {
					action: '?/updateAPI',
					name: 'abs.apiTimeout',
					success: false,
					message: 'The timeout must be between 100 and 60000 milliseconds.'
				};
			await settings.set('abs.apiTimeout', value);
		}
		const scanTimeout = data.get('abs.scan.timeout') as string | null;
		if (scanTimeout !== null) {
			const value = parseInt(scanTimeout);
			if (isNaN(value) || value < 10 || value > 14400)
				return {
					action: '?/updateAPI',
					name: 'abs.scan.timeout',
					success: false,
					message: 'The scan timeout must be between 10 and 14400 seconds.'
				};
			await settings.set('abs.scan.timeout', value);
		}
	})
};
