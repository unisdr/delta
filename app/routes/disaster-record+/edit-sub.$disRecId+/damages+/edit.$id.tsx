import {
	damagesCreate,
	damagesUpdate,
	damagesById,
	damagesByIdTx,
	fieldsDef,
	DamagesViewModel,
	DamagesFields
} from "~/backend.server/models/damages"

import {
	DamagesForm,
	route
} from "~/frontend/damages"

import {
	FormInputDef,
	formScreen,
} from "~/frontend/form"

import {
	createAction
} from "~/backend.server/handlers/form"
import {getTableName} from "drizzle-orm"
import {damagesTable} from "~/drizzle/schema"
import {authLoaderWithPerm} from "~/util/auth"
import {useLoaderData} from "@remix-run/react"

interface LoaderRes {
	item: DamagesViewModel | null
	fieldDef: FormInputDef<DamagesFields>[]
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
	const item = await damagesById(params.id);
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
	create: damagesCreate,
	update: damagesUpdate,
	getById: damagesByIdTx,
	redirectTo: (id) => `${route}/${id}`,
	tableName: getTableName(damagesTable)
})

export default function Screen() {
	const ld = useLoaderData<typeof loader>();

	const fieldsInitial: Partial<DamagesFields> = ld.item
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
		form: DamagesForm,
		edit: !!ld.item,
		id: (ld.item as any)?.id || null,
	});
}

