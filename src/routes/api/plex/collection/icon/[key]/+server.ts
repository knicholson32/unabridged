import { json } from '@sveltejs/kit';
import { API } from '$lib/types';
import * as Plex from '$lib/server/plex';
import * as settings from '$lib/server/settings';
import { toBuffer } from '$lib/helpers';
import zlib from 'node:zlib';

export const GET = async ({ setHeaders, params, request }) => {
	const key = params.key;

	// Check that the ID was actually submitted
	if (key === null || key === undefined) return API.response._400({ missingPaths: ['key'] });

	const plexSettings = await settings.getMany(
		'plex.address',
		'plex.token',
		'system.debug',
		'plex.enable'
	);
	const debug = plexSettings['system.debug'];

	// Make sure plex is enabled
	if (plexSettings['plex.enable'] === false)
		return API.response._400({ message: 'Plex is not enabled' });

	// Get the plex address
	const plexAddress = plexSettings['plex.address'];

	// Get the collection URL
	const urlObj = await Plex.collections.getCollectionThumbnailURLs(
		[key],
		plexAddress,
		plexSettings['plex.token']
	);

	// Return if the profile was not found
	if (urlObj === null || !(key in urlObj)) return API.response._404();
	const url = urlObj[key];

	// Initialize a variable to hold the status so we can return it if there is a parse error
	let status: number | null = null;

	let exp: Buffer;

	// Get the data
	try {
		// Make the fetch request
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				Accept: 'application/json',
				'X-Plex-Token': plexSettings['plex.token']
			}
		});
		const contentType = response.headers.get('Content-Type') ?? 'image/jpeg';

		// Print some extra data if debugging
		if (debug && response.status === 401) {
			console.log('unauthorized', response.status, response.statusText);
			return json(
				{ status: 401, ok: false, message: 'Plex is not authorized' } satisfies API.Error,
				{ status: 401 }
			);
		}

		const encoding = request.headers.get('accept-encoding')?.includes('bsr')
			? 'br'
			: request.headers.get('accept-encoding')?.includes('gzip')
			? 'gzip'
			: request.headers.get('accept-encoding')?.includes('deflate')
			? 'deflate'
			: 'none';

		const headers: { [key: string]: string } = {
			'content-type': contentType
		};

		if (encoding !== 'none') headers['Content-Encoding'] = encoding;

		switch (encoding) {
			case 'br':
				exp = zlib.brotliCompressSync(await response.arrayBuffer());
				break;
			case 'gzip':
				exp = zlib.gzipSync(await response.arrayBuffer());
				break;
			case 'deflate':
				exp = zlib.deflateSync(await response.arrayBuffer());
				break;
			default:
				exp = toBuffer(await response.arrayBuffer());
				break;
		}

		headers['Content-Length'] = exp.length.toString();

		// Assign status just in case we error
		status = response.status;

		try {
			setHeaders(headers);
			return new Response(exp);
		} catch (e) {
			console.log('server error', e);
			return API.response.serverError(e);
		}
	} catch (e) {
		console.log('server error', e);
		return API.response.serverError(e);
	}
};
