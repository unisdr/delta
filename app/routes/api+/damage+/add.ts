import {
	authLoaderApi,
	authActionApi
} from "~/util/auth"

import {
	fieldsDefApi
} from "~/backend.server/models/damages"

import {
	jsonCreate,
} from "~/backend.server/handlers/form/form_api"
import { damagesCreate } from "~/backend.server/models/damages"
import { getCountrySettingsFromSession } from "~/util/session"

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST")
})

export const action = authActionApi(async (args) => {
	const data = await args.request.json()
	const currencies = await getCountrySettingsFromSession(args.request);

	const saveRes = await jsonCreate({
		data,
		fieldsDef: await fieldsDefApi(currencies),
		create: damagesCreate
	})

	return Response.json(saveRes)
})


