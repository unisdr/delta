import {
	measureCreate,
	measureUpdate,
	measureById,
	measureByIdTx,
	fieldsDef,
} from "~/backend.server/models/measure";

import {
	MeasureForm,
	route
} from "~/frontend/measure";

import {
	formScreen,
} from "~/frontend/form";

import {
	createLoader,
	createAction
} from "~/backend.server/handlers/form";
import {getTableName} from "drizzle-orm";
import {measureTable} from "~/drizzle/schema";
import {useLoaderData} from "@remix-run/react";

export const action = createAction({
	fieldsDef,
	create: measureCreate,
	update: measureUpdate,
	getById: measureByIdTx,
	redirectTo: (id) => `${route}/${id}`,
	tableName: getTableName(measureTable),
	action: (isCreate) =>
		isCreate ? "Create measure" : "Update measure",
});

export const loader = createLoader({
	getById: measureById,
	extra: async () => {
		return {fieldsDef}
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
		form: MeasureForm,
		edit: !!ld.item,
		id: ld.item?.id || null
	})
}


