import {dr, Tx} from "~/db.server"
import {lossesTable, LossesInsert} from "~/drizzle/schema"
import {eq} from "drizzle-orm"

import {CreateResult, DeleteResult, UpdateResult} from "~/backend.server/handlers/form"
import {Errors, FormInputDef, hasErrors} from "~/frontend/form"
import {deleteByIdForStringId} from "./common"
import {configCurrencies} from "~/util/config"
import {unitsEnum} from "~/frontend/unit_picker"
import {typeEnumAgriculture, typeEnumNotAgriculture} from "~/frontend/losses_enums"

export interface LossesFields extends Omit<LossesInsert, "id"> {}

export function fieldsForPubOrPriv(pub: boolean): FormInputDef<LossesFields>[] {
	let pre = pub ? "public" : "private"
	return [
		{key: pre + "Unit" as keyof LossesFields, label: "Value Unit", type: "enum", enumData: unitsEnum, uiRow: {colOverride: 5}},
		{key: pre + "Units" as keyof LossesFields, label: "Value", type: "number"},
		{key: pre + "CostUnit" as keyof LossesFields, label: "Cost Per Unit", type: "money"},
		{
			key: pre + "CostUnitCurrency" as keyof LossesFields,
			label: "Cost Currency",
			type: "enum-flex",
			enumData: configCurrencies().map(c => ({key: c, label: c}))
		},
		{key: pre + "CostTotal" as keyof LossesFields, label: "Total Cost", type: "money", uiRow: {}},
		{key: pre + "CostTotalOverride" as keyof LossesFields, label: "Override", type: "bool"},
		/*
		{
			key: pre + "TotalCostCurrency" as keyof LossesFields,
			label: "Total Cost Currency",
			type: "enum-flex",
			enumData: configCurrencies().map(c => ({key: c, label: c}))
		},*/
	]
}

export const fieldsDef: FormInputDef<LossesFields>[] = [
	{key: "recordId", label: "", type: "uuid"},
	{key: "sectorId", label: "", type: "other"},
	{key: "sectorIsAgriculture", label: "", type: "bool"},
	{
		key: "typeNotAgriculture", label: "Type", type: "enum", enumData: [
			{"key": "infrastructure_temporary", "label": "Infrastructure- temporary for service/production continuity"},
			{"key": "production_service_delivery_and_availability", "label": "Production,Service delivery and availability of/access to goods and services"},
			{"key": "governance_and_decision_making", "label": "Governance and decision-making"},
			{"key": "risk_and_vulnerabilities", "label": "Risk and vulnerabilities"},
			{"key": "other_losses", "label": "Other losses"},
			{"key": "employment_and_livelihoods_losses", "label": "Employment and Livelihoods losses"}
		], uiRow: {},
	},
	{
		key: "typeAgriculture", label: "Type", type: "enum", enumData: [
			{"key": "infrastructure_temporary", "label": "Infrastructure- temporary for service/production continuity"},
			{"key": "production_losses", "label": "Production losses"},
			{"key": "production_service_delivery_and_availability", "label": "Production, Service delivery and availability of/access to goods and services"},
			{"key": "governance_and_decision_making", "label": "Governance and decision-making"},
			{"key": "risk_and_vulnerabilities", "label": "Risk and vulnerabilities"},
			{"key": "other_losses", "label": "Other losses"},
			{"key": "employment_and_livelihoods_losses", "label": "Employment and Livelihoods losses"}
		], uiRow: {},
	},
	{
		key: "relatedToNotAgriculture", label: "Related To", type: "enum", enumData: typeEnumNotAgriculture.map(v => ({key: v.key, label: v.label}))
	},
	{
		key: "relatedToAgriculture", label: "Related To", type: "enum", enumData: typeEnumAgriculture.map(v => ({key: v.key, label: v.label}))
	},
	{key: "description", label: "Description", type: "textarea", uiRowNew: true},

	// Public 
	...fieldsForPubOrPriv(true),
	// Private 
	...fieldsForPubOrPriv(false),

	{key: "spatialFootprint", label: "Spatial Footprint", type: "other", psqlType: "jsonb", uiRowNew: true},
	{key: "attachments", label: "Attachments", type: "other", psqlType: "jsonb"},
]

export const fieldsDefApi: FormInputDef<LossesFields>[] = [...fieldsDef, {key: "apiImportId", label: "", type: "other"}]
export const fieldsDefView: FormInputDef<LossesFields>[] = [...fieldsDef]

export function validate(fields: Partial<LossesFields>): Errors<LossesFields> {
	let errors: Errors<LossesFields> = {fields: {}}
	let msg = "must be >= 0"
	let check = (k: keyof LossesFields) => {
		if (fields[k] != null && (fields[k] as number) < 0) errors.fields![k] = [msg]
	}
	[
		"publicValue",
		"publicCostPerUnit",
		"publicTotalCost",
		"privateValue",
		"privateCostPerUnit",
		"privateTotalCost"
	].forEach(k => check(k as keyof LossesFields))

	return errors
}

export async function lossesCreate(tx: Tx, fields: LossesFields): Promise<CreateResult<LossesFields>> {
	let errors = validate(fields)
	if (hasErrors(errors)) return {ok: false, errors}

	if (fields.sectorIsAgriculture) {
		fields.relatedToNotAgriculture = null
	} else {
		fields.relatedToAgriculture = null
	}

	const res = await tx.insert(lossesTable).values({...fields}).returning({id: lossesTable.id})
	return {ok: true, id: res[0].id}
}

export async function lossesUpdate(tx: Tx, id: string, fields: Partial<LossesFields>): Promise<UpdateResult<LossesFields>> {
	let errors = validate(fields)
	if (hasErrors(errors)) return {ok: false, errors}

	if (typeof fields.sectorIsAgriculture == "boolean") {
		if (fields.sectorIsAgriculture) {
			fields.relatedToNotAgriculture = null
		} else {
			fields.relatedToAgriculture = null
		}
	}


	await tx.update(lossesTable).set({...fields}).where(eq(lossesTable.id, id))
	return {ok: true}
}

export type LossesViewModel = Exclude<Awaited<ReturnType<typeof lossesById>>, undefined>

export async function lossesIdByImportId(tx: Tx, importId: string) {
	const res = await tx.select({id: lossesTable.id}).from(lossesTable).where(eq(lossesTable.apiImportId, importId))
	return res.length == 0 ? null : String(res[0].id)
}

export async function lossesById(idStr: string) {
	return lossesByIdTx(dr, idStr)
}

export async function lossesByIdTx(tx: Tx, id: string) {
	let res = await tx.query.lossesTable.findFirst({where: eq(lossesTable.id, id)})
	if (!res) throw new Error("Id is invalid")
	return res
}

export async function lossesDeleteById(id: string): Promise<DeleteResult> {
	await deleteByIdForStringId(id, lossesTable)
	return {ok: true}
}

export async function lossesDeleteBySectorId(id: number): Promise<DeleteResult> {
	await dr.delete(lossesTable).where(eq(lossesTable.sectorId, id));

	return {ok: true}
}
