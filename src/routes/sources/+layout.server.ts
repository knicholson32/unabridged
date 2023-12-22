import type * as Types from '@prisma/client';
import prisma from '$lib/server/prisma';
import type { SideMenu, LinkMenuItem } from '$lib/types/';
import { icons } from '$lib/components';

/** @type {import('./$types').PageServerLoad} */
export async function load({}) {
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
	const elements: LinkMenuItem[] = [];

	for (let i = 0; i < sources.length; i++) {
		sources[i].num_books = sourcesAndBooks[i].books.length;
		sources[i].num_downloaded = 0;
		for (const book of sourcesAndBooks[i].books) {
			if (book.downloaded) {
				sources[i].num_downloaded += 1;
			}
		}

		// const first = sources[i].first_name;
		// const last = sources[i].last_name;
		// let full_name = 'Unknown'
		// if (first !== null && last !== null) {
		//     miniTitle = first.charAt(0).toLocaleUpperCase() + last.charAt(0).toLocaleUpperCase()
		//     full_name = first + ' ' + last;
		// }

		const menuItem: LinkMenuItem = {
			type: 'link',
			title: sources[i].name,
			miniTitle: sources[i].name.charAt(0).toLocaleUpperCase(),
			href: `/sources/${sources[i].type}/${sources[i].id}`
		};
		elements.push(menuItem);
	}

	return {
		sideMenus: [
			{
				title: 'Accounts',
				elements: elements,
				button: {
					iconPath: icons.plus,
					href: '?/add',
					usePost: true
				}
			}
		] as SideMenu[]
	};
}
