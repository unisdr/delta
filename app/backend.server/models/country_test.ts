import { describe, it } from 'node:test';

import assert from 'node:assert';
import {dr} from '~/db.server';
import {getCountries} from "./country"

import {
	country1Table,
} from '~/drizzle/schema';

import { sql } from 'drizzle-orm';

it("getCountries", async () => {

			await dr.execute(sql`TRUNCATE ${country1Table};`);

			await dr.insert(country1Table).values([
		{
				id: 1,
				name: {
						en: "United States",
						fr: "États-Unis",
						es: "Estados Unidos",
				},
		},
		{
				id: 2,
				name: {
						en: "Germany",
						de: "Deutschland",
				},
		},
		{
				id: 3,
				name: {
						en: "Andorra",
				},
		},
		{
				id: 4,
				name: {
						it: "Italia",
				},
		},
	]);

			let res = await getCountries(["fr","en"])

			const expected = [
				{ id: 3, nameLang: "en", name: "Andorra" },
				{ id: 1, nameLang: "fr", name: "États-Unis" },
				{ id: 2, nameLang: "en", name: "Germany" },
				{ id: 4, nameLang: "it", name: "Italia" }
			];

		assert.deepStrictEqual(res, expected);
});

