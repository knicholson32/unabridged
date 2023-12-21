import * as audible from '$lib/server/cmd/audible';
import prisma from '$lib/server/prisma';
import { error, redirect } from '@sveltejs/kit';
import type { Decimal } from '@prisma/client/runtime/library.js';
import { v4 as uuidv4 } from 'uuid';
import * as settings from '$lib/server/settings';
import { icons } from '$lib/components';
import * as serverHelpers from '$lib/server/helpers';
import * as events from '$lib/server/events';
import { SourceType, type Issuer, type ModalTheme, type Notification } from '$lib/types';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params, fetch }) => {


    const id = params.id;

    // Check that the ID was actually submitted
    if (id === null || id === undefined) throw error(404, 'Not found');

    // Get the profile from the database
    const source = await prisma.source.findUnique({ 
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
            },
            audible: true
        }
    });

    // Return if the profile was not found
    if (source === null || source === undefined) throw error(404, 'Not found');

    // Redirect if the source type isn't correct
    if (source.type !== SourceType.AUDIBLE) throw redirect(301, `/sources/${id}`);

    // Protect against Decimal JSON conversion issues by making it a number
    for (const book of source.books) book.rating = book.rating.toNumber() as unknown as Decimal;

    return {
        source,
        tz: await settings.get('general.timezone')
    };
}


export const actions = {
    deregister: async ({ request, fetch }) => {
        const data = await request.formData();
        const debug = await settings.get('system.debug');
        const id = data.get('id') as string;
        // Check that the ID was actually submitted
        if (id === null || id === undefined) throw error(404, 'Not found');

        // Get the profile from the database
        const source = await prisma.source.findUnique({ where: { id } });

        // Return if the profile was not found
        if (source === null || source === undefined) throw error(404, 'Not found');

        // We need to check if there are any books being downloaded or processed
        const count = await prisma.processBook.count({
           where: {
            queueEntry: {
                is_done: false,
            },
            book: {
                sources: {
                    some: {
                        id: id
                    }
                }
            }
           } 
        });

        if (count > 0) return { response: 'deregister', success: false, message: 'Could not delete the account: One or more books using this source are currently being downloaded or processed.' };

        if (debug) console.log('deregister', id);

        // Remove the profile
        const success = await audible.cmd.profile.remove(id);
        if (debug) console.log('success', success);
        if (success) {
            const notification: Notification = {
                id: uuidv4(),
                icon_path: icons.fingerPrint,
                icon_color: 'text-red-400',
                theme: 'info',
                text: 'Account deleted',
                sub_text: `The Audible account for <span class="text-gray-400">${source.name}</span> has been removed.`,
                linger_time: 15000,
                needs_clearing: true,
                auto_open: true,
                issuer: 'general',
                identifier: null
            }
            await prisma.notification.create({ data: notification});
            events.emit('notification.created', [notification]);
            throw redirect(307, `/sources`);
        }
        else
            return { response: 'deregister', success: false, message: 'Could not delete the account' };
    },
    sync: async ({ request, params }) => {
        const id = params.id;
        // Check that the ID was actually submitted
        if (id === null || id === undefined) throw error(404, 'Not found');;

        // Get the profile from the database
        const source = await prisma.source.findUnique({ where: { id } });

        // Return if the profile was not found
        if (source === null || source === undefined) throw error(404, 'Not found');

        const results = await audible.cmd.library.get(id);

        const notification: Notification = {
            id: uuidv4(),
            icon_color: null,
            icon_path: null,
            issuer: 'account.sync' satisfies Issuer,
            theme: 'info' satisfies ModalTheme,
            text: 'Synced at ' + new Date().toISOString(),
            sub_text: null,
            identifier: null,
            linger_time: 10000,
            needs_clearing: true,
            auto_open: false
        }
        await prisma.notification.create({ data: notification });
        events.emit('notification.created', [notification]);

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
        const sources = await prisma.source.findUnique({ where: { id } });

        // Return if the profile was not found
        if (sources === null || sources === undefined) throw error(404, 'Not found');

        // Get form data
        const data = await request.formData();
        let auto_sync = (data.get('auto-sync') as string) === 'true' ? true : false;

        await prisma.source.update({
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
        const sources = await prisma.source.findUnique({ where: { id } });

        // Return if the profile was not found
        if (sources === null || sources === undefined) throw error(404, 'Not found');

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
        await prisma.source.update({
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
        const source = await prisma.source.findUnique({ where: { id } });

        // Return if the profile was not found
        if (source === null || source === undefined) throw error(404, 'Not found');

        // Get form data
        const data = await request.formData();
        let name = data.get('name') as string;
        let country = data.get('country') as string;
        let about = data.get('about') as string;

        console.log('data');
        console.log('name', name);
        console.log('country', country);
        console.log('about', about);

        await prisma.source.update({
            where: { id },
            data: {
                name: name === '' ? undefined : name,
                description: about === '' ? undefined : about
            }
        });

        // Update the country code if applicable
        if (source.type === SourceType.AUDIBLE && country !== '' && country !== undefined && country !== null) {
            try {
                await prisma.audibleAccount.update({
                    where: { id: source.id },
                    data: { locale_code: country },
                });
            } catch (e) {
                // Nothing to do if this fails
            }
        }

        return { response: 'update', success: true };
    },
};