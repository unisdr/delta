import {authActionWithPerm, authLoaderWithPerm} from "~/util/auth";
import {deleteAllData} from "~/backend.server/handlers/human_effects"

export const loader = authLoaderWithPerm("EditData", async () => {
	return "use POST"
});

export const action = authActionWithPerm("EditData", async (actionArgs) => {
	const {params} = actionArgs
	let recordId = params.disRecId || ""
	return await deleteAllData(recordId)
})

