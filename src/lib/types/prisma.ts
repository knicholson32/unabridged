import type { Prisma } from '@prisma/client';

export const processQueueBOOKInclude = {
	book: {
		include: {
			book: {
				select: {
					cover: {
						select: {
							url_100: true
						}
					},
					authors: {
						select: {
							name: true
						}
					},
					title: true
				}
			}
		}
	}
} satisfies Prisma.ProcessQueueSelect;
