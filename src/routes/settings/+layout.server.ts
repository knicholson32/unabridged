import { icons } from '$lib/components';
import type { SideMenu, LinkMenuItem } from '$lib/types/';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params }) {
	const elements: LinkMenuItem[] = [
		{
			type: 'link',
			title: 'General',
			iconSVG: icons.adjustmentsHorizontal,
			href: '/settings/general'
		},
		{
			type: 'link',
			title: 'Audiobookshelf',
			iconSVG: icons.book,
			href: '/settings/audiobookshelf'
		},
		{
			type: 'link',
			title: 'System',
			iconSVG: icons.cube,
			href: '/settings/system'
		},
		{
			type: 'link',
			title: 'Library',
			iconSVG: icons.circleStack,
			href: '/settings/library'
		}
	];

	return {
		sideMenus: [
			{
				title: 'Settings',
				elements: elements
				// button: {
				//     iconPath: icons.plus,
				//     href: '/sources/add'
				// }
			}
		] as SideMenu[]
	};
}
