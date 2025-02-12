import {
	unitCreate,
	unitUpdate,
	unitById,
	unitByIdTx,
	fieldsDef,
} from "~/backend.server/models/unit";

import {
	UnitForm,
	route
} from "~/frontend/unit";

import {
	formScreen,
} from "~/frontend/form";

import {
	createLoader,
	createAction
} from "~/backend.server/handlers/form";
import {getTableName} from "drizzle-orm";
import {unitTable} from "~/drizzle/schema";
import {useLoaderData} from "@remix-run/react";

export let action = createAction({
	fieldsDef,
	create: unitCreate,
	update: unitUpdate,
	getById: unitByIdTx,
	redirectTo: (id) => `${route}/${id}`,
	tableName: getTableName(unitTable),
	action: (isCreate) =>
		isCreate ? "Create unit" : "Update unit",
});

export let loader = createLoader({
	getById: unitById,
	extra: async () => {
		return {fieldsDef: await fieldsDef()}
	}
})

export default function Screen() {
	let ld = useLoaderData<typeof loader>()
	let fieldsInitial = ld.item ? {...ld.item} : {}

	return formScreen({
		extraData: {
			fieldDef: ld.fieldsDef
		},
		fieldsInitial,
		form: UnitForm,
		edit: !!ld.item,
		id: ld.item?.id || null
	})
}
