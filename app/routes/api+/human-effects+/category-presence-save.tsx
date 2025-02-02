import {authLoaderApi} from "~/util/auth";
import {HumanEffectsTableFromString, HumanEffectsTable} from "~/frontend/human_effects/defs";

import {
	authActionApi
} from "~/util/auth";
import {defsForTable, categoryPresenceSet} from "~/backend.server/models/human_effects";

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST");
});

interface Req {
	table: string
	data: Record<string, boolean>
}

export const action = authActionApi(async (actionArgs) => {
	const {request} = actionArgs
	let url = new URL(request.url)
	let recordId = url.searchParams.get("recordId") || ""

	let d
	try {
		d = await request.json() as Req
	} catch {
		return Response.json({ok: false, error: "Invalid JSON"}, {
			status: 400
		})
	}
	let tblId: HumanEffectsTable | null = null
	try {
		tblId = HumanEffectsTableFromString(d.table)
	} catch (e) {
		return Response.json({ok: false, error: String(e)})
	}
	let defs = await defsForTable(tblId)
	await categoryPresenceSet(recordId, tblId, defs, d.data)
	return {ok: true}
})

