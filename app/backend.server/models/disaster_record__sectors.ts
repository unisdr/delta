import { dr, Tx } from "~/db.server";
import {
	sectorDisasterRecordsRelationTable,
	SectorDisasterRecordsRelation as disRecSectorsType,
	sectorTable,
} from "~/drizzle/schema";
import { eq, sql, and, aliasedTable } from "drizzle-orm";

import {
	CreateResult,
	DeleteResult,
	UpdateResult,
} from "~/backend.server/handlers/form/form";
import { Errors, FormInputDef, hasErrors } from "~/frontend/form";
import { deleteByIdForStringId } from "./common";
import { updateTotalsUsingDisasterRecordId } from "./analytics/disaster-events-cost-calculator";
import { getDisasterRecordsByIdAndCountryAccountsId } from "~/db/queries/disasterRecords";

export interface DisRecSectorsFields extends Omit<disRecSectorsType, "id"> {}

export const fieldsDefCommon = [
	{ key: "sectorId", label: "Sector", type: "text", required: true },
	{
		key: "disasterRecordId",
		label: "Disaster Record",
		type: "text",
		required: true,
	},
	{ key: "withDamage", label: "With Damage", type: "bool" },
	{ key: "damageCost", label: "Damage Cost", type: "money" },
	{ key: "damageCostCurrency", label: "Damage Cost Currency", type: "text" },
	{ key: "damageRecoveryCost", label: "Damage Recovery Cost", type: "money" },
	{
		key: "damageRecoveryCostCurrency",
		label: "Damage Recovery Cost Currency",
		type: "text",
	},
	{ key: "withDisruption", label: "With Disruption", type: "bool" },
	{ key: "withLosses", label: "With Losses", type: "bool" },
	{ key: "lossesCost", label: "Losses Cost", type: "money" },
	{ key: "lossesCostCurrency", label: "Losses Cost Currency", type: "text" },
] as const;

/*
export const fieldsDef: FormInputDef<DisRecSectorsFields>[] = [
	...fieldsDefCommon
];*/

export const fieldsDefApi: FormInputDef<DisRecSectorsFields>[] = [
	...fieldsDefCommon,
	{ key: "apiImportId", label: "", type: "other" },
];

// do not change
export function validate(
	_fields: Partial<DisRecSectorsFields>
): Errors<DisRecSectorsFields> {
	let errors: Errors<DisRecSectorsFields> = {};
	errors.fields = {};

	return errors;
}

export async function disRecSectorsCreate(
	tx: Tx,
	fields: DisRecSectorsFields
): Promise<CreateResult<DisRecSectorsFields>> {
	let errors = validate(fields);
	if (hasErrors(errors)) {
		return { ok: false, errors };
	}

	const res = await tx
		.insert(sectorDisasterRecordsRelationTable)
		.values({
			...fields,
		})
		.returning({ id: sectorDisasterRecordsRelationTable.id });

	await updateTotalsUsingDisasterRecordId(tx, fields.disasterRecordId);

	return { ok: true, id: res[0].id };
}

export async function disRecSectorsUpdate(
	tx: Tx,
	idStr: string,
	fields: Partial<DisRecSectorsFields>
): Promise<UpdateResult<DisRecSectorsFields>> {
	let errors = validate(fields);
	if (hasErrors(errors)) {
		return { ok: false, errors };
	}
	let id = idStr;
	await tx
		.update(sectorDisasterRecordsRelationTable)
		.set({
			...fields,
		})
		.where(eq(sectorDisasterRecordsRelationTable.id, id));

	let recordId = await getRecordId(tx, idStr);
	await updateTotalsUsingDisasterRecordId(tx, recordId);

	return { ok: true };
}

export async function disRecSectorsUpdateByIdAndCountryAccountsId(
	tx: Tx,
	id: string,
	countryAccountsId: string,
	fields: Partial<DisRecSectorsFields>
): Promise<UpdateResult<DisRecSectorsFields>> {
	let errors = validate(fields);
	if (hasErrors(errors)) {
		return { ok: false, errors };
	}
	let recordId = await getRecordId(tx, id);
	const disasterRecords = getDisasterRecordsByIdAndCountryAccountsId(
		recordId,
		countryAccountsId
	);
	if (!disasterRecords) {
		return {
			ok: false,
			errors: {
				general: ["No matching disaster record found or you don't have access"],
			},
		};
	}

	await tx
		.update(sectorDisasterRecordsRelationTable)
		.set({
			...fields,
		})
		.where(eq(sectorDisasterRecordsRelationTable.id, id));

	await updateTotalsUsingDisasterRecordId(tx, recordId);

	return { ok: true };
}

export async function getRecordId(tx: Tx, id: string) {
	let rows = await tx
		.select({
			recordId: sectorDisasterRecordsRelationTable.disasterRecordId,
		})
		.from(sectorDisasterRecordsRelationTable)
		.where(eq(sectorDisasterRecordsRelationTable.id, id))
		.execute();
	if (!rows.length) throw new Error("not found by id");
	return rows[0].recordId;
}

export async function filterByDisasterRecordId_SectorId(
	idDisterRecordStr: string,
	idSector: string
) {
	return filterByDisasterRecordId_SectorIdTx(dr, idDisterRecordStr, idSector);
}

export async function filterByDisasterRecordId_SectorIdTx(
	tx: Tx,
	idDisterRecordStr: string,
	idSector: string
) {
	let idDisterRecord = idDisterRecordStr;
	let res = await tx.query.sectorDisasterRecordsRelationTable.findMany({
		where: and(
			eq(sectorDisasterRecordsRelationTable.disasterRecordId, idDisterRecord),
			eq(sectorDisasterRecordsRelationTable.sectorId, idSector)
		),
	});

	return res;
}

export async function deleteRecordsDeleteById(
	idStr: string
): Promise<DeleteResult> {
	await deleteByIdForStringId(idStr, sectorDisasterRecordsRelationTable);
	return { ok: true };
}

export type DisRecSectorsViewModel = Exclude<
	Awaited<ReturnType<typeof disRecSectorsById>>,
	undefined
>;

export async function disRecSectorsIdByImportId(tx: Tx, importId: string) {
	const res = await tx
		.select({
			id: sectorDisasterRecordsRelationTable.id,
		})
		.from(sectorDisasterRecordsRelationTable)
		.where(eq(sectorDisasterRecordsRelationTable.apiImportId, importId));
	if (res.length == 0) {
		return null;
	}
	return String(res[0].id);
}

export async function disRecSectorsById(id: string) {
	return disRecSectorsByIdTx(dr, id);
}

export async function disRecSectorsByIdTx(tx: Tx, id: string) {
	let res = await tx.query.sectorDisasterRecordsRelationTable.findFirst({
		where: eq(sectorDisasterRecordsRelationTable.id, id),
	});
	if (!res) {
		throw new Error("Id is invalid");
	}
	return res;
}

export async function disRecSectorsDeleteById(
	idStr: string
): Promise<DeleteResult> {
	await deleteByIdForStringId(idStr, sectorDisasterRecordsRelationTable);
	return { ok: true };
}

export async function sectorsFilderBydisasterRecordsId(idStr: string) {
	let id = idStr;

	const catTable = aliasedTable(sectorTable, "catTable");

	return await dr
		.select({
			disRecSectorsId: sectorDisasterRecordsRelationTable.id,
			disRecSectorsWithDamage: sectorDisasterRecordsRelationTable.withDamage,
			disRecSectorsDamageCost: sectorDisasterRecordsRelationTable.damageCost,
			disRecSectorsDamageCostCurrency:
				sectorDisasterRecordsRelationTable.damageCostCurrency,
			disRecSectorsDamageRecoveryCost:
				sectorDisasterRecordsRelationTable.damageRecoveryCost,
			disRecSectorsDamageRecoveryCostCurrency:
				sectorDisasterRecordsRelationTable.damageRecoveryCostCurrency,
			disRecSectorsWithDisruption:
				sectorDisasterRecordsRelationTable.withDisruption,
			disRecSectorsWithLosses: sectorDisasterRecordsRelationTable.withLosses,
			disRecSectorsLossesCost: sectorDisasterRecordsRelationTable.lossesCost,
			disRecSectorsLossesCostCurrency:
				sectorDisasterRecordsRelationTable.lossesCostCurrency,
			disRecSectorsdisasterRecordId:
				sectorDisasterRecordsRelationTable.disasterRecordId,
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
			)`.as("sectorTreeDisplay"),
		})
		.from(sectorDisasterRecordsRelationTable)
		.leftJoin(
			catTable,
			eq(catTable.id, sectorDisasterRecordsRelationTable.sectorId)
		)
		.where(eq(sectorDisasterRecordsRelationTable.disasterRecordId, id))
		.orderBy(
			sql`(
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
			)`
		)
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
	`);
	let sectorDisplay = res1.rows.map((r) => r.full_path as string);

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
				damageCost: record.damageCost,
				damageCostCurrency: record.damageCostCurrency,
				damageRecoveryCost: record.damageRecoveryCost,
				damageRecoveryCostCurrency: record.damageRecoveryCostCurrency,
				withDisruption: record.withDisruption,
				withLosses: record.withLosses,
				lossesCost: record.lossesCost,
				lossesCostCurrency: record.lossesCostCurrency,
			},
		});

	await updateTotalsUsingDisasterRecordId(dr, record.disasterRecordId);
}
