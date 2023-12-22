import type * as Types from '@prisma/client';
import prisma from '$lib/server/prisma';
import * as audible from '$lib/server/cmd/audible';
import type { SideMenu, LinkMenuItem } from '$lib/types/';
import * as helpers from '$lib/helpers';
import { redirect } from '@sveltejs/kit';
import { ProfileCreationError, profileCreationErrorToMessage } from '$lib/server/cmd/audible/types';
import { saveGoogleAPIDetails } from '$lib/server/lookup';

/** @type {import('./$types').PageServerLoad} */
export async function load({}) {
	// TODO: This might be possible with a fancy count call
	const sourcesAndBooks = await prisma.source.findMany({
		include: {
			books: {
				select: {
					downloaded: true
				}
			}
		}
	});

	const sources = (await prisma.source.findMany()) as (Types.Prisma.SourceGetPayload<{}> & {
		num_books: number;
		num_downloaded: number;
	})[];

	for (let i = 0; i < sources.length; i++) {
		sources[i].num_books = sourcesAndBooks[i].books.length;
		sources[i].num_downloaded = 0;
		for (const book of sourcesAndBooks[i].books) {
			if (book.downloaded) {
				sources[i].num_downloaded += 1;
			}
		}
	}
	return {
		sources
	};
}

export const actions = {
	add: async (event) => {
		try {
			const url = await audible.cmd.profile.add();
			return { url, success: true, response: 'add' };
		} catch (e) {
			return {
				success: false,
				response: 'add',
				message: profileCreationErrorToMessage(e as ProfileCreationError)
			};
		}
	},
	cancel: async (event) => {
		await audible.cmd.profile.cancelAdd();
		await new Promise<void>((resolve) => setTimeout(resolve, 500));
		return { success: true, response: 'cancel' };
	},
	urlresponse: async ({ cookies, request }) => {
		const data = await request.formData();
		const url = data.get('url') as string;
		const name = data.get('name') as string;
		const urlresponse = data.get('urlresponse') as string;
		const ownership = data.get('ownership') as string;
		const nosharing = data.get('nosharing') as string;

		if (urlresponse !== null && ownership !== null && nosharing !== null) {
			if (!helpers.validateURL(urlresponse)) {
				return { success: false, response: 'urlresponse', url, message: 'Invalid URL' };
			}

			let results;

			try {
				results = await audible.cmd.profile.submitURL(urlresponse, name);
			} catch (e) {
				console.log('e2', e);
				return {
					success: false,
					response: 'urlresponse',
					fatal: true,
					message: profileCreationErrorToMessage(e as ProfileCreationError)
				};
			}

			if (results.e === ProfileCreationError.NO_ERROR) {
				throw redirect(301, '/sources/' + results.id);
			} else {
				console.log('e1', results.e);
				return {
					success: false,
					response: 'urlresponse',
					fatal: true,
					message: profileCreationErrorToMessage(results.e)
				};
			}
		} else {
			await new Promise<void>((resolve) => setTimeout(resolve, 1000));
			return {
				success: false,
				response: 'urlresponse',
				url,
				message: 'All acknowledgements must be checked'
			};
		}
	}
};
