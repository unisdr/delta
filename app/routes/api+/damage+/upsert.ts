import {
	authLoaderApi,
	authActionApi
} from "~/util/auth"

import {
	fieldsDefApi
} from "~/backend.server/models/damages"

import {
	jsonUpsert,
} from "~/backend.server/handlers/form"

import {
	damagesCreate,
	damagesUpdate,
	damagesIdByImportId
} from "~/backend.server/models/damages"

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST")
})

export const action = authActionApi(async (args) => {
	const data = await args.request.json()
	const saveRes = await jsonUpsert({
		data,
		fieldsDef: fieldsDefApi,
		create: damagesCreate,
		update: damagesUpdate,
		idByImportId: damagesIdByImportId,
	})

	return Response.json(saveRes)
})

