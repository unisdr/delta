import {dr} from "~/db.server";
import {HumanEffectsTableFromString, HumanEffectTablesDefs} from "~/frontend/human_effects/defs";
import {
	get,
	GetRes,
	categoryPresenceGet
} from '~/backend.server/models/human_effects'
import {PreviousUpdatesFromJson} from "~/frontend/editabletable/data";
import {HumanEffectsTable} from "~/frontend/human_effects/defs";
import {create, update, deleteRows, HEError, validate, defsForTable, clearData} from "~/backend.server/models/human_effects"


export async function loadData(recordId: string | undefined, tblStr: string) {
	if (!recordId) {
		throw new Error("no record id")
	}
	let tblId: HumanEffectsTable
	if (!tblStr) {
		tblId = "Deaths"
	} else {
		tblId = HumanEffectsTableFromString(tblStr)
	}
	const defs = await defsForTable(tblId)
	let res: GetRes | null = null
	await dr.transaction(async (tx) => {
		res = await get(tx, tblId, recordId, defs)
	})
	res = res!
	if (!res.ok) {
		throw res.error
	}
	let categoryPresence = await categoryPresenceGet(recordId, tblId, defs)
	return {
		tblId: tblId,
		tbl: HumanEffectTablesDefs.find(t => t.id == tblId)!,
		recordId,
		defs: defs,
		ids: res.ids,
		data: res.data,
		categoryPresence
	}
}

interface Req {
	table: HumanEffectsTable
	data: PreviousUpdatesFromJson
}

function convertUpdatesToIdsAndData(
	updates: Record<string, Record<number, any>>,
	cols: number
): {ids: string[]; data: any[][]} {
	let ids: string[] = []
	let data: any[][] = []
	if (updates) {
		for (let id in updates) {
			ids.push(id)
			let row = Array(cols).fill(undefined)
			for (let colIndex in updates[id]) {
				row[colIndex] = updates[id][colIndex]
			}
			data.push(row)
		}
	}
	return {ids, data}
}

export async function saveData(req: Request, recordId: string) {
	let d: Req
	try {
		d = await req.json() as Req
	} catch {
		return Response.json({ok: false, error: "Invalid JSON"}, {status: 400})
	}
	if (!recordId) {
		throw new Error("no record id")
	}
	try {
		let defs = await defsForTable(d.table)
		await dr.transaction(async (tx) => {
			if (d.data.deletes) {
				let res = await deleteRows(tx, d.table, d.data.deletes)
				if (!res.ok) {
					throw res.error
				}
			}
			if (d.data.updates) {
				let data2 = convertUpdatesToIdsAndData(d.data.updates, defs.length)
				let res = await update(tx, d.table, defs, data2.ids, data2.data, false)
				if (!res.ok) {
					throw res.error
				}
			}
			let idMap = new Map<string, string>()
			if (d.data.newRows) {
				let ids: string[] = []
				let data: any[][] = []
				for (let [id, row] of Object.entries(d.data.newRows)) {
					ids.push(id)
					data.push(row)
				}
				let res = await create(tx, d.table, recordId, defs, [], data, false)
				if (!res.ok) {
					if (res.error) {
						throw res.error
					} else {
						throw new Error("unknown create error")
					}
				} else {
					for (let [i, id] of res.ids.entries()) {
						idMap.set(id, ids[i])
					}
				}
			}
			let res = await validate(tx, d.table, recordId, defs)
			if (!res.ok) {
				if (res.error) {
					throw res.error
				} else if (res.errors) {
					for (let e of res.errors) {
						let idTemp = idMap.get(e.rowId)
						if (idTemp) {
							e.rowId = idTemp
						}
					}
					throw res.errors
				} else {
					throw new Error("unknown validate error")
				}
			}
		})
	} catch (e) {
		if (Array.isArray(e)) {
			return Response.json({ok: false, errors: e})
		} else if (e instanceof HEError) {
			return Response.json({ok: false, error: e})
		} else {
			throw e
		}
	}
	return Response.json({ok: true})
}

export async function clear(tableIdStr: string, recordId: string) {
	if (!recordId) {
		throw new Error("no record id")
	}
	let table: HumanEffectsTable|null = null
	try {
		table = HumanEffectsTableFromString(tableIdStr)
	} catch (e) {
		return Response.json({ok: false, error: String(e)})
	}
	try {
		await dr.transaction(async (tx) => {
			let res = await clearData(tx, table!, recordId)
			if (!res.ok) {
				throw res.error
			}
		})
	} catch (e) {
		if (e instanceof HEError) {
			return Response.json({ok: false, error: e})
		} else {
			throw e
		}
	}
	return Response.json({ok: true})
}
