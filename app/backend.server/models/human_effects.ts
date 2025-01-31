import {Tx} from "~/db.server"

import {
	sql
} from "drizzle-orm"

import {insertRow, updateRow, deleteRow} from "~/util/db"
import {injuredTable, humanDsgTable, deathsTable, missingTable, affectedTable, displacedTable, displacementStocksTable} from "~/drizzle/schema"

import {Def, DefEnum} from "~/frontend/editabletable/defs"

import {HumanEffectsTable} from "~/frontend/human_effects/defs"

export class HEError extends Error {
	code: string
	constructor(code: string, message: string) {
		super(message)
		this.code = code
	}
	toJSON() {
		return {
			code: this.code,
			message: this.message,
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
	defs: {shared: Def[]; notShared: Def[]}
	splitRow: (data: any[]) => {shared: any[]; notShared: any[]}
}

function splitDefsByShared(defs: Def[]): SplitRes {
	let shared: Def[] = []
	let notShared: Def[] = []
	let sharedIdx: number[] = []
	let notSharedIdx: number[] = []

	for (let i = 0; i < defs.length; i++) {
		if (defs[i].shared) {
			shared.push(defs[i])
			sharedIdx.push(i)
		} else {
			notShared.push(defs[i])
			notSharedIdx.push(i)
		}
	}

	const splitRow = (data: any[]) => ({
		shared: sharedIdx.map((i) => data[i]),
		notShared: notSharedIdx.map((i) => data[i]),
	})

	return {defs: {shared, notShared}, splitRow}
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
		// null is always allowed
		if (value === null) {
			res.push(null)
			continue
		}
		switch (def.type) {
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
			default:
				throw `Unknown def type`
		}
	}

	return {ok: true, res}
}


export async function create(
	tx: Tx,
	tblId: HumanEffectsTable,
	recordId: string,
	defs: Def[],
	data: any[][],
	dataStrings: boolean
): Promise<Res> {
	let spl = splitDefsByShared(defs)
	let tbl = tableFromType(tblId)
	let ids: string[] = []

	for (let row of data) {
		let res = validateRow(defs, row, dataStrings, false)
		if (!res.ok) {
			return res
		}
		let dataSpl = spl.splitRow(res.res)
		let dsgId: string = ""
		{
			let cols = ["record_id", ...spl.defs.shared.map((c) => c.dbName)]
			let vals = [recordId, ...dataSpl.shared]
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

		let dsgIdRes = await tx.execute(sql`SELECT dsg_id FROM ${tbl} WHERE id = ${id}`)
		let dsgId = dsgIdRes.rows[0]?.dsg_id
		if (!dsgId) {
			return {ok: false, error: new HEError("other", `Record not found for id: ${id}`)}
		}
		{
			let cols = spl.defs.shared.map((c) => c.dbName)
			let vals = dataSpl.shared
			await updateRow(tx, humanDsgTable, cols, vals, dsgId)
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

export type GetRes =
	| {ok: true, defs: Def[], ids: string[], data: any[][]}
	| {ok: false, error: string}

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
		SELECT ${tbl.id}, ${sql.join(cols, sql`, `)}
		FROM ${humanDsgTable}
		INNER JOIN ${tbl} ON ${humanDsgTable.id} = ${tbl.dsgId}
		WHERE ${humanDsgTable.recordId} = ${recordId}
	`

	let res = await tx.execute(query)
	let combined = res.rows.map((row: any) => ({
		id: row.id as string,
		data: defs.map(def => row[def.dbName]),
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

