import * as audible from '$lib/server/cmd/audible';
import prisma from '$lib/server/prisma';
import { error, redirect } from '@sveltejs/kit';
import type { Decimal } from '@prisma/client/runtime/library.js';
import { v4 as uuidv4 } from 'uuid';
import { encodeURLAlert } from '$lib/components/alerts';
import { icons } from '$lib/components';
import * as serverHelpers from '$lib/server/helpers';
import type { GenerateAlert, Issuer, ModalTheme, ProgressAPI, ProgressStatus } from '$lib/types';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params, fetch }) => {


    const id = params.id;

    // Check that the ID was actually submitted
    if (id === null || id === undefined) throw error(404, 'Not found');

    // Get the profile from the database
    const profile = await prisma.profile.findUnique({ 
        where: { id }, 
        include: { 
            books: {
                include: {
                    cover: {
                        select: {
                            url_50: true
                        }
                    }
                }
            }
        }
    });

    // Return if the profile was not found
    if (profile === null || profile === undefined) throw error(404, 'Not found');

    for (const book of profile.books) book.rating = book.rating.toNumber() as unknown as Decimal;

    const syncing = {
        val: false,
        progress: 0
    }

    const progressResp: ProgressAPI = await (await fetch(`/api/progress/${id}/sync`)).json() as ProgressAPI;        

    if (progressResp.ok === true && progressResp.progress !== undefined) {
        syncing.val = progressResp.progress.status === 'RUNNING' satisfies ProgressStatus;
        syncing.progress = progressResp.progress.progress;
    }

    return {
        profile,
        syncing
    };

    // if (params.id === 'hello-world') {
    //     return {
    //         title: 'Hello world!',
    //         content: 'Welcome to our blog. Lorem ipsum dolor sit amet...'
    //     };
    // }

    // throw error(404, 'Not found');
}


export const actions = {
    deregister: async ({ request }) => {
        const data = await request.formData();
        const id = data.get('id') as string;
        // Check that the ID was actually submitted
        if (id === null || id === undefined) throw error(404, 'Not found');

        // Get the profile from the database
        const profile = await prisma.profile.findUnique({ where: { id } });

        // Return if the profile was not found
        if (profile === null || profile === undefined) throw error(404, 'Not found');

        // Remove the profile
        const success = await audible.cmd.profile.remove(id);
        if (success) {
            throw redirect(307, `/accounts?alert=${encodeURLAlert({
                text: 'Account deleted',
                settings: {
                    linger_ms: 15000,
                    iconPath: icons.fingerPrint,
                    iconColor: 'text-red-400',
                    subText: `The Audible account for <span class="text-gray-400">${profile.first_name} ${profile.last_name}</span> has been removed.`
                }
            })}`);
        }
        else
            return { response: 'deregister', success: false, message: 'Could not delete the account' };
    },
    sync: async ({ request, params }) => {
        const id = params.id;
        // Check that the ID was actually submitted
        if (id === null || id === undefined) throw error(404, 'Not found');;

        // Get the profile from the database
        const profile = await prisma.profile.findUnique({ where: { id } });

        // Return if the profile was not found
        if (profile === null || profile === undefined) throw error(404, 'Not found');

        const results = await audible.cmd.library.get(id);

        console.log('Create notification');
        await prisma.notification.create({
            data: {
                id: uuidv4(),
                issuer: 'general' satisfies Issuer,
                theme: 'info' satisfies ModalTheme,
                text: 'Synced at ' + new Date().toISOString(),
                linger_time: 10000,
                needs_clearing: true,
                auto_open: false
            }
        });

        if (results !== null) {
            return { response: 'sync', success: true, results };
        } else {
            return { response: 'sync', success: false, message: '' };
        }
    },
    auto_sync: async ({ request, params }) => {
        const id = params.id;
        // Check that the ID was actually submitted
        if (id === null || id === undefined) throw error(404, 'Not found');;

        // Get the profile from the database
        const profile = await prisma.profile.findUnique({ where: { id } });

        // Return if the profile was not found
        if (profile === null || profile === undefined) throw error(404, 'Not found');

        // Get form data
        const data = await request.formData();
        let auto_sync = (data.get('auto-sync') as string) === 'true' ? true : false;

        await prisma.profile.update({
            where: { id },
            data: { auto_sync }
        });

        return { response: 'auto_sync', success: true, invalidate: true };

    },
    upload: async ({ request, params }) => {
        const id = params.id;
        // Check that the ID was actually submitted
        if (id === null || id === undefined) throw error(404, 'Not found');;

        // Get the profile from the database
        const profile = await prisma.profile.findUnique({ where: { id } });

        // Return if the profile was not found
        if (profile === null || profile === undefined) throw error(404, 'Not found');

        // Get form data
        const data = await request.formData();
        const image = data.get('image') as File;

        // Check image size
        if (image.size / 1000000 > 50) {
            // Too large
            return { type: 'image', success: false, message: 'Image too large' };
        }

        const images = await serverHelpers.cropImages(await image.arrayBuffer());

        try {
            await prisma.profileImage.delete({ where: { id }});
        } catch(e) {
            // Nothing to do
        }

        // Store the image
        await prisma.profileImage.create({
            data: {
                full: images.full,
                i512: images.img512,
                i256: images.img256,
                i128: images.img128,
                i56: images.img56,
                content_type: image.type,
                id: id
            },
        });

        // Update the profile to include the new image url
        await prisma.profile.update({
            where: { id },
            data: {
                profile_image_url: '/api/image/' + id
            }
        });

        return { response: 'image', success: true, invalidate: true };
    },
    update: async ({ request, params }) => {
        const id = params.id;
        // Check that the ID was actually submitted
        if (id === null || id === undefined) throw error(404, 'Not found');;

        // Get the profile from the database
        const profile = await prisma.profile.findUnique({ where: { id } });

        // Return if the profile was not found
        if (profile === null || profile === undefined) throw error(404, 'Not found');

        // Get form data
        const data = await request.formData();
        let first_name = data.get('first-name') as string;
        let last_name = data.get('last-name') as string;
        let email = data.get('email') as string;
        let country = data.get('country') as string;
        let about = data.get('about') as string;

        console.log('data');
        console.log('first_name', first_name);
        console.log('last_name', last_name);
        console.log('email', email);
        console.log('country', country);
        console.log('about', about);

        await prisma.profile.update({
            where: { id },
            data: {
                first_name: first_name === '' ? undefined : first_name,
                last_name: last_name === '' ? undefined : last_name,
                email: email === '' ? undefined : email,
                locale_code: country === null ? undefined : country,
                description: about === '' ? undefined : about
            }
        })


        // const p = new Promise((resolve) => {
        //     setTimeout(resolve, 1000);
        // });
        // await p;
        return { response: 'update', success: true };
    },
};