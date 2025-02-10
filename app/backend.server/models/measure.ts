import {dr, Tx} from "~/db.server";
import {measureTable, MeasureInsert} from "~/drizzle/schema";
import {eq} from "drizzle-orm";

import {CreateResult, DeleteResult, UpdateResult} from "~/backend.server/handlers/form";
import {Errors, FormInputDef, hasErrors} from "~/frontend/form";
import {deleteByIdForStringId} from "./common";

export interface MeasureFields extends Omit<MeasureInsert, "id"> {}

export const fieldsDef: FormInputDef<MeasureFields>[] = [
	{key: "name", label: "Name", type: "text", required: true},
	{key: "unit", label: "Unit", type: "text", required: true}
];

export const fieldsDefApi: FormInputDef<MeasureFields>[] = [
	...fieldsDef,
	{key: "apiImportId", label: "", type: "other"},
];

export const fieldsDefView: FormInputDef<MeasureFields>[] = [...fieldsDef];

export function validate(_fields: Partial<MeasureFields>): Errors<MeasureFields> {
	let e: Errors<MeasureFields> = {fields: {}}
	return e
}

export async function measureCreate(tx: Tx, fields: MeasureFields): Promise<CreateResult<MeasureFields>> {
	let e = validate(fields)
	if (hasErrors(e)) return {ok: false, errors: e}
	let res = await tx.insert(measureTable).values({...fields}).returning({id: measureTable.id})
	return {ok: true, id: res[0].id}
}

export async function measureUpdate(tx: Tx, id: string, fields: Partial<MeasureFields>): Promise<UpdateResult<MeasureFields>> {
	let e = validate(fields)
	if (hasErrors(e)) return {ok: false, errors: e}
	await tx.update(measureTable).set({...fields}).where(eq(measureTable.id, id))
	return {ok: true}
}

export type MeasureViewModel = Exclude<Awaited<ReturnType<typeof measureById>>, undefined>

export async function measureById(id: string) {
	return measureByIdTx(dr, id)
}

export async function measureByIdTx(tx: Tx, id: string) {
	let res = await tx.query.measureTable.findFirst({where: eq(measureTable.id, id)})
	if (!res) throw new Error("Id is invalid")
	return res
}

export async function measureDeleteById(id: string): Promise<DeleteResult> {
	await deleteByIdForStringId(id, measureTable)
	return {ok: true}
}

export async function measureIdByImportId(tx: Tx, importId: string) {
	let res = await tx.select({id: measureTable.id})
		.from(measureTable)
		.where(eq(measureTable.apiImportId, importId))

	if (res.length == 0) return null
	return String(res[0].id)
}


export async function allMeasures(tx: Tx) {
	let res = await tx.query.measureTable.findMany()
	return res
}
