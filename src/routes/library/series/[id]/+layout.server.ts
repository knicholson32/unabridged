import prisma from '$lib/server/prisma';
import { compareSeriesSequence } from '$lib/helpers';
import type { SideMenu, LinkMenuItem } from '$lib/types/';
import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params }) {
	const id = params.id;

	// Check that the ID was actually submitted
	if (id === null || id === undefined) throw error(404, 'Not found');

	// Get the profile from the database
	const series = await prisma.series.findUnique({
		where: { id },
		include: {
			books: {
				select: {
					asin: true,
					title: true,
					subtitle: true,
					series_sequence: true,
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
	if (series === null || series === undefined) throw error(404, 'Not found');

	series.books.sort(
		(a, b) =>
			compareSeriesSequence(a.series_sequence, b.series_sequence) || a.title.localeCompare(b.title)
	);

	const elements: LinkMenuItem[] = [];

	for (const book of series.books) {
		const menuItem: LinkMenuItem = {
			type: 'link',
			title: book.title,
			iconURL: book.cover?.url_50,
			href: '/library/books/' + book.asin
		};
		elements.push(menuItem);
	}

	return {
		sideMenus: [
			{
				title: 'Books in Series',
				elements: elements
				// button: {
				//     iconPath: icons.plus,
				//     href: '/sources/add'
				// }
			}
		] as SideMenu[]
	};
}
