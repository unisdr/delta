import {authLoaderApi} from "~/util/auth";
import {saveData} from "~/backend.server/handlers/human_effects";

import {
	authActionApi
} from "~/util/auth";

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST");
});

export const action = authActionApi(async (actionArgs) => {
	const {request} = actionArgs
	let url = new URL(request.url)
	let recordId = url.searchParams.get("recordId") || ""
	return await saveData(request, recordId)
})

