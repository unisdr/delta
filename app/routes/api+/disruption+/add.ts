import {
	authLoaderApi,
	authActionApi
} from "~/util/auth"

import {
	getFieldsDefApi
} from "~/backend.server/models/disruption"

import {
	jsonCreate,
} from "~/backend.server/handlers/form/form_api"
import { disruptionCreate } from "~/backend.server/models/disruption"

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST")
})

export const action = authActionApi(async (args) => {
	const data = await args.request.json()

	const saveRes = await jsonCreate({
		data,
		fieldsDef: getFieldsDefApi(),
		create: disruptionCreate
	})

	return Response.json(saveRes)
})

