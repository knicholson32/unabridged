import prisma from '$lib/server/prisma';
import { json } from '@sveltejs/kit';
import { API } from '$lib/types';
import { LibraryManager } from '$lib/server/cmd/index.js';

export const GET = async ({ params }) => {
	const asin = params.asin;

	// Check that the ID was actually submitted
	if (asin === null || asin === undefined) return API.response._400({ missingPaths: ['asin'] });

	// // Clean the files that are hanging
	// await clean();

	// Get the profile from the database
	const book = await prisma.book.findUnique({ where: { asin } });

	// Return if the profile was not found
	if (book === null || book === undefined) return API.response._404();

	// Check that the book isn't currently being downloaded
	if (await LibraryManager.getIsQueued(book.asin))
		return API.response._400({ message: 'Book is being downloaded already' });

	// Queue the book
	await LibraryManager.queueBook(book.asin);

	// Return OK
	return API.response.success();
};
