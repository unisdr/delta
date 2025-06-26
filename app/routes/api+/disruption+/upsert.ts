import {
	authLoaderApi,
	authActionApi
} from "~/util/auth"

import {
	getFieldsDefApi
} from "~/backend.server/models/disruption"


import {
	jsonUpsert,
} from "~/backend.server/handlers/form/form_api"

import {
	disruptionCreate,
	disruptionUpdate,
	disruptionIdByImportId
} from "~/backend.server/models/disruption"

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST")
})

export const action = authActionApi(async (args) => {
	const data = await args.request.json()
	const saveRes = await jsonUpsert({
		data,
		fieldsDef: await getFieldsDefApi(),
		create: disruptionCreate,
		update: disruptionUpdate,
		idByImportId: disruptionIdByImportId,
	})

	return Response.json(saveRes)
})

