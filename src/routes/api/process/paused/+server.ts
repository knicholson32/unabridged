import * as settings from '$lib/server/settings';
import { LibraryManager } from '$lib/server/cmd/index.js';
import { API } from '$lib/types';

export const GET = async ({}) => {
	const paused = await settings.get('progress.paused');
	return API.response.success({ bool: paused });
};
