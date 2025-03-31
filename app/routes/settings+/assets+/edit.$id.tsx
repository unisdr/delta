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
	createAction
} from "~/backend.server/handlers/form/form";
import {getTableName} from "drizzle-orm";
import {assetTable} from "~/drizzle/schema";
import {useLoaderData} from "@remix-run/react";
import {authLoaderWithPerm} from "~/util/auth";

import { dr } from "~/db.server"; // Drizzle ORM instance
import { contentPickerConfigSector } from "~/frontend/asset-content-picker-config";

export let action = createAction({
	fieldsDef: fieldsDef,
	create: assetCreate,
	update: assetUpdate,
	getById: assetByIdTx,
	redirectTo: (id) => `${route}/${id}`,
	tableName: getTableName(assetTable),
	action: (isCreate) =>
		isCreate ? "Create asset" : "Update asset",
});

export let loader = authLoaderWithPerm("EditData", async (args) => {
	let p = args.params
	if (!p.id) throw new Error("Missing id param")
	let url = new URL(args.request.url)
	let sectorId = url.searchParams.get("sectorId") || ""
	let extra = {
		fieldsDef: await fieldsDef(),
		sectorId,
	}
	if (p.id === "new") return {item: null, ...extra}
	let it = await assetById(p.id)
	if (!it) throw new Response("Not Found", {status: 404})

	const selectedDisplay = await contentPickerConfigSector.selectedDisplay(dr, it.sectorIds || "");	
	
	extra = {...extra, selectedDisplay} as any;
	//console.log('authLoaderWithPerm: ', {item: it, ...extra});
	return {item: it, ...extra}
})

export default function Screen() {
	let ld: any = useLoaderData<typeof loader>() 
	let fieldsInitial = ld.item ? {...ld.item} : {}
	if ('sectorId' in fieldsInitial && !fieldsInitial.sectorId && ld.sectorId) {
		fieldsInitial.sectorId = ld.sectorId
	}

	const selectedDisplay = ld?.selectedDisplay || {};

	return formScreen({
		extraData: {
			fieldDef: ld.fieldsDef,
			selectedDisplay,
		},
		fieldsInitial,
		form: AssetForm,
		edit: !!ld.item,
		id: ld.item?.id || null
	})
}


