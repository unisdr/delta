import {
	authLoaderWithPerm
} from "~/util/auth";

import {loadData} from "~/backend.server/handlers/human_effects"

export const loader = authLoaderWithPerm("EditData", async (actionArgs) => {
	const {params, request} = actionArgs
	let recordId = params.disRecId
	let url = new URL(request.url)
	let tblStr = url.searchParams.get("tbl") || ""
	let res = await loadData(recordId, tblStr)
	return Response.json(res)
});
