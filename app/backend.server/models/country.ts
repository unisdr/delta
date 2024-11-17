import { SQL, asc } from 'drizzle-orm';

import { selectTranslated } from './common';

import {
	country1Table,
} from '~/drizzle/schema';

import {dr} from '~/db.server';

export async function getCountries(langs: string[]) {
	let tr = selectTranslated(country1Table.name, "name", langs)
	let select: {
		id: typeof country1Table.id
		name: SQL<string>
		nameLang: SQL<string>
	} = {
	id: country1Table.id,
	name: tr.name,
	nameLang: tr.nameLang
};
	const res = await dr
		.select(select)
		.from(country1Table)
		.orderBy(asc(tr.name));

	return res;
}


