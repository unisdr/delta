import {dr, Tx} from "~/db.server";
import {assetTable, AssetInsert} from "~/drizzle/schema";
import {eq} from "drizzle-orm";
import {CreateResult, DeleteResult, UpdateResult} from "~/backend.server/handlers/form";
import {Errors, FormInputDef, hasErrors} from "~/frontend/form";
import {deleteByIdForStringId} from "./common";
import {allMeasures} from "./measure";
import {allSectors} from "./sector";
import {measureLabel} from "~/frontend/measure";


export interface AssetFields extends Omit<AssetInsert, "id"> {}

export async function fieldsDef(): Promise<FormInputDef<AssetFields>[]> {
	let sectors = await allSectors(dr)
	let measures = await allMeasures(dr)
	return [
		{
			key: "sectorId",
			label: "Sector",
			type: "enum",
			enumData: sectors.map(s => {
				return {
					key: String(s.id),
					label: s.sectorname
				}
			})
		},
		{key: "name", label: "Name", type: "text", required: true},
		{
			key: "measureId",
			label: "Measure",
			type: "enum",
			enumData: measures.map(m => {
				return {
					key: m.id,
					label: measureLabel(m)
				}
			})
		},
		{key: "nationalId", label: "National ID", type: "text"},
		{key: "notes", label: "Notes", type: "textarea"},
	]
}

export async function fieldsDefApi(): Promise<FormInputDef<AssetFields>[]> {
	return [
		...await fieldsDef(),
		{key: "apiImportId", label: "", type: "other"},
	]
}

export async function fieldsDefView(): Promise<FormInputDef<AssetFields>[]> {
	return [
		...await fieldsDef(),
	]
}

export function validate(_fields: Partial<AssetFields>): Errors<AssetFields> {
	let errors: Errors<AssetFields> = {}
	errors.fields = {}
	return errors
}

export async function assetCreate(
	tx: Tx,
	fields: AssetFields
): Promise<CreateResult<AssetFields>> {
	let errors = validate(fields)

	if (hasErrors(errors)) {
		return {ok: false, errors}
	}

	let res = await tx.insert(assetTable)
		.values({
			...fields,
		})
		.returning({id: assetTable.id})

	return {ok: true, id: res[0].id}
}

export async function assetUpdate(
	tx: Tx,
	idStr: string,
	fields: Partial<AssetFields>
): Promise<UpdateResult<AssetFields>> {
	let errors = validate(fields)

	if (hasErrors(errors)) {
		return {ok: false, errors}
	}

	let id = idStr

	await tx.update(assetTable)
		.set({
			...fields,
		})
		.where(eq(assetTable.id, id))

	return {ok: true}
}

export type AssetViewModel = Exclude<
	Awaited<ReturnType<typeof assetById>>,
	undefined
>

export async function assetIdByImportId(tx: Tx, importId: string) {
	let res = await tx.select({
		id: assetTable.id,
	}).from(assetTable).where(eq(
		assetTable.apiImportId, importId
	))

	if (res.length == 0) {
		return null
	}

	return String(res[0].id)
}

export async function assetById(idStr: string) {
	return assetByIdTx(dr, idStr)
}

export async function assetByIdTx(tx: Tx, idStr: string) {
	let id = idStr
	let res = await tx.query.assetTable.findFirst({
		where: eq(assetTable.id, id),
	})

	if (!res) {
		throw new Error("Id is invalid")
	}

	return res
}

export async function assetDeleteById(idStr: string): Promise<DeleteResult> {
	await deleteByIdForStringId(idStr, assetTable)
	return {ok: true}
}

export async function assetsForSector(tx: Tx, sectorId: number) {
	let res = await tx.query.assetTable.findMany({
		where: eq(assetTable.sectorId, sectorId),
		with: {
			measure: true
		}
	})
	return res
}
