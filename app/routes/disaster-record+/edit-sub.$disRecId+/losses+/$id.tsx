import {
	lossesById,
} from "~/backend.server/models/losses"

import {
	LossesView,
} from "~/frontend/losses"

import {useLoaderData} from "@remix-run/react"
import {authLoaderWithPerm} from "~/util/auth"
import {getItem1} from "~/backend.server/handlers/view"

import {
	fieldsDefView
} from "~/backend.server/models/losses"
import { getCountrySettingsFromSession,  } from "~/util/session"

export const loader = authLoaderWithPerm("ViewData", async (loaderArgs) => {
	const {params, request} = loaderArgs
	const settings = await getCountrySettingsFromSession(request)
	let currencies = [""]
	if (settings) {
		currencies = [settings.currencyCode];
	}
	const item = await getItem1(params, lossesById)
	if (!item) {
		throw new Response("Not Found", {status: 404})
	}
	return {item, fieldDef: await fieldsDefView(currencies)}
})

export default function Screen() {
	const ld = useLoaderData<typeof loader>()
	if (!ld.item) {
		throw "invalid"
	}
	return <LossesView fieldDef={ld.fieldDef} item={ld.item} />
}




