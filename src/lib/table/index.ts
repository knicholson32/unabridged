// Params
// g : group : Group
// s : search : Search
// o : order : Order
// c : sort category : SortCategory

export type Group = 'series' | 'author' | 'narrator';
export type Search = string | undefined;
export type Order = boolean;
export type SortCategory = 'title' | 'author' | 'order' | 'downloaded';

export type Params = {
	group: Group;
	search: Search;
	order: Order;
	groupOrder: Order;
	sortCategory: SortCategory;
	page: number;
};

export type Change = {
	group?: Group;
	order?: Order;
	groupOrder?: Order;
	sortCategory?: SortCategory;
	page?: number;
	search?: string;
};

export const orderToString = (order: boolean): 'asc' | 'dec' => {
	return order ? 'asc' : 'dec';
};

export const stringToOrder = (str: 'asc' | 'dec'): Order => {
	if (str === 'dec') return false;
	else return true;
};

export const resolve = (url: URL, params?: Params) => {
	if (params === undefined) {
		params = {
			group: 'series',
			order: stringToOrder('asc'),
			groupOrder: stringToOrder('asc'),
			sortCategory: 'order',
			search: url.searchParams.get('s') ?? '',
			page: 0
		};
	}
	// Group By (g, Group)
	switch (url.searchParams.get('g') as Group) {
		case 'author':
			params.group = 'author';
			break;
		case 'narrator':
			params.group = 'narrator';
			break;
		default: // 'series' or unknown
			params.group = 'series';
			break;
	}

	// Order (o, Order)
	switch (url.searchParams.get('o')) {
		case 'dec':
			params.order = stringToOrder('dec');
			break;
		default: // 'asc' or unknown
			params.order = stringToOrder('asc');
			break;
	}

	// Group Order (go, GroupOrder)
	switch (url.searchParams.get('go')) {
		case 'dec':
			params.groupOrder = stringToOrder('dec');
			break;
		default: // 'asc' or unknown
			params.groupOrder = stringToOrder('asc');
			break;
	}

	// Sort Category (c, SortCategory)
	switch (url.searchParams.get('c') as SortCategory) {
		case 'author':
			params.sortCategory = 'author';
			break;
		case 'title':
			params.sortCategory = 'title';
			break;
		case 'downloaded':
			params.sortCategory = 'downloaded';
			break;
		default: // 'order' or unknown
			params.sortCategory = 'order';
			break;
	}

	const inputPageNumber = parseInt(url.searchParams.get('p') ?? 'NaN');
	params.page = isNaN(inputPageNumber) ? params.page : inputPageNumber;

	return params;
};
