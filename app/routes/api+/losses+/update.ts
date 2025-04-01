import {
	authLoaderApi,
	authActionApi
} from "~/util/auth"

import {
	fieldsDefApi
} from "~/backend.server/models/losses"

import {
	jsonUpdate,
} from "~/backend.server/handlers/form/form_api"
import {lossesUpdate} from "~/backend.server/models/losses"

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST")
})

export const action = authActionApi(async (args) => {
	const data = await args.request.json()

	const saveRes = await jsonUpdate({
		data,
		fieldsDef: fieldsDefApi,
		update: lossesUpdate
	})

	return Response.json(saveRes)
})

