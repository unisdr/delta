import {
	devExample1Create,
	devExample1Update,
	devExample1ById,
	devExample1ByIdTx,
	fieldsDef,
} from "~/backend.server/models/dev_example1";

import {
	DevExample1Form,
	route
} from "~/frontend/dev_example1";

import {
	formScreen,
} from "~/frontend/form";

import {
	createLoader,
	createAction
} from "~/backend.server/handlers/form";
import {getTableName} from "drizzle-orm";
import {devExample1Table} from "~/drizzle/schema";
import {useLoaderData} from "@remix-run/react";


export const action = createAction({
	fieldsDef,
	create: devExample1Create,
	update: devExample1Update,
	getById: devExample1ByIdTx,
	redirectTo: (id) => `${route}/${id}`,
	tableName: getTableName(devExample1Table),
	action: (isCreate) =>
		isCreate ? "Create dev-example1" : "Update dev-example1",
});

export const loader = createLoader({
  getById: devExample1ById,
  extra: { fieldsDef }
})

export default function Screen() {
	let ld = useLoaderData<typeof loader>()
	let fieldsInitial = ld.item ? { ...ld.item } : {}

	return formScreen({
		extraData: {
			fieldDef: ld.fieldsDef
		},
		fieldsInitial,
		form: DevExample1Form,
		edit: !!ld.item,
		id: ld.item?.id || null
	})
}

