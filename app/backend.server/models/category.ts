import { asc, eq, sql, isNull } from 'drizzle-orm';

import {
	categoriesTable
} from '~/drizzle/schema';

import {dr} from '~/db.server';

export type CategoryType = {
	id?: string;
	name: string;
	parentId?: string;
	updatedAt?: Date;
	createdAt?: Date;
	level?: number;
};

export async function getCategories(categoryParent_id: string | null): Promise<{id: string, name: string, parent_id: string | null}[]> {
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

export async function getCategory(categoryId: string): Promise<{id: string, name: string, parent_id?: string | undefined}> {
	let res = await dr
		.select({
			id: categoriesTable.id,
			name: categoriesTable.name,
			parentId: categoriesTable.parentId,
		})
		.from(categoriesTable)
		.where(eq(categoriesTable.id, categoryId))
		.limit(1)
		.then(res => res[0]);

	return res;
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
				level: record.level,
				updatedAt: sql`NOW()`,
			},
		});
}
