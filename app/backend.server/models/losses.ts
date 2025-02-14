import {dr, Tx} from "~/db.server"
import {lossesTable, LossesInsert} from "~/drizzle/schema"
import {eq} from "drizzle-orm"

import {CreateResult, DeleteResult, UpdateResult} from "~/backend.server/handlers/form"
import {Errors, FormInputDef, hasErrors} from "~/frontend/form"
import {deleteByIdForStringId} from "./common"
import {configCurrencies} from "~/util/config"

export interface LossesFields extends Omit<LossesInsert, "id"> {}

export const fieldsDef: FormInputDef<LossesFields>[] = [
	{key: "recordId", label: "", type: "other"},
	{key: "sectorId", label: "", type: "other"},
	{key: "sectorIsAgriculture", label: "", type: "bool"},
	{
		key: "type", label: "Type", type: "enum", enumData: [
			{key: "increased_expenditure", label: "Increased Expenditure"},
			{key: "loss_revenue_forecasted", label: "Loss Revenue (Forecasted)"},
			{key: "non_economic_losses", label: "Non Economic Losses"}
		]
	},
	{
		key: "relatedToNotAgriculture", label: "Related To", type: "enum", enumData: [
			{key: "infrastructure_equipment", label: "Infrastructure & Equipment"},
			{key: "production_delivery_access", label: "Production, Delivery & Access"},
			{key: "governance", label: "Governance"},
			{key: "risk_vulnerability_drr", label: "Risk, Vulnerability & DRR"},
			{key: "other", label: "Other"}
		]
	},
	{
		key: "relatedToAgriculture", label: "Related To", type: "enum", enumData: [
			{key: "value1", label: "Agriculture Value 1"},
			{key: "value2", label: "Agriculture Value 2"},
		]
	},
	{key: "description", label: "Description", type: "textarea"},
	{
		key: "publicValueUnit", label: "Value Unit", type: "enum", enumData: [
			{key: "number", label: "Number"},
			{key: "area", label: "Area"},
			{key: "volume", label: "Volume"},
			{key: "duration_days", label: "Duration (Days)"},
			{key: "duration_hours", label: "Duration (Hours)"}
		]
	},
	{key: "publicValue", label: "Value", type: "number"},
	{key: "publicCostPerUnit", label: "Cost Per Unit", type: "money"},
	{
		key: "publicCostPerUnitCurrency",
		label: "Cost Currency",
		type: "enum-flex",
		enumData: configCurrencies().map(c => ({key: c, label: c}))
	},
	{key: "publicTotalCost", label: "Total Cost", type: "money"},
	{
		key: "publicTotalCostCurrency",
		label: "Total Cost Currency",
		type: "enum-flex",
		enumData: configCurrencies().map(c => ({key: c, label: c}))
	},
	{
		key: "privateValueUnit", label: "Value Unit", type: "enum", enumData: [
			{key: "number", label: "Number"},
			{key: "area", label: "Area"},
			{key: "volume", label: "Volume"},
			{key: "duration_days", label: "Duration (Days)"},
			{key: "duration_hours", label: "Duration (Hours)"}
		]
	},
	{key: "privateValue", label: "Value", type: "number"},
	{key: "privateCostPerUnit", label: "Cost Per Unit", type: "money"},
	{
		key: "privateCostPerUnitCurrency",
		label: "Cost Currency",
		type: "enum-flex",
		enumData: configCurrencies().map(c => ({key: c, label: c}))
	},
	{key: "privateTotalCost", label: "Total Cost", type: "money"},
	{
		key: "privateTotalCostCurrency",
		label: "Total Cost Currency",
		type: "enum-flex",
		enumData: configCurrencies().map(c => ({key: c, label: c}))
	}
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

