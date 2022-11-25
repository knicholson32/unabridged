<script lang="ts">
    import * as requests from '$lib/client/requests';
    import { BookStatus, OperationStatus, type BookDownloadOperationData, type LibraryItemBookInfo } from '$lib/types';
    export let book: LibraryItemBookInfo;

    let downloadProgress = 0;
    let downloadActive = false;

    let operation: BookDownloadOperationData;
    let operationStatusTimeout: number = 0;

    const sleep = (timeout: number) =>
        new Promise((resolve, _) => setTimeout(resolve, timeout));

    const monitorDownload = async () => {
        while (downloadActive && operationStatusTimeout < 250) {
            await sleep(1000);
            await (async () => {
                operation = await requests.bookDownloadOSR(operation.id);

                // Not started yet or doesnt exist
                if (operation.status === OperationStatus.Inactive) {
                    downloadProgress = 0;
                    operationStatusTimeout++;
                }

                // Currently Active
                else if (operation.status === OperationStatus.Active) {
                    downloadProgress = operation.progress;
                }

                // Done
                else if (operation.status === OperationStatus.Done) {
                    console.log('done');
                    downloadProgress = 100;
                    downloadActive = false;
                }
            })();
        }

        // Update the book
        book = await requests.getBookData(book.asin);
        console.log('New Book Version Recevied', book);
    };

    const download = async () => {
        if (!downloadActive) {
            downloadActive = true;
            console.log('Starting Download', book.asin);
            operation = await requests.startBookDownload(book.asin);

            operationStatusTimeout = 0;
            monitorDownload();
        }
    };

    $: buttonText =
        book.status === BookStatus.Absent ? 'Download' : 'Downloaded';
</script>

<article class="flex items-start space-x-6 p-6">
    <img
        src={book.image}
        alt=""
        width="60"
        height="88"
        class="flex-none rounded-md bg-slate-100"
    />
    <div class="relative min-w-0 flex-auto">
        <h2 class="truncate pr-20 font-semibold text-slate-900">
            {book.title}
        </h2>
        <dl class="mt-2 flex flex-wrap text-sm font-medium leading-6">
            <div class="absolute top-0 right-0 flex items-center space-x-1">
                <dt class="text-sky-500">
                    <span class="sr-only">Star rating</span>
                    <svg width="16" height="20" fill="currentColor">
                        <path
                            d="M7.05 3.691c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.372 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.539 1.118l-2.8-2.034a1 1 0 00-1.176 0l-2.8 2.034c-.783.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.363-1.118L.98 9.483c-.784-.57-.381-1.81.587-1.81H5.03a1 1 0 00.95-.69L7.05 3.69z"
                        />
                    </svg>
                </dt>
                <dd>{book.rating}</dd>
            </div>
            <div>
                <dt class="sr-only">Rating</dt>
                <dd class="rounded px-1.5 ring-1 ring-slate-200">
                    {book.rating}
                </dd>
            </div>
            <div class="ml-2">
                <dt class="sr-only">Year</dt>
                <dd>{book.release_date}</dd>
            </div>
            <div>
                <dt class="sr-only">Genre</dt>
                <dd class="flex items-center">
                    <svg
                        width="2"
                        height="2"
                        fill="currentColor"
                        class="mx-2 text-slate-300"
                        aria-hidden="true"
                    >
                        <circle cx="1" cy="1" r="1" />
                    </svg>
                    {book.genres[0]}
                </dd>
            </div>
            <div>
                <dt class="sr-only">Runtime</dt>
                <dd class="flex items-center">
                    <svg
                        width="2"
                        height="2"
                        fill="currentColor"
                        class="mx-2 text-slate-300"
                        aria-hidden="true"
                    >
                        <circle cx="1" cy="1" r="1" />
                    </svg>
                    {book.length}
                </dd>
            </div>
            <div class="mt-2 w-full flex-none font-normal">
                <dt class="sr-only">Author</dt>
                <dd class="text-slate-400">{book.authors[0]}</dd>
            </div>

            <button
                class="block rounded-md px-3 py-2 text-sm font-medium {downloadActive
                    ? 'bg-sky-500 text-white'
                    : 'bg-slate-100'}"
                on:click={download}
                >{buttonText + ' ' + downloadProgress + '%'}</button
            >
        </dl>
    </div>
</article>
