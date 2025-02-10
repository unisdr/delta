import {
	assetCreate,
	assetUpdate,
	assetById,
	assetByIdTx,
	fieldsDef,
} from "~/backend.server/models/asset";

import {
	AssetForm,
	route
} from "~/frontend/asset";

import {
	formScreen,
} from "~/frontend/form";

import {
	createLoader,
	createAction
} from "~/backend.server/handlers/form";
import {getTableName} from "drizzle-orm";
import {assetTable} from "~/drizzle/schema";
import {useLoaderData} from "@remix-run/react";

export let action = createAction({
	fieldsDef,
	create: assetCreate,
	update: assetUpdate,
	getById: assetByIdTx,
	redirectTo: (id) => `${route}/${id}`,
	tableName: getTableName(assetTable),
	action: (isCreate) =>
		isCreate ? "Create asset" : "Update asset",
});

export let loader = createLoader({
	getById: assetById,
	extra: async () => {
		return {
			fieldsDef: await fieldsDef(),
		}
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
		form: AssetForm,
		edit: !!ld.item,
		id: ld.item?.id || null
	})
}


