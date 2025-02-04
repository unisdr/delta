import {dr, Tx} from "~/db.server"
import {disruptionTable, DisruptionInsert} from "~/drizzle/schema"
import {eq} from "drizzle-orm"

import {CreateResult, DeleteResult, UpdateResult} from "~/backend.server/handlers/form"
import {Errors, hasErrors} from "~/frontend/form"
import {deleteByIdForNumberId, deleteByIdForStringId} from "./common"

export interface DisruptionFields extends Omit<DisruptionInsert, "id"> {}

export function validate(fields: Partial<DisruptionFields>): Errors<DisruptionFields> {
	let errors: Errors<DisruptionFields> = {};
	errors.fields = {};

	if (fields.durationDays !== undefined && fields.durationDays < 0) {
		errors.fields.durationDays = ["Duration (days) must be >= 0"]
	}
	if (fields.durationHours !== undefined && fields.durationHours < 0) {
		errors.fields.durationHours = ["Duration (hours) must be >= 0"]
	}
	if (fields.usersAffected !== undefined && fields.usersAffected < 0) {
		errors.fields.usersAffected = ["Users affected must be >= 0"]
	}
	if (fields.responseCost !== undefined && fields.responseCost < 0) {
		errors.fields.responseCost = ["Response cost must be >= 0"]
	}

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

