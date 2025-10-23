<script lang="ts">
	import { RunTime, basicPlural, joinWithLimit } from '$lib/helpers';
	import { Gray } from '$lib/components/frames';
	import { formatDistanceToNow, format } from 'date-fns';

	export let data: import('./$types').PageData;

	const formatRuntime = (minutes: number | null | undefined) => {
		if (!minutes || minutes <= 0) {
			return {
				long: '0 minutes',
				short: '00:00:00'
			};
		}
		const runtime = new RunTime({ min: minutes });
		return {
			long: runtime.toFormat(),
			short: runtime.toDirectFormatFull()
		};
	};

	const totalRuntime = formatRuntime(data.summary.totalRuntimeMinutes);
	// const downloadedRuntime = formatRuntime(data.summary.downloadedRuntimeMinutes);
	const averageRuntime = formatRuntime(data.summary.averageRuntimeMinutes);

	const mostRecentAdditionMs = data.recentBooks[0]?.purchaseDateMs ?? null;

	const processedPercent =
		data.summary.bookCount === 0
			? 0
			: Math.round((data.summary.processedCount / data.summary.bookCount) * 100);
	// const downloadedPercent =
	// 	data.summary.bookCount === 0
	// 		? 0
	// 		: Math.round((data.summary.downloadedCount / data.summary.bookCount) * 100);

	const breakdownStats = [
		{ title: 'Series', value: data.summary.seriesCount },
		{ title: 'Authors', value: data.summary.authorCount },
		{ title: 'Narrators', value: data.summary.narratorCount },
		{ title: 'Genres', value: data.summary.genreCount },
		{ title: 'Sources', value: data.summary.sourceCount }
	];
</script>

<Gray class="px-4 py-6">
	<div class="mx-auto flex w-full max-w-7xl flex-col gap-8">
		<section class="flex flex-col gap-2">
			<h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-50">Library Dashboard</h1>
			<p class="max-w-2xl text-sm text-gray-600 dark:text-gray-300">
				Audiobook library and sources at a glance.
			</p>
		</section>

		<section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			<div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
				<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Books</p>
				<p class="mt-2 text-3xl font-semibold text-gray-900 dark:text-gray-50">
					{data.summary.bookCount.toLocaleString()}
				</p>
				<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
					Across {data.summary.sourceCount.toLocaleString()} {basicPlural('source', data.summary.sourceCount)}
				</p>
			</div>

			<div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
				<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Added to Unabridged</p>
				<p class="mt-2 flex items-baseline gap-2 text-3xl font-semibold text-gray-900 dark:text-gray-50">
					{data.summary.processedCount.toLocaleString()}
					<span class="text-sm font-medium text-blue-600 dark:text-blue-400">{processedPercent}%</span>
				</p>
				<div class="mt-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
					<div
						class="h-2 rounded-full bg-blue-500 dark:bg-blue-400"
						style={`width: ${Math.min(100, processedPercent)}%;`}
					/>
				</div>
				<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
					{data.summary.unprocessedCount.toLocaleString()} {basicPlural('book', data.summary.unprocessedCount)} remaining
				</p>
			</div>

			<!-- <div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
				<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Downloaded</p>
				<p class="mt-2 flex items-baseline gap-2 text-3xl font-semibold text-gray-900 dark:text-gray-50">
					{data.summary.downloadedCount.toLocaleString()}
					<span class="text-sm font-medium text-emerald-600 dark:text-emerald-400"
						>{downloadedPercent}%</span
					>
				</p>
				<div class="mt-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
					<div
						class="h-2 rounded-full bg-emerald-500 dark:bg-emerald-400"
						style={`width: ${Math.min(100, downloadedPercent)}%;`}
					/>
				</div>
				<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
					{data.summary.notDownloadedCount.toLocaleString()} {basicPlural('book', data.summary.notDownloadedCount)} pending download
				</p>
			</div> -->

			<div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
				<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Added in 30 Days</p>
				<p class="mt-2 text-3xl font-semibold text-gray-900 dark:text-gray-50">
					{data.summary.booksAddedLast30Days.toLocaleString()}
				</p>
				<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
					{#if mostRecentAdditionMs !== null}
						Last addition {formatDistanceToNow(mostRecentAdditionMs, { addSuffix: true })}
					{:else}
						No recent additions detected
					{/if}
				</p>
			</div>
		</section>

		<section class="grid gap-4 lg:grid-cols-2">
			<div class="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
				<header class="flex items-start justify-between">
					<div>
						<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Runtime</h2>
						<p class="text-sm text-gray-500 dark:text-gray-400">
							Aggregate play time based on Audible metadata.
						</p>
					</div>
				</header>

				<div class="space-y-3">
					<div>
						<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Runtime</p>
						<p class="text-2xl font-semibold text-gray-900 dark:text-gray-50">{totalRuntime.long}</p>
						<p class="text-xs text-gray-500 dark:text-gray-400">{totalRuntime.short}</p>
					</div>

					<div class="border-t border-dashed border-gray-200 pt-3 dark:border-gray-700">
						<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Average per Book</p>
						<p class="text-xl font-semibold text-gray-900 dark:text-gray-50">{averageRuntime.long}</p>
						<p class="text-xs text-gray-500 dark:text-gray-400">{averageRuntime.short}</p>
					</div>
				</div>
			</div>

			<div class="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
				<header>
					<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Library Breakdown</h2>
					<p class="text-sm text-gray-500 dark:text-gray-400">
						High-level counts of people, genres and collections represented.
					</p>
				</header>

				<ul class="grid grid-cols-2 gap-3 sm:grid-cols-3">
					{#each breakdownStats as stat}
						<li class="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center dark:border-gray-700 dark:bg-gray-800">
							<p class="text-2xl font-semibold text-gray-900 dark:text-gray-50">
								{stat.value.toLocaleString()}
							</p>
							<p class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
								{stat.title}
							</p>
						</li>
					{/each}
				</ul>
			</div>
		</section>

		<section class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
			<header class="mb-4 flex items-center justify-between">
				<div>
					<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Additions</h2>
					<p class="text-sm text-gray-500 dark:text-gray-400">
						Latest books added to connected libraries
					</p>
				</div>
				<a
					class="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
					href="/library"
					>View library</a
				>
			</header>

			{#if data.recentBooks.length === 0}
				<p class="text-sm text-gray-500 dark:text-gray-400">No books available yet.</p>
			{:else}
				<ul class="space-y-4">
					{#each data.recentBooks as book (book.asin)}
						<li class="flex gap-4 rounded-lg border border-transparent p-3 transition-colors hover:border-blue-100 hover:bg-blue-50/60 dark:hover:border-blue-900 dark:hover:bg-blue-900/10">
							{#if book.cover}
								<img
									src={book.cover.url100}
									alt={`${book.title} cover`}
									class="h-16 w-16 flex-shrink-0 rounded-md object-cover shadow-sm"
									loading="lazy"
									width="64"
									height="64"
								/>
							{:else}
								<div
									class="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-md bg-gray-200 text-lg font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-200"
								>
									{book.title.slice(0, 1)}
								</div>
							{/if}

							<div class="flex min-w-0 flex-1 flex-col gap-1">
								<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
									<a
										href={`/library/books/${book.asin}`}
										class="truncate text-base font-semibold text-gray-900 transition-colors hover:text-blue-600 dark:text-gray-50 dark:hover:text-blue-300"
									>
										{book.title}
									</a>
									{#if book.subtitle}
										<span class="truncate text-sm text-gray-500 dark:text-gray-400">— {book.subtitle}</span>
									{/if}
								</div>

								{#if book.authors.length > 0}
									<p class="text-sm text-gray-500 dark:text-gray-400">
										{joinWithLimit(book.authors, 3)}
									</p>
								{/if}

								<div class="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
									<span>
										Added {formatDistanceToNow(book.purchaseDateMs, { addSuffix: true })}
										<span
											class="ml-1 text-gray-400 dark:text-gray-500"
											title={format(book.purchaseDateMs, 'PPpp')}
											>(on {format(book.purchaseDateMs, 'PP')})</span
										>
									</span>
									{#if book.runtimeMinutes}
										<span>
											Runtime {new RunTime({ min: book.runtimeMinutes }).toFormat()}
										</span>
									{/if}
									{#if !book.processed}
										{#if !book.downloaded}
											<span class="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
												Not in Unabridged
											</span>
										{:else}
											<span class="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
												Downloaded
											</span>
										{/if}
									{:else}
										<span class="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
											Downloaded & Processed
										</span>
									{/if}
								</div>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
</Gray>
