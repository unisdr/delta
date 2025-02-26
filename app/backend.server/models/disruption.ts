import {dr, Tx} from "~/db.server"
import {disruptionTable, DisruptionInsert} from "~/drizzle/schema"
import {eq} from "drizzle-orm"

import {CreateResult, DeleteResult, UpdateResult} from "~/backend.server/handlers/form"
import {Errors, FormInputDef, hasErrors} from "~/frontend/form"
import {deleteByIdForStringId} from "./common"
import {configCurrencies} from "~/util/config"

export interface DisruptionFields extends Omit<DisruptionInsert, "id"> {}

export const fieldsDef: FormInputDef<DisruptionFields>[] =
	[
		{key: "recordId", label: "", type: "other"},
		{key: "sectorId", label: "", type: "other"},
		{key: "durationDays", label: "Duration (days)", type: "number", uiRow: {}},
		{key: "durationHours", label: "Duration (hours)", type: "number"},
		{key: "usersAffected", label: "Number of users affected", type: "number"},
		{key: "peopleAffected", label: "Number of people affected", type: "number"},
		{key: "comment", label: "Add comments", type: "textarea", uiRowNew: true},
		{key: "responseOperation", label: "Response operation", type: "textarea"},
		{key: "responseCost", label: "Response cost", type: "money", uiRow: {}},
		{
			key: "responseCurrency",
			label: "Currency",
			type: "enum-flex",
			enumData: configCurrencies().map(c => {return {key: c, label: c}})
		},
		{key: "spatialFootprint", label: "Spatial Footprint", type: "other", psqlType: "jsonb", uiRowNew: true},
		{key: "attachments", label: "Attachments", type: "other", psqlType: "jsonb"},
	]


export const fieldsDefApi: FormInputDef<DisruptionFields>[] =
	[
		...fieldsDef,
		{key: "apiImportId", label: "", type: "other"}
	]


export const fieldsDefView: FormInputDef<DisruptionFields>[] =
	[
		...fieldsDef,
	]


export function validate(fields: Partial<DisruptionFields>): Errors<DisruptionFields> {
	let errors: Errors<DisruptionFields> = {};
	errors.fields = {};

	let check = (k: keyof DisruptionFields, msg: string) => {
		if (fields[k] != null && (fields[k] as number) < 0) {
			errors.fields![k] = [msg]
		}
	}

	check("durationDays", "Duration (days) must be >= 0")
	check("durationHours", "Duration (hours) must be >= 0")
	check("usersAffected", "Users affected must be >= 0")
	check("responseCost", "Response cost must be >= 0")

	return errors
}

export async function disruptionCreate(tx: Tx, fields: DisruptionFields): Promise<CreateResult<DisruptionFields>> {
	let errors = validate(fields)
	if (hasErrors(errors)) {
		return {ok: false, errors}
	}

	const res = await tx.insert(disruptionTable)
		.values({
			...fields
		})
		.returning({id: disruptionTable.id})

	return {ok: true, id: res[0].id}
}

export async function disruptionUpdate(tx: Tx, id: string, fields: Partial<DisruptionFields>): Promise<UpdateResult<DisruptionFields>> {
	let errors = validate(fields)
	if (hasErrors(errors)) {
		return {ok: false, errors}
	}
	await tx.update(disruptionTable)
		.set({
			...fields
		})
		.where(eq(disruptionTable.id, id))

	return {ok: true}
}

export type DisruptionViewModel = Exclude<Awaited<ReturnType<typeof disruptionById>>, undefined>

export async function disruptionIdByImportId(tx: Tx, importId: string) {
	const res = await tx.select({
		id: disruptionTable.id
	}).from(disruptionTable).where(eq(
		disruptionTable.apiImportId, importId
	))
	if (res.length == 0) {
		return null
	}
	return String(res[0].id)
}

export async function disruptionById(idStr: string) {
	return disruptionByIdTx(dr, idStr)
}

export async function disruptionByIdTx(tx: Tx, id: string) {
	let res = await tx.query.disruptionTable.findFirst({
		where: eq(disruptionTable.id, id),
	})
	if (!res) {
		throw new Error("Id is invalid")
	}
	return res
}

export async function disruptionDeleteById(id: string): Promise<DeleteResult> {
	await deleteByIdForStringId(id, disruptionTable)
	return {ok: true}
}


export async function disruptionDeleteBySectorId(id: number): Promise<DeleteResult> {
	await dr.delete(disruptionTable).where(eq(disruptionTable.sectorId, id));

	return {ok: true}
}