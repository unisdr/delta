import {Tx} from "~/db.server"
import {dr} from '~/db.server';

import {
	sql,
	eq
} from "drizzle-orm"

import {insertRow, updateRow, deleteRow, updateRowMergeJson} from "~/util/db"
import {injuredTable, humanDsgTable, deathsTable, missingTable, affectedTable, displacedTable, displacementStocksTable, humanCategoryPresenceTable} from "~/drizzle/schema"

import {Def, DefEnum} from "~/frontend/editabletable/defs"

import {HumanEffectsTable} from "~/frontend/human_effects/defs"
import {toStandardDate} from "~/util/date"
import {capitalizeFirstLetter, lowercaseFirstLetter} from "~/util/string";

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
	| {ok: true, ids: string[]}
	| {ok: false, error: HEError}

function tableFromType(t: HumanEffectsTable): any {
	switch (t) {
		default:
			throw "invalid type"
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
		case "DisplacementStocks":
			return displacementStocksTable
	}
}

type SplitRes = {
	defs: {shared: Def[]; custom: Def[], notShared: Def[]}
	splitRow: (data: any[]) => {shared: any[]; notShared: any[], custom: Map<string, any>}
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

	return {defs: {shared, custom, notShared}, splitRow}
}

type ValidateRowRes =
	{ok: true; res: any[]} |
	{ok: false; error: HEError}

function validateRow(
	defs: Def[],
	row: any[],
	dataStrings: boolean,
	allowPartial: boolean
): ValidateRowRes {
	let res: any[] = []

	let invalidValueErr = function (msg: string): ValidateRowRes {
		return {ok: false, error: new HEError("invalid_value", msg)}
	}

	for (let i = 0; i < defs.length; i++) {
		let def = defs[i]
		let value = row[i]
		if (value === undefined) {
			if (allowPartial) {
				res.push(undefined)
				continue
			} else {
				return {ok: false, error: new HEError("invalid_value", "Undefined value in row")}
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

	return {ok: true, res}
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
	// TODO: unused, delete
	_: string[],
	data: any[][],
	dataStrings: boolean
): Promise<Res> {
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
	return {ok: true, ids}
}

export type ValidateRes =
	| {ok: true}
	| {ok: false, error?: HEError, errors?: HEError[]}

export async function validate(
	tx: Tx,
	tblId: HumanEffectsTable,
	recordId: string,
	defs: Def[]): Promise<ValidateRes> {
	let cur = await get(tx, tblId, recordId, defs)
	if (!cur.ok) {
		return cur
	}
	let errors = new Map<string, HEError>()
	let checked = new Map<string, any[]>()
	let dupErr = function (rowId: string) {
		let e = new HEError("duplicate_dimension", "Two or more rows have the same disaggregation values.")
		e.rowId = rowId
		errors.set(rowId, e)
	}
	for (let [i, row1] of cur.data.entries()) {
		let id1 = cur.ids[i]
		for (let [id2, row2] of checked.entries()) {
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
		return {ok: false, errors: e2}
	}
	return {ok: true}
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
		return {ok: false, error: new HEError("other", "Mismatch between ids and data rows")}
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
			return {ok: false, error: new HEError("other", `Record not found for id: ${id}`)}
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

	return {ok: true, ids}
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
			return {ok: false, error: new HEError("other", `Record not found for id: ${id}`)}
		}

		await deleteRow(tx, tbl, id)
		await deleteRow(tx, humanDsgTable, dsgId)
		deletedIds.push(id)
	}

	return {ok: true, ids: deletedIds}
}

export async function clearData(
	tx: Tx,
	tblId: HumanEffectsTable,
	recordId: string
): Promise<Res> {
	let tbl = tableFromType(tblId)
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
	| {ok: true, defs: Def[], ids: string[], data: any[][]}
	| {ok: false, error: HEError}

export async function get(
	tx: Tx,
	tblId: HumanEffectsTable,
	recordId: string,
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
		WHERE ${humanDsgTable.recordId} = ${recordId}
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

	return {ok: true, defs, ids, data}
}

async function getHidden() {
	let row = await dr.query.humanDsgConfigTable.findFirst()
	return new Set(row?.hidden?.cols || [])
}

export function sharedDefsAll(): Def[] {
	let shared: Def[] = [
		{
			uiName: "Sex",
			jsName: "sex",
			dbName: "sex",
			uiColWidth: 50,
			format: "enum",
			role: "dimension",
			data: [
				{key: "m", label: "M"},
				{key: "f", label: "F"}]
		},
		{
			uiName: "Age",
			jsName: "age",
			dbName: "age",
			uiColWidth: 80,
			format: "enum",
			role: "dimension",
			data: [
				{key: "0-20", label: "0-20"},
				{key: "21-40", label: "21-40"},
				{key: "41-60", label: "41-60"},
				{key: "60-81", label: "60-81"},
				{key: ">80", label: ">80"},
			]
		},
		{
			uiName: "Disability",
			jsName: "disability",
			dbName: "disability",
			uiColWidth: 120,
			format: "enum",
			role: "dimension",
			data: [
				{key: "dis_none", label: "No disabilities"},
				{key: "dis_group1", label: "Dis. group 1"},
				{key: "dis_group2", label: "Dis. group 2"},
			]
		},
		{
			uiName: "Global poverty line",
			jsName: "globalPovertyLine",
			dbName: "global_poverty_line",
			uiColWidth: 60,
			format: "enum",
			role: "dimension",
			data: [
				{key: "below", label: "Below"},
				{key: "above", label: "Above"},
			]
		},
		{
			uiName: "National poverty line",
			jsName: "nationalPovertyLine",
			dbName: "national_poverty_line",
			uiColWidth: 60,
			format: "enum",
			role: "dimension",
			data: [
				{key: "below", label: "Below"},
				{key: "above", label: "Above"},
			]
		},
	]
	for (const item of shared) {
		item.shared = true
	}
	return shared
}

export async function sharedDefs(): Promise<Def[]> {
	let hidden = await getHidden()
	let shared = sharedDefsAll()
	shared = shared.filter(d => !hidden.has(d.dbName))
	return shared
}

async function defsCustom(): Promise<Def[]> {
	const row = await dr.query.humanDsgConfigTable.findFirst()
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

export async function defsForTable(tbl: HumanEffectsTable): Promise<Def[]> {
	return [
		...await sharedDefs(),
		...await defsCustom(),
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
			})
			break
		case "Injured":
			res.push({
				uiName: "Injured",
				jsName: "injured",
				dbName: "injured",
				format: "number",
				role: "metric",
			})
			break
		case "Missing":
			res.push({
				uiName: "As of",
				jsName: "asOf",
				dbName: "as_of",
				format: "date",
				role: "dimension",
			})
			res.push({
				uiName: "Missing",
				jsName: "missing",
				dbName: "missing",
				format: "number",
				role: "metric",
			})
			break
		case "Affected":
			res.push(
				{
					uiName: "Directly Affected",
					jsName: "direct",
					dbName: "direct",
					format: "number",
					role: "metric",
				},
				{
					uiName: "Indirectly Affected",
					jsName: "indirect",
					dbName: "indirect",
					format: "number",
					role: "metric",
				}
			)
			break
		case "Displaced":
			res.push(
				{
					uiName: "Short Term",
					jsName: "short",
					dbName: "short",
					format: "number",
					role: "metric",
				},
				{
					uiName: "Medium Short Term",
					jsName: "mediumShort",
					dbName: "medium_short",
					format: "number",
					role: "metric",
				},
				{
					uiName: "Medium Long Term",
					jsName: "mediumLong",
					dbName: "medium_long",
					format: "number",
					role: "metric",
				},
				{
					uiName: "Long Term",
					jsName: "long",
					dbName: "long",
					format: "number",
					role: "metric",
				},
				{
					uiName: "Permanent",
					jsName: "permanent",
					dbName: "permanent",
					format: "number",
					role: "metric",
				}
			)
			break
		case "DisplacementStocks":
			res.push(
				{
					uiName: "Preemptive",
					jsName: "preemptive",
					dbName: "preemptive",
					format: "number",
					role: "metric",
				},
				{
					uiName: "Reactive",
					jsName: "reactive",
					dbName: "reactive",
					format: "number",
					role: "metric",
				}
			)
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
			return "displaced"
		case "DisplacementStocks":
			return "displacement_stocks"
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

export async function categoryPresenceGet(recordId: string, tblId: HumanEffectsTable, defs: Def[]): Promise<Record<string, boolean>> {
	let rows = await dr
		.select()
		.from(humanCategoryPresenceTable)
		.where(eq(humanCategoryPresenceTable.recordId, recordId))
	if (!rows.length) {
		return {}
	}
	let res: Record<string, boolean> = {}
	let row = rows[0]

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

export async function categoryPresenceSet(recordId: string, tblId: HumanEffectsTable, defs: Def[], data: Record<string, boolean>) {
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
	await dr.transaction(async (tx) => {
		let rows = await dr
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
