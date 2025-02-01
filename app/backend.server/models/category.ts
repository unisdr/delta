import { SQL, asc, eq, sql, ne, isNull } from 'drizzle-orm';

import {
	categoriesTable, categoriesType
} from '~/drizzle/schema';

import {dr} from '~/db.server';

export type CategoryType = {
	id?: number;
	name: string;
	parentId?: number;
	updatedAt?: Date;
	createdAt?: Date;
};

export async function getCategories(categoryParent_id: number | null): Promise<{id: number, name: string, parent_id: number | null}[]> {
	let select: {
		id: typeof categoriesTable.id,
		name: typeof categoriesTable.name,
		parent_id: typeof categoriesTable.parentId
	} = {
		id: categoriesTable.id,
		name: categoriesTable.name,
		parent_id: categoriesTable.parentId
	};

	if (categoryParent_id) {
		let res = await dr
			.select(select)
			.from(categoriesTable)
			.where(eq(categoriesTable.parentId, categoryParent_id))
			.orderBy(asc(categoriesTable.name));

		return res;
	}
	else {
		let res = await dr
			.select(select)
			.from(categoriesTable)
			.where(isNull(categoriesTable.parentId))
			.orderBy(asc(categoriesTable.name));

		return res;
	}
}


export async function upsertRecord(record: CategoryType): Promise<void> {
	// Perform the upsert operation
	await dr
		.insert(categoriesTable)
		.values(record)
		.onConflictDoUpdate({
			target: categoriesTable.id,
			set: { 
				id: record.id,
				name: record.name,
				parentId: record.parentId,
				updatedAt: sql`NOW()`,
			},
		});
}