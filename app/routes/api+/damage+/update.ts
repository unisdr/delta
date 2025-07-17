import {
	authLoaderApi,
	authActionApi
} from "~/util/auth"

import {
	fieldsDefApi
} from "~/backend.server/models/damages"

import {
	jsonUpdate,
} from "~/backend.server/handlers/form/form_api"
import {damagesUpdate} from "~/backend.server/models/damages"
import { getCountrySettingsFromSession } from "~/util/session"

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST")
})

export const action = authActionApi(async (args) => {
	const data = await args.request.json()
	const settings = await getCountrySettingsFromSession(args.request);


	const saveRes = await jsonUpdate({
		data,
		fieldsDef: await fieldsDefApi([settings.currencyCode]),
		update: damagesUpdate
	})

	return Response.json(saveRes)
})

