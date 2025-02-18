import {dr, Tx} from "~/db.server";
import {
	sectorDisasterRecordsRelationTable, 
	SectorDisasterRecordsRelation as disRecSectorsType,
	sectorTable
} from "~/drizzle/schema";
import {eq,sql,and,aliasedTable} from "drizzle-orm";

import {CreateResult, DeleteResult, UpdateResult} from "~/backend.server/handlers/form";
import {Errors, hasErrors} from "~/frontend/form";
import {deleteByIdForStringId} from "./common";

export interface DisRecSectorsFields extends Omit<disRecSectorsType, "id"> {}

// do not change
export function validate(_fields: DisRecSectorsFields): Errors<DisRecSectorsFields> {
	let errors: Errors<DisRecSectorsFields> = {};
	errors.fields = {};

	return errors
}


export async function disRecSectorsCreate(tx: Tx, fields: DisRecSectorsFields): Promise<CreateResult<DisRecSectorsFields>> {
	let errors = validate(fields);
	if (hasErrors(errors)) {
		return {ok: false, errors};
	}

	const res = await tx.insert(sectorDisasterRecordsRelationTable)
		.values({
			sectorId: fields.sectorId,
			disasterRecordId: fields.disasterRecordId,
			withDamage: fields.withDamage,
			withDisruption: fields.withDisruption,
			withLosses: fields.withLosses,
		})
		.returning({id: sectorDisasterRecordsRelationTable.id});

	return {ok: true, id: res[0].id};
}

export async function disRecSectorsUpdate(tx: Tx, idStr: string, fields: DisRecSectorsFields): Promise<UpdateResult<DisRecSectorsFields>> {
	let errors = validate(fields);
	if (hasErrors(errors)) {
		return {ok: false, errors};
	}
	let id = idStr;
	await tx.update(sectorDisasterRecordsRelationTable)
		.set({
			sectorId: fields.sectorId,
			disasterRecordId: fields.disasterRecordId,
			withDamage: fields.withDamage,
			withDisruption: fields.withDisruption,
			withLosses: fields.withLosses,
		})
		.where(eq(sectorDisasterRecordsRelationTable.id, id));

	return {ok: true};
}

export async function filterByDisasterRecordId_SectorId(idDisterRecordStr: string, idSector: number) {
	return filterByDisasterRecordId_SectorIdTx(dr, idDisterRecordStr, idSector);
}

export async function filterByDisasterRecordId_SectorIdTx(tx: Tx, idDisterRecordStr: string, idSector: number) {
	let idDisterRecord = idDisterRecordStr;
	let res= await tx.query.sectorDisasterRecordsRelationTable.findMany({
		where: and(
			eq(sectorDisasterRecordsRelationTable.disasterRecordId, idDisterRecord),
			eq(sectorDisasterRecordsRelationTable.sectorId, idSector),
		)
	});

	return res;
}

export async function deleteRecordsDeleteById(idStr: string): Promise<DeleteResult> {
	await deleteByIdForStringId(idStr, sectorDisasterRecordsRelationTable)
	return {ok: true}
}


export type DisRecSectorsViewModel = Exclude<Awaited<ReturnType<typeof disRecSectorsById>>,
	undefined
>;

export async function disRecSectorsById(id: string) {
	return disRecSectorsByIdTx(dr, id);
}

export async function disRecSectorsByIdTx(tx: Tx, id: string) {
	let res= await tx.query.sectorDisasterRecordsRelationTable.findFirst({
		where: eq(sectorDisasterRecordsRelationTable.id, id),
	});
	if(!res){
		throw new Error("Id is invalid");
	}
	return res;
}


export async function disRecSectorsDeleteById(idStr: string): Promise<DeleteResult> {
	await deleteByIdForStringId(idStr, sectorDisasterRecordsRelationTable)
	return {ok: true}
}

export async function sectorsFilderBydisasterRecordsId(idStr: string) {
	let id = idStr;

	const catTable = aliasedTable(sectorTable, "catTable");

	return await dr.select({
			disRecSectorsId: sectorDisasterRecordsRelationTable.id,
			disRecSectorsWithDamage: sectorDisasterRecordsRelationTable.withDamage,
			disRecSectorsDamageRecoveryCost: sectorDisasterRecordsRelationTable.damageRecoveryCost,
			disRecSectorsDamageRecoveryCostCurrency: sectorDisasterRecordsRelationTable.damageRecoveryCostCurrency,
			disRecSectorsWithDisruption: sectorDisasterRecordsRelationTable.withDisruption,
			disRecSectorsWithLosses: sectorDisasterRecordsRelationTable.withLosses,
			disRecSectorsdisasterRecordId: sectorDisasterRecordsRelationTable.disasterRecordId,
			disRecSectorsSectorId: sectorDisasterRecordsRelationTable.sectorId,
			catName: catTable.sectorname,
			sectorTreeDisplay: sql`(
				WITH RECURSIVE ParentCTE AS (
					SELECT id, sectorname, parent_id, sectorname AS full_path
					FROM sector
					WHERE id = ${sectorDisasterRecordsRelationTable.sectorId}

					UNION ALL

					SELECT t.id, t.sectorname, t.parent_id, t.sectorname || ' > ' || p.full_path AS full_path
					FROM sector t
					INNER JOIN ParentCTE p ON t.id = p.parent_id
				)
				SELECT full_path
				FROM ParentCTE
				WHERE parent_id IS NULL
			)`.as('sectorTreeDisplay'),
		}).from(sectorDisasterRecordsRelationTable)
		.leftJoin(catTable, eq(catTable.id, sectorDisasterRecordsRelationTable.sectorId))
		.where(eq(sectorDisasterRecordsRelationTable.disasterRecordId, id))
		.orderBy(sql`(
				WITH RECURSIVE ParentCTE AS (
					SELECT id, sectorname, parent_id, sectorname AS full_path
					FROM sector
					WHERE id = ${sectorDisasterRecordsRelationTable.sectorId}

					UNION ALL

					SELECT t.id, t.sectorname, t.parent_id, t.sectorname || ' > ' || p.full_path AS full_path
					FROM sector t
					INNER JOIN ParentCTE p ON t.id = p.parent_id
				)
				SELECT full_path
				FROM ParentCTE
				WHERE parent_id IS NULL
			)`)
	.execute();
}

export async function sectorTreeDisplayText(sectorId: number) {
	let res1 = await dr.execute(sql`
		WITH RECURSIVE ParentCTE AS (
			SELECT id, sectorname, parent_id, sectorname AS full_path
			FROM sector
			WHERE id = ${sectorId}

			UNION ALL

			SELECT t.id, t.sectorname, t.parent_id, t.sectorname || ' > ' || p.full_path AS full_path
			FROM sector t
			INNER JOIN ParentCTE p ON t.id = p.parent_id
		)
		SELECT full_path
		FROM ParentCTE
		WHERE parent_id IS NULL;
	`)
	let sectorDisplay = res1.rows.map(r => r.full_path as string);
	
	return sectorDisplay;
}

	

export async function upsertRecord(record: DisRecSectorsFields): Promise<void> {
	// Perform the upsert operation
	await dr
		.insert(sectorDisasterRecordsRelationTable)
		.values(record)
		.onConflictDoUpdate({
			target: sectorDisasterRecordsRelationTable.id,
			set: { 
				sectorId: record.sectorId,
				disasterRecordId: record.disasterRecordId,
				withDamage: record.withDamage,
				withDisruption: record.withDisruption,
				withLosses: record.withLosses,
				damageRecoveryCost: record.damageRecoveryCost,
				damageRecoveryCostCurrency: record.damageRecoveryCostCurrency,
			},
		});
}