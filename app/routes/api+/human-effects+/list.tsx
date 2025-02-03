import {
	authLoaderApi
} from "~/util/auth";

import {loadData} from "~/backend.server/handlers/human_effects"

export const loader = authLoaderApi(async (actionArgs) => {
	const {request} = actionArgs
	let url = new URL(request.url)
	let recordId = url.searchParams.get("recordId") || ""
	let tblStr = url.searchParams.get("table") || ""

	let res = await loadData(recordId, tblStr)
	return Response.json(res)
});

