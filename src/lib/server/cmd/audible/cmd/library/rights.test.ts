// Reading rights from the library API. Items are trimmed copies of real responses (2026-11-22).

import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server/prisma', () => ({ default: {} }));
const { parseRights } = await import('./rights');

const rights = (o: Partial<Record<string, unknown>>) => ({
	is_book_qa_eligible: false,
	is_consumable: false,
	is_consumable_indefinitely: false,
	is_consumable_offline: false,
	is_consumable_until: null,
	is_recap_eligible: false,
	...o
});

describe('parseRights', () => {
	it('reads bought, borrowed and ended titles', () => {
		const page = {
			items: [
				// Bought
				{
					asin: 'B0BOUGHT01',
					is_ayce: false,
					customer_rights: rights({
						is_consumable: true,
						is_consumable_offline: true,
						is_consumable_indefinitely: true
					})
				},
				// Catalog title while access lasts (Audible gives 2099-12-31, not a real end date)
				{
					asin: 'B0F1WL5YJH',
					is_ayce: true,
					benefit_id: 'AYCL',
					customer_rights: rights({
						is_consumable: true,
						is_consumable_offline: true,
						is_consumable_until: '2099-12-31T12:00:00Z'
					})
				},
				// Catalog title after access ended ("Call to Arms is not downloadable.")
				{ asin: 'B01AGMIFIU', is_ayce: true, benefit_id: 'AYCL', customer_rights: rights({}) },
				// Old periodical, never borrowed
				{ asin: 'B002V9ZD4G', is_ayce: false, customer_rights: rights({}) },
				// No rights in the response: left out, so its stored rights are kept
				{ asin: 'B0NORIGHTS', is_ayce: false, customer_rights: null }
			],
			response_groups: ['customer_rights', 'always-returned']
		};
		expect(parseRights(page)).toEqual([
			{ asin: 'B0BOUGHT01', downloadable: true, borrowed: false },
			{ asin: 'B0F1WL5YJH', downloadable: true, borrowed: true },
			{ asin: 'B01AGMIFIU', downloadable: false, borrowed: true },
			{ asin: 'B002V9ZD4G', downloadable: false, borrowed: false }
		]);
	});
	it('returns nothing for a response it does not understand', () => {
		expect(parseRights(null)).toEqual([]);
		expect(parseRights({ message: 'Forbidden' })).toEqual([]);
		expect(parseRights({ items: [{ customer_rights: rights({}) }] })).toEqual([]);
	});
});
