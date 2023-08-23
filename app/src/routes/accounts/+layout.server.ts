import type * as Types from '@prisma/client';
import prisma from '$lib/server/prisma';
import type { SideMenu, LinkMenuItem } from '$lib/types/';
import { icons } from '$lib/components';

/** @type {import('./$types').PageServerLoad} */
export async function load({ }) {
    const profilesAndBooks = await prisma.profile.findMany({
        include: {
            books: true
        }
    });

    const profiles = await prisma.profile.findMany() as (Types.Prisma.ProfileMinAggregateOutputType & { num_books: number, num_downloaded: number })[];
    const elements: LinkMenuItem[] = [];

    for (let i = 0; i < profiles.length; i++) {
        profiles[i].num_books = profilesAndBooks[i].books.length;
        profiles[i].num_downloaded = 0;
        for (const book of profilesAndBooks[i].books) {
            if (book.downloaded) {
                profiles[i].num_downloaded += 1;
            }
        }

        let miniTitle = '?';
        const first = profiles[i].first_name;
        const last = profiles[i].last_name;
        let full_name = 'Unknown'
        if (first !== null && last !== null) {
            miniTitle = first.charAt(0).toLocaleUpperCase() + last.charAt(0).toLocaleUpperCase()
            full_name = first + ' ' + last;
        }

        const menuItem: LinkMenuItem = {
            type: 'link',
            title: full_name,
            miniTitle: miniTitle,
            href: '/accounts/' + profiles[i].id
        }
        elements.push(menuItem);
    }

    return {
        sideMenus: [{
            title: 'Accounts',
            elements: elements,
            button: {
                iconPath: icons.plus,
                href: '/accounts/add'
            }
        }] as SideMenu[]
    };
}