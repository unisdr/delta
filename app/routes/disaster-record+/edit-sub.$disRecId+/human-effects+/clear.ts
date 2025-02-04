import {authActionWithPerm, authLoaderWithPerm} from "~/util/auth";
import {clear} from "~/backend.server/handlers/human_effects"

export const loader = authLoaderWithPerm("EditData", async () => {
	return "use POST"
});

export const action = authActionWithPerm("EditData", async (actionArgs) => {
	const {params, request} = actionArgs
	let url = new URL(request.url)
	let recordId = params.disRecId || ""
	let table = url.searchParams.get("table") || ""
	return await clear(table, recordId)
})

