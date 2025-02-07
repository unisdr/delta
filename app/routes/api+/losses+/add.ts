import {
	authLoaderApi,
	authActionApi
} from "~/util/auth"

import {
	fieldsDefApi
} from "~/backend.server/models/losses"

import {
	jsonCreate,
} from "~/backend.server/handlers/form"
import { lossesCreate } from "~/backend.server/models/losses"

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST")
})

export const action = authActionApi(async (args) => {
	const data = await args.request.json()

	const saveRes = await jsonCreate({
		data,
		fieldsDef: fieldsDefApi,
		create: lossesCreate
	})

	return Response.json(saveRes)
})

