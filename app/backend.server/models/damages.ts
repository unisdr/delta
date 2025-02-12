import {dr, Tx} from "~/db.server"
import {damagesTable, DamagesInsert} from "~/drizzle/schema"
import {eq} from "drizzle-orm"

import {CreateResult, DeleteResult, UpdateResult} from "~/backend.server/handlers/form"
import {Errors, FormInputDef, hasErrors} from "~/frontend/form"
import {deleteByIdForStringId} from "./common"
import {configCurrencies} from "~/util/config"

export interface DamagesFields extends Omit<DamagesInsert, "id"> {}

export const damageTypeEnumData = [
	{key: "partial", label: "Partially damaged"},
	{key: "total", label: "Totally destroyed"}
]

export const fieldsDef: FormInputDef<DamagesFields>[] =
	[
		{key: "recordId", label: "", type: "other"},
		{key: "sectorId", label: "", type: "other"},

		// Public damages
		{key: "publicDamage", label: "Damage", type: "enum", enumData: damageTypeEnumData},
		{key: "publicDamageAmount", label: "Damage Amount", type: "number"},
		{key: "publicDamageUnitType", label: "Damage Unit Type", type: "enum", enumData: [{key: "numbers", label: "Numbers"}, {key: "other", label: "Other"}]},
		// repair when publicDamage=partial
		{key: "publicRepairCostUnit", label: "Repair Cost Unit", type: "number"},
		{
			key: "publicRepairCostUnitCurrency",
			label: "Repair Cost Currency",
			type: "enum-flex",
			enumData: configCurrencies().map(c => ({key: c, label: c}))
		},
		{key: "publicRepairUnits", label: "Repair Units", type: "number"},
		{key: "publicRepairCostTotalOverride", label: "Repair Cost Total Override", type: "number"},
		// replacement when publicDamage=partial
		{key: "publicReplacementCostUnit", label: "Replacement Cost Unit", type: "number"},
		{
			key: "publicReplacementCostUnitCurrency",
			label: "Replacement Cost Currency",
			type: "enum-flex",
			enumData: configCurrencies().map(c => ({key: c, label: c}))
		},
		{key: "publicReplacementUnits", label: "Replacement Units", type: "number"},
		{key: "publicReplacementCostTotalOverride", label: "Replacement Cost Total Override", type: "number"},
		{key: "publicRecoveryCostUnit", label: "Recovery Cost Unit", type: "number"},
		{
			key: "publicRecoveryCostUnitCurrency",
			label: "Recovery Cost Currency",
			type: "enum-flex",
			enumData: configCurrencies().map(c => ({key: c, label: c}))
		},
		{key: "publicRecoveryUnits", label: "Recovery Units", type: "number"},
		{key: "publicRecoveryCostTotalOverride", label: "Recovery Cost Total Override", type: "number"},
		{key: "publicDisruptionDurationDays", label: "Disruption Duration (Days)", type: "number"},
		{key: "publicDisruptionDurationHours", label: "Disruption Duration (Hours)", type: "number"},
		{key: "publicDisruptionUsersAffected", label: "Disruption Users Affected", type: "number"},
		{key: "publicDisruptionPeopleAffected", label: "Disruption People Affected", type: "number"},
		{key: "publicDisruptionDescription", label: "Disruption Description", type: "textarea"},

		// Private damages
		{key: "privateDamage", label: "Damage", type: "enum", enumData: damageTypeEnumData},
		{key: "privateDamageAmount", label: "Damage Amount", type: "number"},
		{key: "privateDamageUnitType", label: "Damage Unit Type", type: "enum", enumData: [{key: "numbers", label: "Numbers"}, {key: "other", label: "Other"}]},
		// repair when publicDamage=partial
		{key: "privateRepairCostUnit", label: "Repair Cost Unit", type: "number"},
		{
			key: "privateRepairCostUnitCurrency",
			label: "Repair Cost Currency",
			type: "enum-flex",
			enumData: configCurrencies().map(c => ({key: c, label: c}))
		},
		{key: "privateRepairUnits", label: "Repair Units", type: "number"},
		{key: "privateRepairCostTotalOverride", label: "Repair Cost Total Override", type: "number"},
		// replacement when publicDamage=partial
		{key: "privateReplacementCostUnit", label: "Replacement Cost Unit", type: "number"},
		{
			key: "privateReplacementCostUnitCurrency",
			label: "Replacement Cost Currency",
			type: "enum-flex",
			enumData: configCurrencies().map(c => ({key: c, label: c}))
		},
		{key: "privateReplacementUnits", label: "Replacement Units", type: "number"},
		{key: "privateReplacementCostTotalOverride", label: "Replacement Cost Total Override", type: "number"},

		{key: "privateRecoveryCostUnit", label: "Recovery Cost Unit", type: "number"},
		{
			key: "privateRecoveryCostUnitCurrency",
			label: "Recovery Cost Currency",
			type: "enum-flex",
			enumData: configCurrencies().map(c => ({key: c, label: c}))
		},
		{key: "privateRecoveryUnits", label: "Recovery Units", type: "number"},
		{key: "privateRecoveryCostTotalOverride", label: "Recovery Cost Total Override", type: "number"},
		{key: "privateDisruptionDurationDays", label: "Disruption Duration (Days)", type: "number"},
		{key: "privateDisruptionDurationHours", label: "Disruption Duration (Hours)", type: "number"},
		{key: "privateDisruptionUsersAffected", label: "Disruption Users Affected", type: "number"},
		{key: "privateDisruptionPeopleAffected", label: "Disruption People Affected", type: "number"},
		{key: "privateDisruptionDescription", label: "Disruption Description", type: "textarea"},

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

	if (fields.publicDamage == "partial") {
		fields.publicReplacementCostUnit = null
		fields.publicReplacementCostUnitCurrency = null
		fields.publicReplacementUnits = null
		fields.publicReplacementCostTotalOverride = null
	} else if (fields.publicDamage == "total") {
		fields.publicRepairCostUnit = null
		fields.publicRepairCostUnitCurrency = null
		fields.publicRepairUnits = null
		fields.publicRepairCostTotalOverride = null
	}

	if (fields.privateDamage == "partial") {
		fields.privateReplacementCostUnit = null
		fields.privateReplacementCostUnitCurrency = null
		fields.privateReplacementUnits = null
		fields.privateReplacementCostTotalOverride = null
	} else if (fields.privateDamage == "total") {
		fields.privateRepairCostUnit = null
		fields.privateRepairCostUnitCurrency = null
		fields.privateRepairUnits = null
		fields.privateRepairCostTotalOverride = null
	}

	const res = await tx.insert(damagesTable).values({...fields}).returning({id: damagesTable.id})
	return {ok: true, id: res[0].id}
}

export async function damagesUpdate(tx: Tx, id: string, fields: Partial<DamagesFields>): Promise<UpdateResult<DamagesFields>> {
	let errors = validate(fields)
	if (hasErrors(errors)) return {ok: false, errors}

	if (fields.publicDamage == "partial") {
		fields.publicReplacementCostUnit = null
		fields.publicReplacementCostUnitCurrency = null
		fields.publicReplacementUnits = null
		fields.publicReplacementCostTotalOverride = null
	} else if (fields.publicDamage == "total") {
		fields.publicRepairCostUnit = null
		fields.publicRepairCostUnitCurrency = null
		fields.publicRepairUnits = null
		fields.publicRepairCostTotalOverride = null
	}

	if (fields.privateDamage == "partial") {
		fields.privateReplacementCostUnit = null
		fields.privateReplacementCostUnitCurrency = null
		fields.privateReplacementUnits = null
		fields.privateReplacementCostTotalOverride = null
	} else if (fields.privateDamage == "total") {
		fields.privateRepairCostUnit = null
		fields.privateRepairCostUnitCurrency = null
		fields.privateRepairUnits = null
		fields.privateRepairCostTotalOverride = null
	}

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

