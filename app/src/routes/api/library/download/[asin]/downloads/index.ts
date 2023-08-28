import type { BookDownloadError } from "$lib/server/cmd/audible/types";

export const downloadPromises: { [key: string]: Promise<BookDownloadError> } = {};