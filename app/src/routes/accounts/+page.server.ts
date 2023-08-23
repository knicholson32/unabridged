import type * as Types from '@prisma/client';
import prisma from '$lib/server/prisma';
import * as audible from '$lib/server/cmd/audible';
import type { SideMenu, LinkMenuItem } from '$lib/types/';
import * as helpers from '$lib/helpers';
import { redirect } from '@sveltejs/kit';
import type { Redirect } from '@sveltejs/kit';
import { ProfileCreationError, profileCreationErrorToMessage } from '$lib/server/cmd/audible/types';
import { saveGoogleAPIDetails } from '$lib/server/lookup';

/** @type {import('./$types').PageServerLoad} */
export async function load({ }) {
    const profilesAndBooks = await prisma.profile.findMany({
        include: {
            books: true
        }
    });
    
    const profiles = await prisma.profile.findMany() as (Types.Prisma.ProfileMinAggregateOutputType & { num_books: number, num_downloaded: number })[];

    for (let i = 0; i < profiles.length; i++) {
        profiles[i].num_books = profilesAndBooks[i].books.length;
        profiles[i].num_downloaded = 0;
        for (const book of profilesAndBooks[i].books) {
            if (book.downloaded) {
                profiles[i].num_downloaded += 1;
            }
        }
    }
    return { 
        profiles
    };
}


export const actions = {
    add: async (event) => {
        try {
            const url = await audible.cmd.profile.add();
            return { url, success: true, response: 'add' };
        } catch(e) {
            return { success: false, response: 'add', message: profileCreationErrorToMessage(e as ProfileCreationError) };
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
        const urlresponse = data.get('urlresponse') as string;
        const ownership = data.get('ownership') as string;
        const nosharing = data.get('nosharing') as string;

        if (urlresponse !== null && ownership !== null && nosharing !== null) {

            if (!helpers.validateURL(urlresponse)) {
                await new Promise<void>((resolve) => setTimeout(resolve, 1000));
                return { success: false, response: 'urlresponse', url, message: 'Invalid URL' };
            }

            const results = audible.cmd.profile.submitURL(urlresponse);
            let e: ProfileCreationError;
            try {
                e = await results.e;
            } catch (e) {
                return { success: false, response: 'urlresponse', fatal: true, message: profileCreationErrorToMessage(e as ProfileCreationError) };
            }
            await new Promise<void>((resolve) => setTimeout(resolve, 1000));
            if (e === ProfileCreationError.NO_ERROR) {
                throw redirect(301, '/accounts/' + results.id);
            } else {
                console.log('e1', e);
                return { success: false, response: 'urlresponse', fatal: true, message: profileCreationErrorToMessage(e) };
            }
            
        } else {
            await new Promise<void>((resolve) => setTimeout(resolve, 1000));
            return { success: false, response: 'urlresponse', url, message: 'All acknowledgements must be checked' };
        }
        

        // const url = data.get('url') as string;
        // console.log(url);
        // const success = await audible.cmd.profile.submitURL(url)
        // console.log(success);
        // return { success: false, response: 'urlresponse', };
    }
};