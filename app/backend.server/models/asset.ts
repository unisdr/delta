import { dr, Tx } from "~/db.server";
import { assetTable, InsertAsset } from "~/drizzle/schema";
import { eq, sql, inArray, and, or, asc } from "drizzle-orm";
import {
	CreateResult,
	DeleteResult,
	UpdateResult,
} from "~/backend.server/handlers/form/form";
import { Errors, FormInputDef, hasErrors } from "~/frontend/form";
import { deleteByIdForStringId } from "./common";

export interface AssetFields extends Omit<InsertAsset, "id"> {}

export async function fieldsDef(): Promise<FormInputDef<AssetFields>[]> {
	return [
		{
			key: "sectorIds",
			label: "Sector",
			type: "other",
		},
		{ key: "name", label: "Name", type: "text", required: true },
		{ key: "category", label: "Category", type: "text" },
		{ key: "nationalId", label: "National ID", type: "text" },
		{ key: "notes", label: "Notes", type: "textarea" },
	];
}

export async function fieldsDefApi(): Promise<FormInputDef<AssetFields>[]> {
	return [
		...(await fieldsDef()),
		{ key: "apiImportId", label: "", type: "other" },
	];
}

export async function fieldsDefView(): Promise<FormInputDef<AssetFields>[]> {
	return [...(await fieldsDef())];
}

export function validate(_fields: Partial<AssetFields>): Errors<AssetFields> {
	let errors: Errors<AssetFields> = {};
	errors.fields = {};
	return errors;
}

export async function assetCreate(
	tx: Tx,
	fields: AssetFields
): Promise<CreateResult<AssetFields>> {
	let errors = validate(fields);

	if (hasErrors(errors)) {
		return { ok: false, errors };
	}

	fields.isBuiltIn = false;

	let res = await tx
		.insert(assetTable)
		.values({
			...fields,
		})
		.returning({ id: assetTable.id });

	return { ok: true, id: res[0].id };
}

export async function assetUpdate(
	tx: Tx,
	idStr: string,
	fields: Partial<AssetFields>
): Promise<UpdateResult<AssetFields>> {
	let errors = validate(fields);

	if (hasErrors(errors)) {
		return { ok: false, errors };
	}

	let id = idStr;

	let res = await tx.query.assetTable.findFirst({
		where: eq(assetTable.id, id),
	});
	if (!res) {
		throw new Error(`Id is invalid: ${id}`);
	}

	if (res.isBuiltIn) {
		throw new Error("Attempted to modify builtin asset");
	}

	await tx
		.update(assetTable)
		.set({
			...fields,
		})
		.where(eq(assetTable.id, id));

	return { ok: true };
}
export async function assetUpdateByIdAndCountryAccountsId(
	tx: Tx,
	id: string,
	countryAccountsId: string,
	fields: Partial<AssetFields>
): Promise<UpdateResult<AssetFields>> {
	let errors = validate(fields);

	if (hasErrors(errors)) {
		return { ok: false, errors };
	}

	let res = await tx.query.assetTable.findFirst({
		where: and(
			eq(assetTable.id, id),
			eq(assetTable.countryAccountsId, countryAccountsId)
		),
	});
	if (!res) {
		throw new Error(`Id is invalid: ${id}`);
	}

	if (res.isBuiltIn) {
		throw new Error("Attempted to modify builtin asset");
	}

	await tx
		.update(assetTable)
		.set({
			...fields,
		})
		.where(eq(assetTable.id, id));

	return { ok: true };
}

export type AssetViewModel = Exclude<
	Awaited<ReturnType<typeof assetById>>,
	undefined
>;

export async function assetIdByImportId(tx: Tx, importId: string) {
	let res = await tx
		.select({
			id: assetTable.id,
		})
		.from(assetTable)
		.where(eq(assetTable.apiImportId, importId));

	if (res.length == 0) {
		return null;
	}

	return String(res[0].id);
}
export async function assetIdByImportIdAndCountryAccountsId(
	tx: Tx,
	importId: string,
	countryAccountsId: string
) {
	let res = await tx
		.select({
			id: assetTable.id,
		})
		.from(assetTable)
		.where(
			and(
				eq(assetTable.apiImportId, importId),
				eq(assetTable.countryAccountsId, countryAccountsId)
			)
		);

	if (res.length == 0) {
		return null;
	}

	return String(res[0].id);
}

export async function assetById(idStr: string) {
	return assetByIdTx(dr, idStr);
}

export async function assetByName(nameStr: string) {
	let res = await dr.query.assetTable.findFirst({
		where: eq(sql`LOWER(${assetTable.name})`, nameStr.toLowerCase()),
	});

	return res;
}

export async function assetByIdTx(tx: Tx, idStr: string) {
	let id = idStr;
	let res = await tx.query.assetTable.findFirst({
		where: eq(assetTable.id, id),
	});

	if (!res) {
		throw new Error("Id is invalid");
	}

	return res;
}

export async function assetDeleteById(
	idStr: string,
	countryAccountsId: string
): Promise<DeleteResult> {
	let id = idStr;
	let res = await dr.query.assetTable.findFirst({
		where: and(
			eq(assetTable.id, id),
			eq(assetTable.countryAccountsId, countryAccountsId)
		),
	});
	if (!res) {
		throw new Error("Id is invalid");
	}
	if (res.isBuiltIn) {
		throw new Error("Attempted to delete builtin asset");
	}
	await deleteByIdForStringId(id, assetTable);
	return { ok: true };
}

export async function assetsForSector(
	tx: Tx,
	sectorId: string,
	countryAccountsId?: string
) {
	// Build sector lineage (selected sector + its ancestors)
	const res1 = await tx.execute(sql`
		WITH RECURSIVE sector_rec AS (
			SELECT id, parent_id
			FROM sector
			WHERE id = ${sectorId}
			UNION ALL
			SELECT s.id, s.parent_id
			FROM sector s
			JOIN sector_rec rec ON rec.parent_id = s.id
		)
		SELECT a.id
		FROM asset a
		WHERE EXISTS (
			SELECT 1
			FROM sector_rec s
			WHERE s.id::text = ANY(string_to_array(a.sector_ids, ','))
		)
	`);

	// if we switch to using array
	// WHERE s.id = ANY(a.sector_ids)
	const assetIds = res1.rows.map((r) => r.id as string);

	// Base predicate: restrict to sector lineage
	const basePredicate = inArray(assetTable.id, assetIds);

	// Optional tenant filter: instance-owned OR built-in
	const tenantPredicate = countryAccountsId
		? or(
				eq(assetTable.countryAccountsId, countryAccountsId),
				eq(assetTable.isBuiltIn, true)
		  )
		: undefined;

	const res = await tx.query.assetTable.findMany({
		where: tenantPredicate
			? and(basePredicate, tenantPredicate)
			: basePredicate,
		orderBy: [asc(assetTable.name)],
	});
	return res;
}

export async function upsertRecord(record: InsertAsset): Promise<void> {
	// Perform the upsert operation
	if (record.id && record.id !== "" && record.id !== "undefined") {
		await dr
			.insert(assetTable)
			.values(record)
			.onConflictDoUpdate({
				target: assetTable.apiImportId,
				set: {
					id: record.id,
					name: record.name,
					sectorIds: record.sectorIds,
					isBuiltIn: record.isBuiltIn,
					nationalId: record.nationalId,
					notes: record.notes,
					category: record.category,
				},
			});
	} else {
		await dr
			.insert(assetTable)
			.values(record)
			.onConflictDoUpdate({
				target: assetTable.apiImportId,
				set: {
					name: record.name,
					sectorIds: record.sectorIds,
					isBuiltIn: record.isBuiltIn,
					nationalId: record.nationalId,
					notes: record.notes,
					category: record.category,
				},
			});
	}
}
