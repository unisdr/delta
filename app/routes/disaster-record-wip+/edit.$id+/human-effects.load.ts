import {dr} from "~/db.server";
import {defsForTable, HumanEffectsTable} from "~/frontend/human_effects/defs";
import {
	authLoaderWithPerm
} from "~/util/auth";
import {
	get,
	GetRes
} from '~/backend.server/models/human_effects'

export const loader = authLoaderWithPerm("ViewData", async (actionArgs) => {
	const {params, request} = actionArgs
	let recordId = params.id
	if (!recordId) {
		throw new Error("no record id")
	}
	let url = new URL(request.url)
	let tblStr = url.searchParams.get("tbl")
	let tbl: HumanEffectsTable
	if (tblStr === "Deaths" || tblStr === "Injured" || tblStr === "Missing" || tblStr === "Affected" || tblStr === "Displaced" || tblStr === "DisplacementStocks") {
		tbl = tblStr
	} else {
		throw new Error("unknown table")
	}
	const defs = defsForTable(tbl)
	let res: GetRes | null = null
	await dr.transaction(async (tx) => {
		res = await get(tx, tbl, recordId, defs)
	})
	res = res!
	if (!res.ok) {
		throw new Error(res.error)
	}
	return Response.json({
		tbl: tbl,
		defs: defs,
		ids: res.ids,
		data: res.data
	})
});
