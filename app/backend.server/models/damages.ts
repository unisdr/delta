import {dr, Tx} from "~/db.server"
import {damagesTable, DamagesInsert} from "~/drizzle/schema"
import {eq} from "drizzle-orm"

import {CreateResult, DeleteResult, UpdateResult} from "~/backend.server/handlers/form"
import {Errors, FormInputDef, hasErrors} from "~/frontend/form"
import {deleteByIdForStringId} from "./common"
import {configCurrencies} from "~/util/config"
import {unitsEnum} from "~/frontend/unit_picker"

export interface DamagesFields extends Omit<DamagesInsert, "id"> {}


export function fieldsForPd(pre: "pd" | "td"): FormInputDef<DamagesFields>[] {
	let repairOrReplacement = pre == "pd" ? "Repair" : "Replacement"

	return [
		{key: pre + "DamageAmount" as keyof DamagesFields, label: "Amount", type: "number", uiRow: {}},
		{key: pre + repairOrReplacement + "CostUnit" as keyof DamagesFields, label: `Unit ${repairOrReplacement.toLowerCase()} cost`, type: "money", uiRow: {}},
		{
			key: pre + repairOrReplacement + "CostUnitCurrency" as keyof DamagesFields,
			label: "Currency",
			type: "enum-flex",
			enumData: configCurrencies().map(c => ({key: c, label: c}))
		},
		{key: pre + repairOrReplacement + "Units" as keyof DamagesFields, label: "Amount of units", type: "number"},
		{key: pre + repairOrReplacement + "CostTotal" as keyof DamagesFields, label: `Total ${repairOrReplacement.toLowerCase()} cost`, type: "money"},
		{key: pre + repairOrReplacement + "CostTotalOverride" as keyof DamagesFields, label: "Override", type: "bool"},
		{key: pre + "RecoveryCostUnit" as keyof DamagesFields, label: "Unit recovery cost", type: "money", uiRow: {colOverride: 5}},
		{
			key: pre + "RecoveryCostUnitCurrency" as keyof DamagesFields,
			label: "Currency",
			type: "enum-flex",
			enumData: configCurrencies().map(c => ({key: c, label: c}))
		},
		{key: pre + "RecoveryUnits" as keyof DamagesFields, label: "Amount of units", type: "number"},
		{key: pre + "RecoveryCostTotal" as keyof DamagesFields, label: "Total recovery cost", type: "money"},
		{key: pre + "RecoveryCostTotalOverride" as keyof DamagesFields, label: "Override", type: "bool"},
		{key: pre + "DisruptionDurationDays" as keyof DamagesFields, label: "Duration (days)", type: "number", uiRow: {}},
		{key: pre + "DisruptionDurationHours" as keyof DamagesFields, label: "Duration (hours)", type: "number"},
		{key: pre + "DisruptionUsersAffected" as keyof DamagesFields, label: "Number of users affected", type: "number"},
		{key: pre + "DisruptionPeopleAffected" as keyof DamagesFields, label: "Number of people affected", type: "number"},
		{key: pre + "DisruptionDescription" as keyof DamagesFields, label: "Comment", type: "textarea", uiRowNew: true},
	]
}

export async function fieldsDef(): Promise<FormInputDef<DamagesFields>[]> {
	return [
		{key: "recordId", label: "", type: "other"},
		{key: "sectorId", label: "", type: "other"},
		{key: "assetId", label: "Assets", type: "other"},

		{key: "unit", label: "Unit", type: "enum", enumData: unitsEnum},
		{key: "totalDamageAmount", label: "Total number of assets affected (partially damaged + totally destroyed)", type: "number", uiRow: {}},
		{key: "totalDamageAmountOverride", label: "Override", type: "bool"},
		{key: "totalRepairReplacementRecovery", label: "Total damage in monetary terms", type: "money"},
		{key: "totalRepairReplacementRecoveryOverride", label: "Override", type: "bool"},

		// Partially destroyed
		...fieldsForPd("pd"),
		// Totally damaged
		...fieldsForPd("td"),

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
	let keys = [
		"totalDamageAmount",
		"totalRepairReplacementRecovery",
		"pdRepairCostUnit",
		"pdRepairUnits",
		"pdRepairCostTotal",
		"pdRecoveryCostUnit",
		"pdRecoveryUnits",
		"pdRecoveryCostTotal",
		"pdDisruptionDurationDays",
		"pdDisruptionDurationHours",
		"pdDisruptionUsersAffected",
		"pdDisruptionPeopleAffected",
		"tdReplacementCostUnit",
		"tdReplacementUnits",
		"tdReplacementCostTotal",
		"tdRecoveryCostUnit",
		"tdRecoveryUnits",
		"tdRecoveryCostTotal",
		"tdDisruptionDurationDays",
		"tdDisruptionDurationHours",
		"tdDisruptionUsersAffected",
		"tdDisruptionPeopleAffected",
	]
	keys.forEach(k => check(k as keyof DamagesFields))
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

