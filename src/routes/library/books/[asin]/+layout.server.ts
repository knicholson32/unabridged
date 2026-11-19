import prisma from '$lib/server/prisma';
import { compareSeriesSequence } from '$lib/helpers';
import type { SideMenu, LinkMenuItem } from '$lib/types/';
import { icons } from '$lib/components';
import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params }) {
	const asin = params.asin;

	// Check that the ID was actually submitted
	if (asin === null || asin === undefined) throw error(404, 'Not found');

	// Get the profile from the database
	const book = await prisma.book.findUnique({
		where: { asin },
		include: {
			series: {
				select: {
					id: true,
					title: true,
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
			}
		}
	});

	// Return if the profile was not found
	if (book === null || book === undefined) throw error(404, 'Not found');

	if (book.series === null) return;

	book.series.books.sort(
		(a, b) =>
			compareSeriesSequence(a.series_sequence, b.series_sequence) || a.title.localeCompare(b.title)
	);

	const elements: LinkMenuItem[] = [];

	for (const b of book.series.books) {
		const menuItem: LinkMenuItem = {
			type: 'link',
			title: b.title,
			iconURL: b.cover?.url_50,
			href: '/library/books/' + b.asin
		};
		elements.push(menuItem);
	}

	return {
		sideMenus: [
			{
				title: book.series.title,
				elements: elements,
				button: {
					iconPath: icons.arrowRight,
					href: '/library/series/' + book.series.id
				}
			}
		] as SideMenu[]
	};
}
