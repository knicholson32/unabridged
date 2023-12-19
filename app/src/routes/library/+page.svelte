<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
  import * as helpers from '$lib/helpers';
	import type * as Table from '$lib/table';
	import * as table from '$lib/table';
	export let data: import('./$types').PageData;
	import Book from '$lib/components/routeSpecific/library/Book.svelte';
	import SortBy from '$lib/components/routeSpecific/library/SortBy.svelte';
	import icons from '$lib/components/icons';
	import { Gray } from '$lib/components/frames';


	let params: Table.Params;
	let groupSortURL: string;
	let titleSortURL: string;
	let orderSortURL: string;
	let clearSearchURL: string;

	let groupBySeriesURL: string;
	let groupByAuthorURL: string;
	let groupByNarratorURL: string;

	let nextPageURL: string;
	let previousPageURL: string;


	let innerWidth: number;
	let numCols = 6;

	$: numCols = (innerWidth < 768) ? 3 : (innerWidth < 1024) ? 4 : 5


	$: {
		params = table.resolve($page.url, params);
		params.search = $page.url.searchParams.get('s')??'';
		groupSortURL = generateURL({ groupOrder: !params.groupOrder });
		titleSortURL = generateURL({ sortCategory: 'title' }, true);
		orderSortURL = generateURL({ sortCategory: 'order' }, true);

		groupBySeriesURL = generateURL({group: 'series', groupOrder: table.stringToOrder('asc')});
		groupByAuthorURL = generateURL({group: 'author', groupOrder: table.stringToOrder('asc')});
		groupByNarratorURL = generateURL({group: 'narrator', groupOrder: table.stringToOrder('asc')});

		clearSearchURL = generateURL({search: ''});

		nextPageURL = generateURL({ page: (data.page ?? 0) + 1 }, true);
		previousPageURL = generateURL({ page: (data.page ?? 0) - 1 }, true);
	}


	const generateURL = (change: Table.Change, reverseOrderIfSameCategory = false) => {
		const p = {
			g: params.group,
			s: params.search,
			o: table.orderToString(params.order),
			go: table.orderToString(params.groupOrder),
			c: params.sortCategory,
			p: params.page.toString()
		};

		if (reverseOrderIfSameCategory) {
			if (change.sortCategory === params.sortCategory) change.order = !params.order;
			else p.o = 'asc';
		}

		if (change.group !== undefined) p.g = change.group;
		if (change.order !== undefined) p.o = table.orderToString(change.order);
		if (change.groupOrder !== undefined) p.go = table.orderToString(change.groupOrder);
		if (change.sortCategory !== undefined) p.c = change.sortCategory;
		if (change.search !== undefined) p.s = change.search;
		if (change.page !== undefined) {
			if (change.page < 0) p.p = p.p;
			else if (change.page >= data.pages) p.p = p.p;
			else p.p = change.page.toString();
		}


		// g : group : Group
		// s : search : Search
		// o : order : Order
		// c : sort category : SortCategory

		return '/library?' + helpers.serialize(p as { [key: string]: string });
	}

	const tableXPadding = 'px-1';
	const tableXPaddingLeft = 'pl-2 pr-1';

	let searchBar: HTMLInputElement;
	const submitSearch = () => {
		if (!data.autoSubmit) return;
		params.search = searchBar.value;
		params = params;
		goto(generateURL({page: 0}), { replaceState: true, keepFocus: true });
	}

</script>

<svelte:window bind:innerWidth />

<Gray class="px-4 pt-5 pb-5 mx-auto">
	<!-- Top controls -->
	<div class="sm:flex sm:items-center sm:justify-between">
		<div>
			<div class="flex items-center gap-x-3">
				<h2 class="text-lg font-medium text-gray-800 dark:text-white">Library</h2>

				<span class="px-3 py-1 text-xs align-middle text-blue-600 bg-blue-100 rounded-full dark:bg-gray-800 dark:text-blue-400">
					<span class="inline-flex leading-5">{data.bookCount} {helpers.basicPlural('book', data.bookCount)}</span>
					{#each data.profiles as profile}
						<img
							class="h-5 w-5 rounded-full inline-flex border-2 border-blue-100 -mr-1.5"
							src="{profile.profile_image_url}/56"
							alt=""
						/>
					{/each}
				</span>
			</div>

			<p class="mt-1 text-sm text-gray-500 dark:text-gray-300">
				These are the available books from all library sources
			</p>
		</div>

		<div class="flex items-center mt-4 gap-x-3">
			<button class="flex items-center justify-center w-1/2 px-5 py-2 text-sm text-gray-700 transition-colors duration-200 bg-white border rounded-lg gap-x-2 sm:w-auto dark:hover:bg-gray-800 dark:bg-gray-900 hover:bg-gray-100 dark:text-gray-200 dark:border-gray-700" >
				<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" >
					<g clip-path="url(#clip0_3098_154395)">
						<path d="M13.3333 13.3332L9.99997 9.9999M9.99997 9.9999L6.66663 13.3332M9.99997 9.9999V17.4999M16.9916 15.3249C17.8044 14.8818 18.4465 14.1806 18.8165 13.3321C19.1866 12.4835 19.2635 11.5359 19.0351 10.6388C18.8068 9.7417 18.2862 8.94616 17.5555 8.37778C16.8248 7.80939 15.9257 7.50052 15 7.4999H13.95C13.6977 6.52427 13.2276 5.61852 12.5749 4.85073C11.9222 4.08295 11.104 3.47311 10.1817 3.06708C9.25943 2.66104 8.25709 2.46937 7.25006 2.50647C6.24304 2.54358 5.25752 2.80849 4.36761 3.28129C3.47771 3.7541 2.70656 4.42249 2.11215 5.23622C1.51774 6.04996 1.11554 6.98785 0.935783 7.9794C0.756025 8.97095 0.803388 9.99035 1.07431 10.961C1.34523 11.9316 1.83267 12.8281 2.49997 13.5832" stroke="currentColor" stroke-width="1.67" stroke-linecap="round" stroke-linejoin="round" />
					</g>
					<defs>
						<clipPath id="clip0_3098_154395">
							<rect width="20" height="20" fill="white" />
						</clipPath>
					</defs>
				</svg>

				<span>Import</span>
			</button>

			<form method="POST" action="/accounts/?/add">
				<button class="flex items-center justify-center w-1/2 px-5 py-2 text-sm tracking-wide text-white transition-colors duration-200 bg-blue-500 rounded-lg shrink-0 sm:w-auto gap-x-2 hover:bg-blue-600 dark:hover:bg-blue-500 dark:bg-blue-600" >
					<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5" >
						<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>

					<span>Add account</span>
				</button>
			</form>
		</div>
	</div>

	<!-- Secondary commands -->
	<div class="mt-6 md:flex md:items-center md:justify-between">
		<div class="inline-flex overflow-hidden bg-white border divide-x rounded-lg dark:bg-gray-900 rtl:flex-row-reverse dark:border-gray-700 dark:divide-gray-700">
			<a href="{groupBySeriesURL}" class="{params.group === 'series' ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-100 dark:hover:bg-gray-800'} px-5 py-2 text-xs sm:text-sm font-medium text-gray-600 transition-colors duration-200 dark:text-gray-300">
				Series
			</a>

			<!-- bg-gray-100 dark:bg-gray-800 -->
			<!-- hover:bg-gray-100 dark:hover:bg-gray-800 -->
			<!-- px-5 py-2 text-xs sm:text-sm font-medium text-gray-600 transition-colors duration-200 dark:text-gray-300 -->

			<a href="{groupByAuthorURL}" class="{params.group === 'author' ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-100 dark:hover:bg-gray-800'} px-5 py-2 text-xs sm:text-sm font-medium text-gray-600 transition-colors duration-200 dark:text-gray-300">
				Author
			</a>

			<a href="{groupByNarratorURL}" class="{params.group === 'narrator' ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-100 dark:hover:bg-gray-800'} px-5 py-2 text-xs sm:text-sm font-medium text-gray-600 transition-colors duration-200 dark:text-gray-300">
				Narrator
			</a>
		</div>

		<SortBy href={groupSortURL} selected={true} direction={params.groupOrder}></SortBy>

		<div class="flex-grow"></div>

		<div class="relative flex items-center mt-4 md:mt-0">
			<span class="absolute">
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mx-3 text-gray-400 dark:text-gray-600">
					<path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
				</svg>
			</span>

			<form method="GET">
				<input type="hidden" name="g" value="{params.group}"/>
				<input type="text" name="s" on:input={submitSearch} bind:this={searchBar} value="{params.search}" placeholder="Search" class="block w-full py-1.5 pr-5 text-gray-700 bg-white border border-gray-200 rounded-lg md:w-80 placeholder-gray-400/70 pl-11 rtl:pr-11 rtl:pl-5 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 dark:focus:border-blue-300 focus:ring-blue-300 focus:outline-none focus:ring focus:ring-opacity-40" />
				<input type="hidden" name="o" value="{table.orderToString(params.order)}"/>
				<input type="hidden" name="go" value="{table.orderToString(params.groupOrder)}"/>
				<input type="hidden" name="c" value="{params.sortCategory}"/>
				<input type="hidden" name="p" value="0"/>
			</form>
		</div>
	</div>

	<!-- Table -->
	{#if data.bookCount !== 0}
	<div class="flex flex-col mt-6">
		<div class="-mx-0 -my-2 sm:-mx-0 lg:-mx-0"> <!-- overflow-x-auto -->
			<div class="inline-block min-w-full max-w-full w-full py-2 align-middle md:px-0 lg:px-0">
				<div class="border overflow-clip border-gray-200 dark:border-gray-700 md:rounded-lg"> <!-- overflow-hidden -->
					<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-100 dark:bg-gray-800 shadow-sm">
							<tr>
								<th scope="col" class="py-3.5 {tableXPaddingLeft} text-sm font-normal text-left rtl:text-right text-gray-500 dark:text-gray-400">
									<SortBy href={titleSortURL} selected={params.sortCategory === 'title'} direction={params.order}>Title</SortBy>
								</th>

								<th scope="col" class="{tableXPadding} py-3.5 w-[1%] hidden md:table-cell text-sm font-normal focus:outline-none select-none rtl:text-right text-gray-500 dark:text-gray-400">
									<SortBy href={orderSortURL} selected={params.sortCategory === 'order'} direction={params.order}>Order</SortBy>
								</th>

								<th scope="col" class="{tableXPadding} py-3.5 hidden lg:table-cell text-sm font-normal text-center rtl:text-right text-gray-500 dark:text-gray-400">
									Genres
								</th>

								<th scope="col" class="{tableXPadding} py-3.5 text-sm font-normal text-left rtl:text-right text-gray-500 dark:text-gray-400">
									About
								</th>

								<th scope="col" class="{tableXPadding} py-3.5 w-[1%] text-sm font-normal text-center rtl:text-right text-gray-500 dark:text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
										{@html icons.ok}
									</svg>
                </th>

								<th scope="col" class="{tableXPadding} py-3.5 w-[1%] text-sm font-normal text-center rtl:text-right text-gray-500 dark:text-gray-400">
                  Accounts
                </th>

								<th scope="col" class="relative py-3.5 {tableXPadding} w-10">
									<span class="sr-only">Edit</span>
								</th>
							</tr>
						</thead>

						{#if data.series !== undefined}
							{#each data.series as series}
								<thead class="bg-gray-50 dark:bg-gray-800 sticky top-[63px]">
									<tr>
										<th title="{series.title}" scope="col" colspan={numCols - 1} class="py-3.5 {tableXPaddingLeft} text-sm text-left rtl:text-right font-medium text-gray-800 dark:text-white">
											{#if series.id !== 'no-series-placeholder'}
												<a href="/library/series/{series.id}">
													{helpers.truncateString(series.title, 100)}
												</a>
											{:else}
												{helpers.truncateString(series.title, 100)}
											{/if}
											<span class="font-normal text-xs text-gray-400 dark:text-gray-500">
												<span title="{series.authors.join(', ')}">{helpers.joinWithLimit(series.authors, 2)}</span> | 
												{series.numBooks} 
												{helpers.basicPlural('Book', series.numBooks)}
												<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 inline-flex pb-0.5">
													<path fill-rule="evenodd" d="M5 10a.75.75 0 01.75-.75h6.638L10.23 7.29a.75.75 0 111.04-1.08l3.5 3.25a.75.75 0 010 1.08l-3.5 3.25a.75.75 0 11-1.04-1.08l2.158-1.96H5.75A.75.75 0 015 10z" clip-rule="evenodd" />
												</svg>

												{new helpers.RunTime({min: series.runTimeMinutes}).toFormat()}
											</span>
										</th>
										<td class="{tableXPadding} py-2 text-sm whitespace-nowrap">
											{#if series.books.every((b) => b.downloaded && b.processed)}
												<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
													{@html icons.ok}
												</svg>
											{:else}
												<button type="button" on:click={() => {console.log(fetch(`/api/library/download/series/${series.id}`))}}>
													<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
														{@html icons.download}
													</svg>
												</button>
											{/if}
										</td>
										<td class="{tableXPadding} py-2 text-sm whitespace-nowrap">
											<div class="flex items-center justify-center">
												{#each series.books.flatMap((b) => b.profiles).filter((e, p, s) => s.findIndex((e2) => e.id === e2.id) === p) as profile}
													<a href="/accounts/{profile.id}" class="object-cover w-6 h-6 -mx-1 border-2 border-white rounded-full overflow-hidden dark:border-gray-700 shrink-0">
														<img src="{profile.profile_image_url}/56" alt="" />
													</a>
												{/each}
											</div>
										</td>
										<td class="{tableXPadding} py-2 text-sm whitespace-nowrap">
											<button class="px-1 py-1 text-gray-500 transition-colors duration-200 rounded-lg dark:text-gray-300 hover:bg-gray-100" >
												<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
													<path stroke-linecap="round" stroke-linejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
												</svg>
											</button>
										</td>

										<!-- <th scope="col" class="px-4 py-3.5 text-sm font-normal text-left rtl:text-right text-gray-500 dark:text-gray-400">
											Status
										</th>

										<th scope="col" class="px-4 py-3.5 text-sm font-normal text-left rtl:text-right text-gray-500 dark:text-gray-400">
											About
										</th>

										<th scope="col" class="px-4 py-3.5 text-sm font-normal text-left rtl:text-right text-gray-500 dark:text-gray-400">
											Users
										</th>

										<th scope="col" class="relative py-3.5 px-4">
											<span class="sr-only">Edit</span>
										</th> -->
									</tr>
								</thead>
								<tbody class="bg-white divide-y divide-gray-200 dark:divide-gray-700 dark:bg-gray-900">
									{#each series.books as book}
										<Book book={book} groupBy={'series'} tableXPadding={tableXPadding} tableXPaddingLeft={tableXPaddingLeft} />
									{/each}
								</tbody>
							{/each}
						{:else if data.authors !== undefined}
							{#each data.authors as author}
								<thead class="bg-gray-50 dark:bg-gray-800 sticky top-[63px]">
									<tr>
										<th title="{author.name}" scope="col" colspan={numCols + 1} class="py-3.5 {tableXPaddingLeft} text-sm text-left rtl:text-right font-medium text-gray-800 dark:text-white">
											{helpers.truncateString(author.name, 100)}
											<span class="font-normal text-xs text-gray-400 dark:text-gray-500">
												<!-- <span title="{series.authors.join(', ')}">{helpers.joinWithLimit(series.authors, 2)}</span> | 
												{series.numBooks} 
												{helpers.basicPlural('Book', series.numBooks)}
												<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 inline-flex pb-0.5">
													<path fill-rule="evenodd" d="M5 10a.75.75 0 01.75-.75h6.638L10.23 7.29a.75.75 0 111.04-1.08l3.5 3.25a.75.75 0 010 1.08l-3.5 3.25a.75.75 0 11-1.04-1.08l2.158-1.96H5.75A.75.75 0 015 10z" clip-rule="evenodd" />
												</svg> -->

												{new helpers.RunTime({min: author.runTimeMinutes}).toFormat()}
											</span>
										</th>
										<td class="{tableXPadding} py-2 text-sm whitespace-nowrap">
											<button class="px-1 py-1 text-gray-500 transition-colors duration-200 rounded-lg dark:text-gray-300 hover:bg-gray-100" >
												<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
													<path stroke-linecap="round" stroke-linejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
												</svg>
											</button>
										</td>
									</tr>
								</thead>
								<tbody class="bg-white divide-y divide-gray-200 dark:divide-gray-700 dark:bg-gray-900">
									{#each author.books as book}
										<Book book={book} groupBy={'author'} subTitle={'series'} tableXPadding={tableXPadding} tableXPaddingLeft={tableXPaddingLeft} />
									{/each}
								</tbody>
							{/each}
						{/if}



            <!-- <thead class="bg-gray-50 dark:bg-gray-800 sticky top-[63px]">
              <tr>
                <th title="No Series" scope="col" class="py-3.5 px-4 text-sm font-normal text-left rtl:text-right text-gray-500 dark:text-gray-400">
                  No Series
                </th>

                <th scope="col" class="px-12 py-3.5 text-sm font-normal text-left rtl:text-right text-gray-500 dark:text-gray-400">
                  Status
                </th>

                <th scope="col" class="px-4 py-3.5 text-sm font-normal text-left rtl:text-right text-gray-500 dark:text-gray-400">
                  About
                </th>

                <th scope="col" class="px-4 py-3.5 text-sm font-normal text-left rtl:text-right text-gray-500 dark:text-gray-400">
                  Users
                </th>

                <th scope="col" class="relative py-3.5 px-4">
                  <span class="sr-only">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200 dark:divide-gray-700 dark:bg-gray-900">
              {#each data.singleBooks as book}
                <tr>
                  <td class="px-4 py-4 text-sm font-medium whitespace-nowrap">
                    <div>
                      <h2 title="{book.title}" class="font-medium text-gray-800 dark:text-white">{helpers.truncateString(book.title, truncateNum)}</h2>
                    </div>
                  </td>
                  <td class="px-12 py-4 text-sm font-medium whitespace-nowrap">
                    <div class="inline px-3 py-1 text-sm font-normal rounded-full text-emerald-500 gap-x-2 bg-emerald-100/60 dark:bg-gray-800">
                      Customer
                    </div>
                  </td>
                  <td class="px-4 py-4 text-sm whitespace-nowrap">
                    <div>
                      <h4 class="text-gray-700 dark:text-gray-200">Content curating app</h4>
                      <p class="text-gray-500 dark:text-gray-400">
                        Brings all your news into one place
                      </p>
                    </div>
                  </td>
                  <td class="px-4 py-4 text-sm whitespace-nowrap">
                    <div class="flex items-center">
                      <img class="object-cover w-6 h-6 -mx-1 border-2 border-white rounded-full dark:border-gray-700 shrink-0" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=256&q=80" alt="" />
                      <img class="object-cover w-6 h-6 -mx-1 border-2 border-white rounded-full dark:border-gray-700 shrink-0" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=256&q=80" alt="" />
                      <img class="object-cover w-6 h-6 -mx-1 border-2 border-white rounded-full dark:border-gray-700 shrink-0" src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1256&q=80" alt="" />
                      <img class="object-cover w-6 h-6 -mx-1 border-2 border-white rounded-full dark:border-gray-700 shrink-0" src="https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=256&q=80" alt="" />
                      <p class="flex items-center justify-center w-6 h-6 -mx-1 text-xs text-blue-600 bg-blue-100 border-2 border-white rounded-full">
                        +4
                      </p>
                    </div>
                  </td>
                  <td class="px-4 py-4 text-sm whitespace-nowrap">
                    <button class="px-1 py-1 text-gray-500 transition-colors duration-200 rounded-lg dark:text-gray-300 hover:bg-gray-100" >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody> -->

					</table>
				</div>
			</div>
		</div>
	</div>
	{:else}
	<div class="flex items-center mt-6 text-center border rounded-lg h-96 dark:border-gray-700">
		<div class="flex flex-col w-full max-w-sm px-4 mx-auto">
			<div class="p-3 mx-auto text-blue-500 bg-blue-100 rounded-full dark:bg-gray-800">
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
					<path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
				</svg>
			</div>
			<h1 class="mt-3 text-lg text-gray-800 dark:text-white">No books found</h1>
			{#if params.search !== ''}
				<p class="mt-2 text-gray-500 dark:text-gray-400">Your search “{params.search}” did not match any books. Please try again.</p>
			{:else}
				<p class="mt-2 text-gray-500 dark:text-gray-400">No books in library. Add another account, or sync your current accounts.</p>
			{/if}
			<div class="flex items-center mt-4 sm:mx-auto gap-x-3">
				<a href="{clearSearchURL}" class="w-1/2 px-5 py-2 text-sm text-gray-700 transition-colors duration-200 bg-white border rounded-lg sm:w-auto dark:hover:bg-gray-800 dark:bg-gray-900 hover:bg-gray-100 dark:text-gray-200 dark:border-gray-700">
						Clear Search
				</a>

				<a href="/accounts" class="flex items-center justify-center w-1/2 px-5 py-2 text-sm tracking-wide text-white transition-colors duration-200 bg-blue-500 rounded-lg shrink-0 sm:w-auto gap-x-2 hover:bg-blue-600 dark:hover:bg-blue-500 dark:bg-blue-600">
					<span>View Accounts</span>
				</a>
			</div>
		</div>
	</div>
	{/if}

	<!-- Nav bar -->
	<div class="mt-6 sm:flex sm:items-center sm:justify-between">
		<div class="text-sm text-gray-500 dark:text-gray-400">
			Page <span class="font-medium text-gray-700 dark:text-gray-100">{(data.page == undefined) ? '?' : data.page + 1} of {data.pages}</span>
		</div>

		<div class="flex items-center mt-4 gap-x-4 sm:mt-0">
			<a href="{previousPageURL}" class="flex items-center justify-center w-1/2 px-5 py-2 text-sm text-gray-700 capitalize transition-colors duration-200 bg-white border rounded-md sm:w-auto gap-x-2 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800">
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 rtl:-scale-x-100">
					<path stroke-linecap="round" stroke-linejoin="round" d="M6.75 15.75L3 12m0 0l3.75-3.75M3 12h18" />
				</svg>

				<span> previous </span>
			</a>

			<a href="{nextPageURL}" class="flex items-center justify-center w-1/2 px-5 py-2 text-sm text-gray-700 capitalize transition-colors duration-200 bg-white border rounded-md sm:w-auto gap-x-2 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800">
				<span> Next </span>

				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 rtl:-scale-x-100">
					<path stroke-linecap="round" stroke-linejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
				</svg>
			</a>
		</div>
	</div>
</Gray>
