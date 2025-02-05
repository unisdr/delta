import {
	authLoaderApi,
	authActionApi
} from "~/util/auth"

import {
	fieldsDefApi
} from "~/backend.server/models/disruption"


import {
	jsonUpdate,
} from "~/backend.server/handlers/form"
import {disruptionUpdate} from "~/backend.server/models/disruption"

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST")
})

export const action = authActionApi(async (args) => {
	const data = await args.request.json()

	const saveRes = await jsonUpdate({
		data,
		fieldsDef: fieldsDefApi,
		update: disruptionUpdate
	})

	return Response.json(saveRes)
})

