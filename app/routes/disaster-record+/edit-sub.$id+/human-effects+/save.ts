import {authActionWithPerm, authLoaderWithPerm} from "~/util/auth";
import {saveData} from "~/backend.server/handlers/human_effects";

export const loader = authLoaderWithPerm("EditData", async () => {
	return "use POST"
});


export const action = authActionWithPerm("EditData", async (actionArgs) => {
	const {params} = actionArgs
	let req = actionArgs.request 
	let recordId = params.id || ""
	return await saveData(req, recordId)
})

