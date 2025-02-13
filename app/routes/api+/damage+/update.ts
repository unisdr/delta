import {
	authLoaderApi,
	authActionApi
} from "~/util/auth"

import {
	fieldsDefApi
} from "~/backend.server/models/damages"

import {
	jsonUpdate,
} from "~/backend.server/handlers/form"
import {damagesUpdate} from "~/backend.server/models/damages"

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST")
})

export const action = authActionApi(async (args) => {
	const data = await args.request.json()

	const saveRes = await jsonUpdate({
		data,
		fieldsDef: await fieldsDefApi(),
		update: damagesUpdate
	})

	return Response.json(saveRes)
})

