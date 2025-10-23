import prisma from '$lib/server/prisma';
import type { PageServerLoad } from './$types';

const RECENT_BOOK_LIMIT = 8;
const DAYS_30_IN_SECONDS = 30 * 24 * 60 * 60;

export const load = (async () => {
	const nowSeconds = Math.floor(Date.now() / 1000);
	const thirtyDaysAgo = BigInt(nowSeconds - DAYS_30_IN_SECONDS);

	const [
		bookCount,
		processedCount,
		totalRuntimeAgg,
		seriesCount,
		authorCount,
		narratorCount,
		genreCount,
		sourceCount,
		booksAddedLast30Days,
		recentBooksRaw
	] = await Promise.all([
		prisma.book.count(),
		prisma.book.count({ where: { processed: true } }),
		prisma.book.aggregate({
			_sum: { runtime_length_min: true },
			_avg: { runtime_length_min: true }
		}),
		prisma.series.count(),
		prisma.author.count(),
		prisma.narrator.count(),
		prisma.genre.count(),
		prisma.source.count(),
		prisma.book.count({ where: { purchase_date: { gte: thirtyDaysAgo } } }),
		prisma.book.findMany({
			orderBy: { date_added: 'desc' },
			take: RECENT_BOOK_LIMIT,
			select: {
				asin: true,
				title: true,
				subtitle: true,
				purchase_date: true,
				runtime_length_min: true,
				processed: true,
				downloaded: true,
				cover: {
					select: {
						url_100: true,
						url_500: true
					}
				},
				authors: {
					select: {
						name: true
					}
				},
				sources: {
					select: {
						id: true,
						name: true,
						type: true,
						profile_image_url: true
					}
				}
			}
		})
	]);

	const totalRuntimeMinutes = totalRuntimeAgg._sum.runtime_length_min ?? 0;
	const averageRuntimeMinutes = totalRuntimeAgg._avg.runtime_length_min ?? 0;

	const recentBooks = recentBooksRaw.map((book) => ({
		asin: book.asin,
		title: book.title,
		subtitle: book.subtitle,
		runtimeMinutes: book.runtime_length_min ?? null,
		purchaseDateMs: Number(book.purchase_date) * 1000,
		processed: book.processed,
		downloaded: book.downloaded,
		authors: book.authors.map((author) => author.name),
		cover: book.cover
			? {
					url100: book.cover.url_100,
					url500: book.cover.url_500
				}
			: null,
		sources: book.sources.map((source) => ({
			id: source.id,
			name: source.name,
			type: source.type,
			profileImageUrl: source.profile_image_url
		}))
	}));

	return {
		summary: {
			bookCount,
			processedCount,
			unprocessedCount: Math.max(0, bookCount - processedCount),
			booksAddedLast30Days,
			totalRuntimeMinutes,
			averageRuntimeMinutes,
			seriesCount,
			authorCount,
			narratorCount,
			genreCount,
			sourceCount
		},
		recentBooks
	};
}) satisfies PageServerLoad;
