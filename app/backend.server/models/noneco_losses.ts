import {dr, Tx} from "~/db.server";
import {nonecoLossesTable, nonecoLosses, categoriesTable} from "~/drizzle/schema";
import {eq,sql,aliasedTable} from "drizzle-orm";


import {CreateResult, DeleteResult, UpdateResult} from "~/backend.server/handlers/form";
import {Errors, hasErrors} from "~/frontend/form";
import {deleteByIdForStringId} from "./common";

export interface NonecoLossesFields extends Omit<nonecoLosses, "id"> {}

// do not change
export function validate(_fields: NonecoLossesFields): Errors<NonecoLossesFields> {
	let errors: Errors<NonecoLossesFields> = {};
	errors.fields = {};

	return errors
}


export async function nonecoLossesCreate(tx: Tx, fields: NonecoLossesFields): Promise<CreateResult<NonecoLossesFields>> {
	let errors = validate(fields);
	if (hasErrors(errors)) {
		return {ok: false, errors};
	}

	const res = await tx.insert(nonecoLossesTable)
		.values({
			disasterRecordId: fields.disasterRecordId,
			categortyId: fields.categortyId,
			description: fields.description,
			updatedAt: sql`NOW()`,
		})
		.returning({id: nonecoLossesTable.id});

	return {ok: true, id: res[0].id};
}

export async function nonecoLossesUpdate(tx: Tx, idStr: string, fields: NonecoLossesFields): Promise<UpdateResult<NonecoLossesFields>> {
	let errors = validate(fields);
	if (hasErrors(errors)) {
		return {ok: false, errors};
	}
	let id = idStr;
	await tx.update(nonecoLossesTable)
		.set({
			disasterRecordId: fields.disasterRecordId,
			categortyId: fields.categortyId,
			description: fields.description,
			updatedAt: sql`NOW()`,
		})
		.where(eq(nonecoLossesTable.id, id));

	return {ok: true};
}

export type NonecoLossesViewModel = Exclude<Awaited<ReturnType<typeof nonecoLossesById>>,
	undefined
>;

export async function nonecoLossesById(idStr: string) {
	let id = idStr;
	const res = await dr.query.nonecoLossesTable.findFirst({
		where: eq(nonecoLossesTable.id, id),
		with: {
			category: true,
		},
	});

	if(!res){
		throw new Error("Id is invalid");
	}
	return res;
}

export async function nonecoLossesDeleteById(idStr: string): Promise<DeleteResult> {
	await deleteByIdForStringId(idStr, nonecoLossesTable)
	return {ok: true}
}

export type PropRecord = {
	id?: string;
	categortyId: number;
	disasterRecordId: string;
	description: string;
	updatedAt?: Date;
	category?: any;
};

export async function nonecoLossesFilderBydisasterRecordsId(idStr: string) {
	let id = idStr;

	const catTable = aliasedTable(categoriesTable, "catTable");

	return await dr.select({
			noneccoId: nonecoLossesTable.id,
			noneccoDesc: nonecoLossesTable.description,
			noneccoCatId: nonecoLossesTable.categortyId,
			catName: catTable.name,
			categoryTreeDisplay: sql`(
				WITH RECURSIVE CategoryCTE AS (
					SELECT id, name, parent_id, name AS full_path
					FROM categories
					WHERE id = ${nonecoLossesTable.categortyId}

					UNION ALL

					SELECT c.id, c.name, c.parent_id, c.name || ' > ' || p.full_path AS full_path
					FROM categories c
					INNER JOIN CategoryCTE p ON c.id = p.parent_id
				)
				SELECT full_path
				FROM CategoryCTE
				WHERE parent_id IS NULL
			)`.as('categoryTreeDisplay'),
		}).from(nonecoLossesTable)
		.leftJoin(catTable, eq(catTable.id, nonecoLossesTable.categortyId))
		.where(eq(nonecoLossesTable.disasterRecordId, id))
		.orderBy(sql`(
			WITH RECURSIVE CategoryCTE AS (
				SELECT id, name, parent_id, name AS full_path
				FROM categories
				WHERE id = ${nonecoLossesTable.categortyId}

				UNION ALL

				SELECT c.id, c.name, c.parent_id, c.name || ' > ' || p.full_path AS full_path
				FROM categories c
				INNER JOIN CategoryCTE p ON c.id = p.parent_id
			)
			SELECT full_path
			FROM CategoryCTE
			WHERE parent_id IS NULL
		)`)
	.execute();
}


		

export async function upsertRecord(record: PropRecord): Promise<void> {
	// Perform the upsert operation
	await dr
		.insert(nonecoLossesTable)
		.values(record)
		.onConflictDoUpdate({
			target: nonecoLossesTable.id,
			set: { 
				categortyId: record.categortyId,
				disasterRecordId: record.disasterRecordId,
				description: record.description,
				updatedAt: sql`NOW()`,
			},
		});
}