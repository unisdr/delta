import {
	disruptionCreate,
	disruptionUpdate,
	disruptionById,
	disruptionByIdTx,
	fieldsDef,
	DisruptionViewModel,
	DisruptionFields
} from "~/backend.server/models/disruption"

import {
	DisruptionForm,
	route
} from "~/frontend/disruption"

import {
	FormInputDef,
	formScreen,
} from "~/frontend/form"

import {
	createAction
} from "~/backend.server/handlers/form"
import {getTableName} from "drizzle-orm"
import {disruptionTable} from "~/drizzle/schema"
import {authLoaderWithPerm} from "~/util/auth"
import {useLoaderData} from "@remix-run/react"

interface LoaderRes {
	item: DisruptionViewModel | null
	fieldDef: FormInputDef<DisruptionFields>[]
	recordId: string
	sectorId: string
}

export const loader = authLoaderWithPerm("EditData", async (loaderArgs) => {
	const {params, request} = loaderArgs
	if (!params.id) {
		throw new Error("Route does not have id param")
	}
	if (!params.disRecId) {
		throw new Error("Route does not have disRecId param")
	}
	if (params.id === "new") {
		let url = new URL(request.url)
		let sectorId = url.searchParams.get("sectorId") || ""
		if (!sectorId) {
			throw new Response("Not Found", {status: 404});
		}
		let res: LoaderRes = {
			item: null,
			fieldDef: fieldsDef,
			recordId: params.disRecId,
			sectorId: sectorId,
		}
		return res
	}
	const item = await disruptionById(params.id);
	if (!item) {
		throw new Response("Not Found", {status: 404});
	}
	let res: LoaderRes = {
		item: item,
		fieldDef: fieldsDef,
		recordId: item.recordId,
		sectorId: item.sectorId,
	}
	return res
});

export const action = createAction({
	fieldsDef: fieldsDef,
	create: disruptionCreate,
	update: disruptionUpdate,
	getById: disruptionByIdTx,
	redirectTo: (id) => `${route}/${id}`,
	tableName: getTableName(disruptionTable)
})

export default function Screen() {
	const ld = useLoaderData<typeof loader>();

	const fieldsInitial: Partial<DisruptionFields> = ld.item
		? {...ld.item}
		: {};

	fieldsInitial.recordId = ld.recordId
	fieldsInitial.sectorId = ld.sectorId

	if (!ld.fieldDef) {
		throw "invalid"
	}

	return formScreen({
		extraData: {
			fieldDef: ld.fieldDef
		},
		fieldsInitial,
		form: DisruptionForm,
		edit: !!ld.item,
		id: (ld.item as any)?.id || null,
	});
}


