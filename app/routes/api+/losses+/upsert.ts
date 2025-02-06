import {
	authLoaderApi,
	authActionApi
} from "~/util/auth"

import {
	fieldsDefApi
} from "~/backend.server/models/losses"

import {
	jsonUpsert,
} from "~/backend.server/handlers/form"

import {
	lossesCreate,
	lossesUpdate,
	lossesIdByImportId
} from "~/backend.server/models/losses"

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST")
})

export const action = authActionApi(async (args) => {
	const data = await args.request.json()
	const saveRes = await jsonUpsert({
		data,
		fieldsDef: fieldsDefApi,
		create: lossesCreate,
		update: lossesUpdate,
		idByImportId: lossesIdByImportId,
	})

	return Response.json(saveRes)
})

