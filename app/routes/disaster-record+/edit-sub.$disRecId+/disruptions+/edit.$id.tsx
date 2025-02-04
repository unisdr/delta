import {
	disruptionCreate,
	disruptionUpdate,
	disruptionById,
	disruptionByIdTx,
	fieldsDef
} from "~/backend.server/models/disruption"

import {
	DisruptionForm,
	route
} from "~/frontend/disruption"

import {
	formScreen,
} from "~/frontend/form"

import {
	createAction
} from "~/backend.server/handlers/form"
import {getTableName} from "drizzle-orm"
import {disruptionTable} from "~/drizzle/schema"
import {authLoaderWithPerm} from "~/util/auth"
import {useLoaderData} from "@remix-run/react"


export const loader = authLoaderWithPerm("EditData", async (loaderArgs) => {
	const {params} = loaderArgs;
	if (!params.id) {
		throw "Route does not have $id param";
	}
	if (params.id === "new") {
		return {item: null, fieldDef: fieldsDef};
	}
	const item = await disruptionById(params.id);
	if (!item) {
		throw new Response("Not Found", {status: 404});
	}

	return {item, fieldDef: fieldsDef};
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

	const fieldsInitial = ld.item
		? {...ld.item}
		: {};

	if (!ld.fieldDef){
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


