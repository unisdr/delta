import {
	authLoaderApi,
	authActionApi
} from "~/util/auth"

import {
	fieldsDefApi
} from "~/backend.server/models/disruption"

import {
	jsonCreate,
} from "~/backend.server/handlers/form"
import { disruptionCreate } from "~/backend.server/models/disruption"

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST")
})

export const action = authActionApi(async (args) => {
	const data = await args.request.json()

	const saveRes = await jsonCreate({
		data,
		fieldsDef: fieldsDefApi,
		create: disruptionCreate
	})

	return Response.json(saveRes)
})

