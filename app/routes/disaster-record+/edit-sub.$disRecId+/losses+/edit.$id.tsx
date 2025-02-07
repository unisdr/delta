import {
	lossesCreate,
	lossesUpdate,
	lossesById,
	lossesByIdTx,
	fieldsDef,
	LossesViewModel,
	LossesFields
} from "~/backend.server/models/losses"

import {
	LossesForm,
	route
} from "~/frontend/losses"

import {
	FormInputDef,
	formScreen,
} from "~/frontend/form"

import {
	createAction
} from "~/backend.server/handlers/form"
import {getTableName} from "drizzle-orm"
import {lossesTable} from "~/drizzle/schema"
import {authLoaderWithPerm} from "~/util/auth"
import {useLoaderData} from "@remix-run/react"

interface LoaderRes {
	item: LossesViewModel | null
	fieldDef: FormInputDef<LossesFields>[]
	recordId: string
	sectorId: number
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
		let sectorId = Number(url.searchParams.get("sectorId")) || 0
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
	const item = await lossesById(params.id);
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
	create: lossesCreate,
	update: lossesUpdate,
	getById: lossesByIdTx,
	redirectTo: (id) => `${route}/${id}`,
	tableName: getTableName(lossesTable)
})

export default function Screen() {
	const ld = useLoaderData<typeof loader>();

	const fieldsInitial: Partial<LossesFields> = ld.item
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
		form: LossesForm,
		edit: !!ld.item,
		id: (ld.item as any)?.id || null,
	});
}

