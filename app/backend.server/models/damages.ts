import {dr, Tx} from "~/db.server"
import {damagesTable, DamagesInsert} from "~/drizzle/schema"
import {eq} from "drizzle-orm"

import {CreateResult, DeleteResult, UpdateResult} from "~/backend.server/handlers/form"
import {Errors, FormInputDef, hasErrors} from "~/frontend/form"
import {deleteByIdForStringId} from "./common"
import {configCurrencies} from "~/util/config"

export interface DamagesFields extends Omit<DamagesInsert, "id"> {}

export const fieldsDef: FormInputDef<DamagesFields>[] =
	[
		{key: "recordId", label: "", type: "other"},
		{key: "sectorId", label: "", type: "other"},
		{key: "isPublic", label: "Is Public", type: "bool", required:true},
		{key: "damage", label: "Damage", type: "enum", enumData: [{key: "partial", label: "Partial"}, {key: "total", label: "Total"}]},
		{key: "damageAmount", label: "Damage Amount", type: "number"},
		{key: "damageUnitType", label: "Damage Unit Type", type: "enum", enumData: [{key: "numbers", label: "Numbers"}, {key: "other", label: "Other"}]},
		{key: "repairCostUnit", label: "Repair Cost Unit", type: "number"},
		{
			key: "repairCostUnitCurr",
			label: "Repair Cost Currency",
			type: "enum-flex",
			enumData: configCurrencies().map(c => ({key: c, label: c}))
		},
		{key: "repairUnits", label: "Repair Units", type: "number"},
		{key: "repairCostTotalOverride", label: "Repair Cost Total Override", type: "number"},
		{key: "recoveryCostUnit", label: "Recovery Cost Unit", type: "number"},
		{
			key: "recoveryCostUnitCurr",
			label: "Recovery Cost Currency",
			type: "enum-flex",
			enumData: configCurrencies().map(c => ({key: c, label: c}))
		},
		{key: "recoveryUnits", label: "Recovery Units", type: "number"},
		{key: "recoveryCostTotalOverride", label: "Recovery Cost Total Override", type: "number"},
		{key: "disruptionDurationDays", label: "Disruption Duration (Days)", type: "number"},
		{key: "disruptionDurationHours", label: "Disruption Duration (Hours)", type: "number"},
		{key: "disruptionUsersAffected", label: "Disruption Users Affected", type: "number"},
		{key: "disruptionPeopleAffected", label: "Disruption People Affected", type: "number"},
		{key: "disruptionDescription", label: "Disruption Description", type: "textarea"},
	]

export const fieldsDefApi: FormInputDef<DamagesFields>[] = [...fieldsDef, {key: "apiImportId", label: "", type: "other"}]
export const fieldsDefView: FormInputDef<DamagesFields>[] = [...fieldsDef]

export function validate(fields: Partial<DamagesFields>): Errors<DamagesFields> {
	let errors: Errors<DamagesFields> = {fields: {}}
	let msg = "must be >= 0"
	let check = (k: keyof DamagesFields) => {
		if (fields[k] != null && (fields[k] as number) < 0) errors.fields![k] = [msg]
	}
	[
		"damageAmount",
		"repairCostUnit",
		"repairUnits",
		"repairCostTotalOverride",
		"recoveryCostUnit",
		"recoveryUnits",
		"recoveryCostTotalOverride",
		"disruptionDurationDays",
		"disruptionDurationHours",
		"disruptionUsersAffected",
		"disruptionPeopleAffected"
	].forEach(k => check(k as keyof DamagesFields))

	return errors
}

export async function damagesCreate(tx: Tx, fields: DamagesFields): Promise<CreateResult<DamagesFields>> {
	let errors = validate(fields)
	if (hasErrors(errors)) return {ok: false, errors}

	const res = await tx.insert(damagesTable).values({...fields}).returning({id: damagesTable.id})
	return {ok: true, id: res[0].id}
}

export async function damagesUpdate(tx: Tx, id: string, fields: Partial<DamagesFields>): Promise<UpdateResult<DamagesFields>> {
	let errors = validate(fields)
	if (hasErrors(errors)) return {ok: false, errors}

	await tx.update(damagesTable).set({...fields}).where(eq(damagesTable.id, id))
	return {ok: true}
}

export type DamagesViewModel = Exclude<Awaited<ReturnType<typeof damagesById>>, undefined>

export async function damagesIdByImportId(tx: Tx, importId: string) {
	const res = await tx.select({id: damagesTable.id}).from(damagesTable).where(eq(damagesTable.apiImportId, importId))
	return res.length == 0 ? null : String(res[0].id)
}

export async function damagesById(idStr: string) {
	return damagesByIdTx(dr, idStr)
}

export async function damagesByIdTx(tx: Tx, id: string) {
	let res = await tx.query.damagesTable.findFirst({where: eq(damagesTable.id, id)})
	if (!res) throw new Error("Id is invalid")
	return res
}

export async function damagesDeleteById(id: string): Promise<DeleteResult> {
	await deleteByIdForStringId(id, damagesTable)
	return {ok: true}
}

