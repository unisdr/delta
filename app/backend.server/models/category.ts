import { asc, eq, sql, isNull } from 'drizzle-orm';

import {
	categoriesTable
} from '~/drizzle/schema';

import {dr} from '~/db.server';

export type CategoryType = {
	id?: number;
	name: string;
	parentId?: number;
	updatedAt?: Date;
	createdAt?: Date;
	level?: number;
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

export async function getCategory(categoryId: number): Promise<{id: number, name: string, parent_id?: number | undefined}> {
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

		console.log('cat: '+res);

	return res;

	// return await dr.select({
	// 		noneccoId: nonecoLossesTable.id,
	// 		noneccoDesc: nonecoLossesTable.description,
	// 		noneccoCatId: nonecoLossesTable.categortyId,
	// 		catName: catTable.name,
	// 		catNameParent1: catTableParent1.name,
	// 		catNameParent2: catTableParent2.name,
	// 	}).from(nonecoLossesTable)
	// 	.leftJoin(catTable, eq(catTable.id, nonecoLossesTable.categortyId))
	// 	.leftJoin(catTableParent1, eq(catTableParent1.id, catTable.parentId))
	// 	.leftJoin(catTableParent2, eq(catTableParent2.id, catTableParent1.parentId))
	// 	.where(eq(nonecoLossesTable.disasterRecordId, id))
	// .execute();
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
