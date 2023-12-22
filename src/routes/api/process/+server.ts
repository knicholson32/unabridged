import * as settings from '$lib/server/settings';
import type { API } from '$lib/types';
import { compressJSONResponse } from '$lib/server/helpers/index.js';

export const GET = async ({ request, setHeaders }) => {
	const processSettings = await settings.getSet('progress');

	return compressJSONResponse(request, {
		ok: true,
		settings: processSettings,
		status: 200,
		type: 'process.settings'
	} satisfies API.Process.Settings);
};
