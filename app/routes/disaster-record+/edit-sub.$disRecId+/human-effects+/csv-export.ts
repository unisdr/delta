import {
	authLoaderWithPerm
} from "~/util/auth";

import {loadData} from "~/backend.server/handlers/human_effects"
import {stringifyCSV} from "~/util/csv";

export const loader = authLoaderWithPerm("EditData", async (actionArgs) => {
	const {params, request} = actionArgs
	let recordId = params.disRecId
	let url = new URL(request.url)
	let tblStr = url.searchParams.get("table") || ""
	let res = await loadData(recordId, tblStr)
	let all = [
		res.defs.map((d) => d.jsName),
		...res.data.map((row) => row),
	]
	let csv = await stringifyCSV(all)
	return new Response(csv, {
		status: 200,
		headers: {
			"Content-Type": "text/csv",
			"Content-Disposition": `attachment; filename="${res.tblId}.csv"`
		}
	})

});
