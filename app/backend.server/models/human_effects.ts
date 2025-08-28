import { Tx } from "~/db.server"

import {
	sql,
	eq,
	and
} from "drizzle-orm"

import { insertRow, updateRow, deleteRow, updateRowMergeJson } from "~/util/db"
import { injuredTable, humanDsgTable, deathsTable, missingTable, affectedTable, displacedTable, humanCategoryPresenceTable, disasterRecordsTable } from "~/drizzle/schema"

import { Def, DefEnum } from "~/frontend/editabletable/defs"

import { HumanEffectsTable } from "~/frontend/human_effects/defs"
import { toStandardDate } from "~/util/date"
import { capitalizeFirstLetter, lowercaseFirstLetter } from "~/util/string";
import { dataToGroupKey, groupKeyOnlyZeroes } from "~/frontend/editabletable/data"

export class HEError extends Error {
	code: string
	rowId: any
	constructor(code: string, message: string) {
		super(message)
		this.code = code
	}
	toJSON() {
		return {
			code: this.code,
			message: this.message,
			rowId: this.rowId
		}
	}
}


export type Res =
	| { ok: true, ids: string[] }
	| { ok: false, error: HEError }

function tableFromType(t: HumanEffectsTable): any {
	switch (t) {
		default:
			throw new Error("invalid table type: " + t)
		case "Deaths":
			return deathsTable
		case "Injured":
			return injuredTable
		case "Missing":
			return missingTable
		case "Affected":
			return affectedTable
		case "Displaced":
			return displacedTable
	}
}

function tableDBName(t: HumanEffectsTable): any {
	switch (t) {
		default:
			throw new Error("invalid table type: " + t)
		case "Deaths":
		case "Injured":
		case "Missing":
		case "Affected":
		case "Displaced":
			return t.toLowerCase()
	}
}

function tableJsName(t: HumanEffectsTable): any {
	// js and db name are the same, since 1 word only now
	return tableDBName(t)
}

type SplitRes = {
	defs: { shared: Def[]; custom: Def[], notShared: Def[] }
	splitRow: (data: any[]) => { shared: any[]; notShared: any[], custom: Map<string, any> }
}

function splitDefsByShared(defs: Def[]): SplitRes {
	let custom: Def[] = []
	let shared: Def[] = []
	let notShared: Def[] = []

	for (let i = 0; i < defs.length; i++) {
		if (defs[i].custom) {
			custom.push(defs[i])
		} else if (defs[i].shared) {
			shared.push(defs[i])
		} else {
			notShared.push(defs[i])
		}
	}

	const splitRow = (data: any[]) => {
		let custom = new Map<string, any>()
		let shared: any[] = []
		let notShared: any[] = []
		for (let i = 0; i < defs.length; i++) {
			let d = defs[i]
			if (d.custom) {
				custom.set(d.dbName, data[i])
			} else if (d.shared) {
				shared.push(data[i])
			} else {
				notShared.push(data[i])
			}
		}
		return {
			custom,
			shared,
			notShared
		}
	}

	return { defs: { shared, custom, notShared }, splitRow }
}

type ValidateRowRes =
	{ ok: true; res: any[] } |
	{ ok: false; error: HEError }

function validateRow(
	defs: Def[],
	row: any[],
	dataStrings: boolean,
	allowPartial: boolean
): ValidateRowRes {
	let res: any[] = []

	let invalidValueErr = function (msg: string): ValidateRowRes {
		return { ok: false, error: new HEError("invalid_value", msg) }
	}

	for (let i = 0; i < defs.length; i++) {
		let def = defs[i]
		let value = row[i]
		if (value === undefined) {
			if (allowPartial) {
				res.push(undefined)
				continue
			} else {
				return { ok: false, error: new HEError("invalid_value", "Undefined value in row") }
			}
		}
		if (dataStrings) {
			if (value === "") {
				res.push(null)
				continue
			}
		}
		if (value === null) {
			res.push(null)
			continue
		}

		switch (def.format) {
			case "enum": {
				let enumDef = def as DefEnum
				if (!enumDef.data.some((entry) => entry.key === value)) {
					return invalidValueErr(`Invalid enum value "${value}" for field "${def.jsName}"`)
				}
				res.push(value)
				break
			}
			case "number": {
				if (!dataStrings) {
					if (typeof value !== "number") {
						return invalidValueErr(`Invalid number value "${value}" for field "${def.jsName}"`)
					}
					res.push(value)
				} else {
					let numValue = Number(value)
					if (isNaN(numValue)) {
						return invalidValueErr(`Invalid number string "${value}" for field "${def.jsName}"`)
					}
					res.push(numValue)
				}
				break
			}
			case "date":
				if (typeof value !== "string") {
					return invalidValueErr(`Invalid date type, not a string "${value}" for field "${def.jsName}"`)
				}
				let d = toStandardDate(value)
				if (!d) {
					return invalidValueErr(`Invalid date format "${value}" for field "${def.jsName}"`)
				}
				res.push(d)
				break
			default:
				throw `Unknown def type`
		}
	}

	return { ok: true, res }
}

function sameDimentions(defs: Def[], d1: any[], d2: any[]): boolean {
	for (let i = 0; i < defs.length; i++) {
		let def = defs[i]
		if (def.role != "dimension") {
			continue
		}
		let a = d1[i]
		let b = d2[i]
		if (a != b) {
			return false
		}
	}
	return true
}

export async function create(
	tx: Tx,
	tblId: HumanEffectsTable,
	recordId: string,
	defs: Def[],
	data: any[][],
	dataStrings: boolean
): Promise<Res> {
	// validate that it's not some other string
	tableFromType(tblId)

	let spl = splitDefsByShared(defs)
	let tbl = tableFromType(tblId)
	let ids: string[] = []


	for (let [_, row] of data.entries()) {
		let res = validateRow(defs, row, dataStrings, false)
		if (!res.ok) {
			return res
		}
		let dataSpl = spl.splitRow(res.res)
		let dsgId: string = ""
		let custom = Object.fromEntries(dataSpl.custom)
		{
			let cols = ["record_id", "custom", ...spl.defs.shared.map((c) => c.dbName)]
			let vals = [recordId, custom, ...dataSpl.shared]
			dsgId = await insertRow(tx, humanDsgTable, cols, vals)
		}

		{
			let cols = ["dsg_id", ...spl.defs.notShared.map((c) => c.dbName)]
			let vals = [dsgId, ...dataSpl.notShared]
			const id = await insertRow(tx, tbl, cols, vals)
			ids.push(id)
		}
	}
	return { ok: true, ids }
}

export type ValidateRes =
	| { ok: true }
	| { ok: false, error?: HEError, errors?: HEError[] }

export async function validate(
	tx: Tx,
	tblId: HumanEffectsTable,
	recordId: string,
	countryAccountsId: string,
	defs: Def[]): Promise<ValidateRes> {

	// validate that it's not some other string
	tableFromType(tblId)

	let cur = await get(tx, tblId, recordId, countryAccountsId, defs)
	if (!cur.ok) {
		return cur
	}
	let errors = new Map<string, HEError>()

	for (let [i, row] of cur.data.entries()) {
		let gk = dataToGroupKey(row)
		let id1 = cur.ids[i]
		if (groupKeyOnlyZeroes(gk)) {
			let e = new HEError("no_dimention_data", "Row has no disaggregation values.")
			e.rowId = id1
			errors.set(id1, e)
		}
	}

	let checked = new Map<string, any[]>()
	let dupErr = function (rowId: string) {
		let e = new HEError("duplicate_dimension", "Two or more rows have the same disaggregation values.")
		e.rowId = rowId
		errors.set(rowId, e)
	}
	for (let [i, row1] of cur.data.entries()) {
		let gk = dataToGroupKey(row1)
		if (groupKeyOnlyZeroes(gk)) {
			continue
		}
		let id1 = cur.ids[i]
		for (let [id2, row2] of checked.entries()) {
			let gk = dataToGroupKey(row2)
			if (groupKeyOnlyZeroes(gk)) {
				continue
			}
			if (sameDimentions(defs, row1, row2)) {
				dupErr(id1)
				dupErr(id2)
			}
		}
		checked.set(id1, row1)
	}
	if (errors.size) {
		let e2 = Array.from(errors.values())
		e2.sort((a, b) => a.rowId.localeCompare(b.rowId))
		return { ok: false, errors: e2 }
	}
	return { ok: true }
}

export async function update(
	tx: Tx,
	tblId: HumanEffectsTable,
	defs: Def[],
	ids: string[],
	data: any[][],
	dataStrings: boolean
): Promise<Res> {
	let spl = splitDefsByShared(defs)
	let tbl = tableFromType(tblId)

	if (ids.length !== data.length) {
		return { ok: false, error: new HEError("other", "Mismatch between ids and data rows") }
	}

	for (let i = 0; i < data.length; i++) {
		let row = data[i]
		let id = ids[i]

		let res = validateRow(defs, row, dataStrings, true)
		if (!res.ok) {
			return res
		}

		let dataSpl = spl.splitRow(res.res)
		let custom: any | null = null
		if (dataSpl.custom.size) {
			custom = Object.fromEntries(dataSpl.custom)
		}

		let dsgIdRes = await tx.execute(sql`SELECT dsg_id FROM ${tbl} WHERE id = ${id}`)
		let dsgId = dsgIdRes.rows[0]?.dsg_id
		if (!dsgId) {
			return { ok: false, error: new HEError("other", `Record not found for id: ${id}`) }
		}
		{
			let cols = spl.defs.shared.map((c) => c.dbName)
			let vals = dataSpl.shared
			let jsonbParams = new Set<number>()
			if (custom) {
				jsonbParams.add(vals.length)
				cols.push("custom")
				vals.push(custom)
			}
			await updateRowMergeJson(tx, humanDsgTable, cols, vals, dsgId, jsonbParams)
		}
		{
			let cols = spl.defs.notShared.map((c) => c.dbName)
			let vals = dataSpl.notShared
			await updateRow(tx, tbl, cols, vals, id)
		}
	}

	return { ok: true, ids }
}

export async function deleteRows(
	tx: Tx,
	tblId: HumanEffectsTable,
	ids: string[]
): Promise<Res> {
	let tbl = tableFromType(tblId)
	let deletedIds: string[] = []

	for (let id of ids) {
		let dsgIdRes = await tx.execute(sql`SELECT dsg_id FROM ${tbl} WHERE id = ${id}`)
		let dsgId = dsgIdRes.rows[0]?.dsg_id

		if (!dsgId) {
			return { ok: false, error: new HEError("other", `Record not found for id: ${id}`) }
		}

		await deleteRow(tx, tbl, id)
		await deleteRow(tx, humanDsgTable, dsgId)
		deletedIds.push(id)
	}

	return { ok: true, ids: deletedIds }
}

export async function clearData(
	tx: Tx,
	tblId: HumanEffectsTable,
	recordId: string
): Promise<Res> {
	let tbl = tableFromType(tblId)
	await totalGroupSet(tx, recordId, tblId, null)

	let res = await tx.execute(sql`
SELECT data.id FROM ${tbl} data
INNER JOIN human_dsg ON human_dsg.id = data.dsg_id
WHERE human_dsg.record_id = ${recordId}
`)
	let ids: string[] = []
	for (let row of res.rows) {
		ids.push(row.id as string)
	}
	return deleteRows(tx, tblId, ids)
}



export type GetRes =
	| { ok: true, defs: Def[], ids: string[], data: any[][] }
	| { ok: false, error: HEError }

export async function get(
	tx: Tx,
	tblId: HumanEffectsTable,
	recordId: string,
	countryAccountsId: string,
	defs: Def[]
): Promise<GetRes> {
	let spl = splitDefsByShared(defs)

	let tbl = tableFromType(tblId)

	let cols = [
		...spl.defs.shared.map((d) => (humanDsgTable as any)[d.jsName]),
		...spl.defs.notShared.map((d) => tbl[d.jsName]),
	]

	let query = sql`
		SELECT ${tbl.id}, ${humanDsgTable.custom}, ${sql.join(cols, sql`, `)}
		FROM ${humanDsgTable}
		INNER JOIN ${tbl} ON ${humanDsgTable.id} = ${tbl.dsgId}
		INNER JOIN ${disasterRecordsTable} ON ${disasterRecordsTable.id} = ${humanDsgTable.recordId}
		WHERE ${humanDsgTable.recordId} = ${recordId}
		AND ${disasterRecordsTable.countryAccountsId} = ${countryAccountsId}
	`

	let res = await tx.execute(query)
	let combined = res.rows.map((row: any) => ({
		id: row.id as string,
		data: defs.map(d => {
			if (d.custom) {
				if (!row.custom) return null
				return row.custom[d.dbName] || null
			}
			return row[d.dbName]
		}),
	}))

	// console.log("combined data", combined)

	combined.sort((a, b) => {
		for (let i = 0; i < a.data.length; i++) {
			if (a.data[i] === null && b.data[i] !== null) return -1
			if (a.data[i] !== null && b.data[i] === null) return 1
			if (a.data[i] < b.data[i]) return -1
			if (a.data[i] > b.data[i]) return 1
		}
		return 0
	})

	let ids = combined.map(item => item.id)
	let data = combined.map(item => item.data)

	return { ok: true, defs, ids, data }
}

async function getHidden(tx: Tx) {
	let row = await tx.query.humanDsgConfigTable.findFirst()
	return new Set(row?.hidden?.cols || [])
}

export function sharedDefsAll(): Def[] {
	let shared: Def[] = [
		{
			uiName: "Sex",
			jsName: "sex",
			dbName: "sex",
			uiColWidth: "medium", // 90
			format: "enum",
			role: "dimension",
			data: [
				{ key: "m", label: "M-Male" },
				{ key: "f", label: "F-Female" },
				{ key: "o", label: "O-Other Non-binary" }
			]
		},
		{
			uiName: "Age",
			jsName: "age",
			dbName: "age",
			uiColWidth: "medium", // 90
			format: "enum",
			role: "dimension",
			data: [
				{ key: "0-14", label: "Children, (0-14)" },
				{ key: "15-64", label: "Adult, (15-64)" },
				{ key: "65+", label: "Elder (65-)" },
			]
		},
		{
			uiName: "Disability",
			jsName: "disability",
			dbName: "disability",
			uiColWidth: "wide", // 120
			format: "enum",
			role: "dimension",
			data: [
				{ key: "none", label: "No disabilities" },
				{ key: "physical_dwarfism", label: "Physical, dwarfism" },
				{ key: "physical_problems_in_body_functioning", label: "Physical, Problems in body functioning" },
				{ key: "physical_problems_in_body_structures", label: "Physical, Problems in body structures" },
				{ key: "physical_other_physical_disability", label: "Physical, Other physical disability" },
				{ key: "sensorial_visual_impairments_blindness", label: "Sensorial, visual impairments, blindness" },
				{ key: "sensorial_visual_impairments_partial_sight_loss", label: "Sensorial, visual impairments, partial sight loss" },
				{ key: "sensorial_visual_impairments_colour_blindness", label: "Sensorial, visual impairments, colour blindness" },
				{ key: "sensorial_hearing_impairments_deafness_hard_of_hearing", label: "Sensorial, Hearing impairments, Deafness, hard of hearing" },
				{ key: "sensorial_hearing_impairments_deafness_other_hearing_disability", label: "Sensorial, Hearing impairments, Deafness, other hearing disability" },
				{ key: "sensorial_other_sensory_impairments", label: "Sensorial, other sensory impairments" },
				{ key: "psychosocial", label: "Psychosocial" },
				{ key: "intellectual_cognitive", label: "Intellectual/ Cognitive" },
				{ key: "multiple_deaf_blindness", label: "Multiple, Deaf blindness" },
				{ key: "multiple_other_multiple", label: "Multiple, other multiple" },
				{ key: "others", label: "Others" },
			]
		},
		{
			uiName: "Global poverty line",
			jsName: "globalPovertyLine",
			dbName: "global_poverty_line",
			uiColWidth: "thin", // 60
			format: "enum",
			role: "dimension",
			data: [
				{ key: "below", label: "Below" },
				{ key: "above", label: "Above" },
			]
		},
		{
			uiName: "National poverty line",
			jsName: "nationalPovertyLine",
			dbName: "national_poverty_line",
			uiColWidth: "thin", // 60
			format: "enum",
			role: "dimension",
			data: [
				{ key: "below", label: "Below" },
				{ key: "above", label: "Above" },
			]
		},
	]
	for (const item of shared) {
		item.shared = true
	}
	return shared
}

export async function sharedDefs(tx: Tx): Promise<Def[]> {
	let hidden = await getHidden(tx)
	let shared = sharedDefsAll()
	shared = shared.filter(d => !hidden.has(d.dbName))
	return shared
}

async function defsCustom(tx: Tx): Promise<Def[]> {
	const row = await tx.query.humanDsgConfigTable.findFirst()
	if (!row?.custom?.config) {
		return []
	}
	return row.custom.config.map(d => {
		return {
			uiName: d.uiName,
			jsName: d.dbName,
			dbName: d.dbName,
			uiColWidth: d.uiColWidth,
			format: "enum",
			role: "dimension",
			custom: true,
			data: d.enum
		}
	})
}

export async function defsForTable(tx: Tx, tbl: HumanEffectsTable): Promise<Def[]> {
	return [
		...await sharedDefs(tx),
		...await defsCustom(tx),
		...defsForTableGlobal(tbl)]
}

export function defsForTableGlobal(tbl: HumanEffectsTable): Def[] {
	let res: Def[] = []
	switch (tbl) {
		case "Deaths":
			res.push({
				uiName: "Deaths",
				jsName: "deaths",
				dbName: "deaths",
				format: "number",
				role: "metric",
				uiColWidth: "thin"
			})
			break
		case "Injured":
			res.push({
				uiName: "Injured",
				jsName: "injured",
				dbName: "injured",
				format: "number",
				role: "metric",
				uiColWidth: "thin"
			})
			break
		case "Missing":
			res.push({
				uiName: "As of",
				jsName: "asOf",
				dbName: "as_of",
				format: "date",
				role: "dimension",
				uiColWidth: "thin"
			})
			res.push({
				uiName: "Missing",
				jsName: "missing",
				dbName: "missing",
				format: "number",
				role: "metric",
				uiColWidth: "thin"
			})
			break
		case "Affected":
			res.push(
				{
					uiName: "Directly Affected (Old DesInventar)",
					jsName: "direct",
					dbName: "direct",
					format: "number",
					role: "metric",
					uiColWidth: "thin"
				})
			res.push(
				{
					uiName: "Indirectly Affected (Old DesInventar)",
					jsName: "indirect",
					dbName: "indirect",
					format: "number",
					role: "metric",
					uiColWidth: "thin"
				}
			)
			break
		case "Displaced":
			res.push({
				uiName: "Assisted",
				jsName: "assisted",
				dbName: "assisted",
				format: "enum",
				role: "dimension",
				data: [
					{ key: "assisted", label: "Assisted" },
					{ key: "not_assisted", label: "Not Assisted" },
				],
				uiColWidth: "medium"
			})
			res.push({
				uiName: "Timing",
				jsName: "timing",
				dbName: "timing",
				format: "enum",
				role: "dimension",
				data: [
					{ key: "pre-emptive", label: "Pre-emptive" },
					{ key: "reactive", label: "Reactive" },
				],
				uiColWidth: "medium"
			})
			res.push({
				uiName: "Duration",
				jsName: "duration",
				dbName: "duration",
				format: "enum",
				role: "dimension",
				data: [
					{ key: "short", label: "Short Term" },
					{ key: "medium_short", label: "Medium Short Term" },
					{ key: "medium_long", label: "Medium Long Term" },
					{ key: "long", label: "Long Term" },
					{ key: "permanent", label: "Permanent" },
				],
				uiColWidth: "wide"
			})
			res.push({
				uiName: "As of",
				jsName: "asOf",
				dbName: "as_of",
				format: "date",
				role: "dimension",
				uiColWidth: "thin"
			})
			res.push({
				uiName: "Displaced",
				jsName: "displaced",
				dbName: "displaced",
				format: "number",
				role: "metric",
				uiColWidth: "thin"
			})
			break
		default:
			throw new Error(`Unknown table: ${tbl}`)
	}
	return res
}

function categoryPresenceTableDbNamePrefix(tbl: HumanEffectsTable) {
	switch (tbl) {
		case "Deaths":
			return ""
		case "Injured":
			return ""
		case "Missing":
			return ""
		case "Affected":
			return "affected"
		case "Displaced":
			return ""
	}
}

function categoryPresenceJsName(tbl: HumanEffectsTable, d: Def) {
	let dbNamePrefix = categoryPresenceTableDbNamePrefix(tbl)
	if (!dbNamePrefix) {
		return d.jsName
	}
	return lowercaseFirstLetter(tbl) + capitalizeFirstLetter(d.jsName)
}
function categoryPresenceDbName(tbl: HumanEffectsTable, d: Def) {
	let dbNamePrefix = categoryPresenceTableDbNamePrefix(tbl)
	if (!dbNamePrefix) {
		return d.dbName
	}
	return dbNamePrefix + "_" + d.dbName
}

export async function categoryPresenceGet(tx: Tx, recordId: string, countryAccountsId: string, tblId: HumanEffectsTable, defs: Def[]): Promise<Record<string, boolean>> {
	// validate that it's not some other string
	tableFromType(tblId)

	let rows = await tx
		.select()
		.from(humanCategoryPresenceTable)
		.innerJoin(
			disasterRecordsTable,
			eq(disasterRecordsTable.id, humanCategoryPresenceTable.recordId)
		)
		.where(
			and(
				eq(humanCategoryPresenceTable.recordId, recordId),
				eq(disasterRecordsTable.countryAccountsId, countryAccountsId)
			)
		);

	if (!rows.length) {
		return {}
	}
	let res: Record<string, boolean> = {};
	let row = rows[0].human_category_presence;

	for (let d of defs) {
		if (d.role != "metric") {
			continue
		}
		if (d.custom) {
			throw new Error("Custom metrics not supported")
		}
		let jsNameWithPrefix = categoryPresenceJsName(tblId, d)
		let v = (row as unknown as Record<string, boolean | null>)[jsNameWithPrefix]
		if (v !== null) {
			res[d.jsName] = v
		}
	}
	return res
}

export async function categoryPresenceSet(tx: Tx, recordId: string, tblId: HumanEffectsTable, defs: Def[], data: Record<string, boolean>) {
	// validate that it's not some other string
	tableFromType(tblId)

	let rowData: Record<string, boolean | null> = {}
	for (let d of defs) {
		if (d.role != "metric") {
			continue
		}
		if (d.custom) {
			throw new Error("Custom metrics not supported")
		}
		let v = data[d.jsName] ?? null
		let name = categoryPresenceDbName(tblId, d)
		rowData[name] = v
	}
	let cols: string[] = []
	let vals: any[] = []
	for (let [k, v] of Object.entries(rowData)) {
		cols.push(k)
		vals.push(v)
	}
	await tx.transaction(async (tx) => {
		let rows = await tx
			.select({
				id: humanCategoryPresenceTable.id
			})
			.from(humanCategoryPresenceTable)
			.where(eq(humanCategoryPresenceTable.recordId, recordId))
		if (rows.length) {
			let id = rows[0].id
			await updateRow(tx, humanCategoryPresenceTable, cols, vals, id)
		} else {
			cols.push("record_id")
			vals.push(recordId)
			await insertRow(tx, humanCategoryPresenceTable, cols, vals)
		}
	})
}

export async function categoryPresenceDeleteAll(tx: Tx, recordId: string) {
	await tx.delete(humanCategoryPresenceTable).where(eq(humanCategoryPresenceTable.recordId, recordId))
}


export interface TotalGroupKV {
	dbName: string
	isSet: boolean
}
export type TotalGroup = TotalGroupKV[] | null


function totalGroupJsName(tbl: HumanEffectsTable) {
	return tableJsName(tbl) + "TotalGroupFlags"
}

function totalGroupDBName(tbl: HumanEffectsTable) {
	return tableDBName(tbl) + "_total_group_flags"
}

export async function totalGroupGet(tx: Tx, recordId: string, tbl: HumanEffectsTable): Promise<TotalGroup> {
	// validate that it's not some other string
	tableFromType(tbl)
	let rows = await tx
		.select()
		.from(humanCategoryPresenceTable)
		.where(eq(humanCategoryPresenceTable.recordId, recordId))
	if (!rows.length) {
		return null
	}
	let row = rows[0]
	let field = totalGroupJsName(tbl)
	let v = (row as unknown as Record<string, string>)[field] ?? null
	if (v !== null && !Array.isArray(v)) {
		console.error("Expected totalGroup to be an array", v)
		return null
	}
	return v
}

export async function totalGroupSet(tx: Tx, recordId: string, tbl: HumanEffectsTable, groupKey: TotalGroup) {
	// validate that it's not some other string
	tableFromType(tbl)
	let field = totalGroupDBName(tbl)
	let val = JSON.stringify(groupKey)
	await tx.transaction(async (tx) => {
		let rows = await tx
			.select({
				id: humanCategoryPresenceTable.id
			})
			.from(humanCategoryPresenceTable)
			.where(eq(humanCategoryPresenceTable.recordId, recordId))
		if (rows.length) {
			let id = rows[0].id
			await updateRow(tx, humanCategoryPresenceTable, [field], [val], id)
		} else {
			let cols = ["record_id", field]
			let vals = [recordId, val]
			await insertRow(tx, humanCategoryPresenceTable, cols, vals)
		}
	})
}

