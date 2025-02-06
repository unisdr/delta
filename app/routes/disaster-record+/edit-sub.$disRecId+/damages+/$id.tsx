import {
	damagesById,
} from "~/backend.server/models/damages"

import {
	DamagesView,
} from "~/frontend/damages"

import {useLoaderData} from "@remix-run/react"
import {authLoaderWithPerm} from "~/util/auth"
import {getItem2} from "~/backend.server/handlers/view"

import {
	fieldsDefView
} from "~/backend.server/models/damages"

export const loader = authLoaderWithPerm("ViewData", async (loaderArgs) => {
	const {params} = loaderArgs
	const item = await getItem2(params, damagesById)
	if (!item) {
		throw new Response("Not Found", {status: 404})
	}
	return {item, fieldDef: fieldsDefView}
})

export default function Screen() {
	const ld = useLoaderData<typeof loader>()
	if (!ld.item) {
		throw "invalid"
	}
	return <DamagesView fieldDef={ld.fieldDef} item={ld.item} />
}



