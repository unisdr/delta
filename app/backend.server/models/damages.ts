import {dr, Tx} from "~/db.server"
import {damagesTable, DamagesInsert} from "~/drizzle/schema"
import {eq} from "drizzle-orm"

import {CreateResult, DeleteResult, UpdateResult} from "~/backend.server/handlers/form"
import {Errors, FormInputDef, hasErrors} from "~/frontend/form"
import {deleteByIdForStringId} from "./common"
import {configCurrencies} from "~/util/config"
import {unitsEnum} from "~/frontend/unit_picker"

export interface DamagesFields extends Omit<DamagesInsert, "id"> {}

export const damageTypeEnumData = [
	{key: "partial", label: "Partially damaged"},
	{key: "total", label: "Totally destroyed"}
]


export function fieldsForPubOrPriv(pub: boolean): FormInputDef<DamagesFields>[] {
	let pre = pub ? "public" : "private"
	return [
		{key: pre + "Damage" as keyof DamagesFields , label: "Damage", type: "enum", enumData: damageTypeEnumData, uiRow: {colOverride: 4}},
		{key: pre + "DamageAmount" as keyof DamagesFields, label: "Amount", type: "number"},
		{ key: pre + "Unit" as keyof DamagesFields, label: "Unit", type: "enum", enumData: unitsEnum},
		// repair when publicDamage=partial
		{key: pre + "RepairCostUnit" as keyof DamagesFields, label: "Unit repair cost", type: "money", uiRow: {colOverride:5}},
		{
			key: pre + "RepairCostUnitCurrency" as keyof DamagesFields,
			label: "Currency",
			type: "enum-flex",
			enumData: configCurrencies().map(c => ({key: c, label: c}))
		},
		//{key: pre+ "RepairUnit" as keyof DamagesFields, label: "Repair Unit", type: "enum", enumData: unitsEnum},
		{key: pre+"RepairUnits" as keyof DamagesFields, label: "Amount of units", type: "number"},
		{key: pre+"RepairCostTotalOverride" as keyof DamagesFields, label: "Total repair cost", type: "money"},

		// replacement when publicDamage=partial
		{key: pre+"ReplacementCostUnit" as keyof DamagesFields, label: "Unit replacement cost", type: "money", uiRow: {colOverride: 5}},
		{
			key: pre+"ReplacementCostUnitCurrency" as keyof DamagesFields,
			label: "Currency",
			type: "enum-flex",
			enumData: configCurrencies().map(c => ({key: c, label: c}))
		},
		//{key: pre+"ReplacementUnit" as keyof DamagesFields, label: "Replacement Unit", type: "enum", enumData: unitsEnum},
		{key: pre+"ReplacementUnits" as keyof DamagesFields, label: "Amount of units", type: "number"},
		{key: pre+"ReplacementCostTotalOverride" as keyof DamagesFields, label: "Total replacement cost", type: "money"},
		{key: pre+"RecoveryCostUnit" as keyof DamagesFields, label: "Unit recovery cost", type: "money", uiRow: {colOverride: 5}},
		{
			key: pre+"RecoveryCostUnitCurrency" as keyof DamagesFields,
			label: "Currency",
			type: "enum-flex",
			enumData: configCurrencies().map(c => ({key: c, label: c}))
		},
		//{key: pre+"RecoveryUnit" as keyof DamagesFields, label: "Recovery Unit", type: "enum", enumData: unitsEnum},
		{key: pre+"RecoveryUnits" as keyof DamagesFields, label: "Amount of units", type: "number"},
		{key: pre+"RecoveryCostTotalOverride" as keyof DamagesFields, label: "Total recovery cost", type: "money"},
		{key: pre+"DisruptionDurationDays" as keyof DamagesFields, label: "Duration (days)", type: "number", uiRow: {}},
		{key: pre+"DisruptionDurationHours" as keyof DamagesFields, label: "Duration (hours)", type: "number"},
		{key: pre+"DisruptionUsersAffected" as keyof DamagesFields, label: "Number of users affected", type: "number"},
		{key: pre+"DisruptionPeopleAffected" as keyof DamagesFields, label: "Number of people affected", type: "number"},
		{key: pre+"DisruptionDescription" as keyof DamagesFields, label: "Comment", type: "textarea", uiRowNew: true},
	]
}

export async function fieldsDef(): Promise<FormInputDef<DamagesFields>[]> {
	return [
		{key: "recordId", label: "", type: "other"},
		{key: "sectorId", label: "", type: "other"},
		{key: "assetId", label: "Assets", type: "other"},

		// Public damages
		...fieldsForPubOrPriv(true),
		// Private damages
		...fieldsForPubOrPriv(false),

		{key: "spatialFootprint", label: "Spatial Footprint", type: "other", psqlType: "jsonb", uiRowNew: true},
		{key: "attachments", label: "Attachments", type: "other", psqlType: "jsonb"},
	]
}

export async function fieldsDefApi(): Promise<FormInputDef<DamagesFields>[]> {
	return [
		...await fieldsDef(),
		{key: "apiImportId", label: "", type: "other"}]
}

export async function fieldsDefView(): Promise<FormInputDef<DamagesFields>[]> {
	return fieldsDef()
}

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
	let res = await tx.query.damagesTable.findFirst({
		where: eq(damagesTable.id, id),
		with: {
			asset: true
		}
	})
	if (!res) throw new Error("Id is invalid")
	return res
}

export async function damagesDeleteById(id: string): Promise<DeleteResult> {
	await deleteByIdForStringId(id, damagesTable)
	return {ok: true}
}

