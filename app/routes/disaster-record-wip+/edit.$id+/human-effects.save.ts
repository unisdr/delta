import {dr} from "~/db.server";
import {PreviousUpdatesFromJson} from "~/frontend/editabletable/data";
import {defsForTable, HumanEffectsTable} from "~/frontend/human_effects/defs";
import {authActionWithPerm, authLoaderWithPerm} from "~/util/auth";
import {create, update, deleteRows, HEError} from "~/backend.server/models/human_effects"

export const loader = authLoaderWithPerm("EditData", async () => {
	return "use POST"
});

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


export const action = authActionWithPerm("EditData", async (actionArgs) => {
	const {params} = actionArgs
	let req = actionArgs.request
	let d
	try {
		d = await req.json() as Req
	} catch {
		return Response.json({ok: false, error: "Invalid JSON"}, {status: 400})
	}
	let recordId = params.id
	if (!recordId) {
		throw new Error("no record id")
	}
	try {
		await dr.transaction(async (tx) => {
			if (d.data.deletes) {
				let res = await deleteRows(tx, d.table, d.data.deletes)
				if (!res.ok) {
					throw res.error
				}
			}
			if (d.data.updates) {
				let defs = defsForTable(d.table)
				let data2 = convertUpdatesToIdsAndData(d.data.updates, defs.length)
				let res = await update(tx, d.table, defs, data2.ids, data2.data, false)
				if (!res.ok) {
					throw res.error
				}
			}
			if (d.data.newRows) {
				let defs = defsForTable(d.table)
				let data = Object.values(d.data.newRows)
				let res = await create(tx, d.table, recordId, defs, data, false)
				if (!res.ok) {
					throw res.error
				}
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
})

