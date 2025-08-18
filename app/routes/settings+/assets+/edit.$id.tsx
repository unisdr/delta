import {
	assetCreate,
	assetUpdate,
	assetById,
	assetByIdTx,
	fieldsDef,
} from "~/backend.server/models/asset";

import { AssetForm, route } from "~/frontend/asset";

import { formScreen } from "~/frontend/form";

import { createOrUpdateAction } from "~/backend.server/handlers/form/form";
import { getTableName } from "drizzle-orm";
import { assetTable } from "~/drizzle/schema";
import { useLoaderData } from "@remix-run/react";
import { authLoaderWithPerm } from "~/util/auth";

import { dr } from "~/db.server";
import { contentPickerConfigSector } from "~/frontend/asset-content-picker-config";
import { ActionFunctionArgs } from "@remix-run/server-runtime";
import { getCountryAccountsIdFromSession } from "~/util/session";

export const action = async (args: ActionFunctionArgs) => {
	const { request } = args;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	if(!countryAccountsId){
		throw new Response("Unauthorized access", {status:401});
	}

	return createOrUpdateAction(
		{
			fieldsDef: fieldsDef,
			create: assetCreate,
			update: assetUpdate,
			getById: assetByIdTx,
			redirectTo: (id) => `${route}/${id}`,
			tableName: getTableName(assetTable),
			action: (isCreate) => (isCreate ? "Create asset" : "Update asset"),
			countryAccountsId
		},
	)(args);
};

export const loader = authLoaderWithPerm("EditData", async (args) => {
	const { request, params } = args;
	if (!params.id) throw new Error("Missing id param");
	const countryAccountsId = await getCountryAccountsIdFromSession(request)
	if(!countryAccountsId){
		throw new Response ("Unauthorized access", {status:401});
	}
	let url = new URL(request.url);
	let sectorId = url.searchParams.get("sectorId") || null;
	let extra = {
		fieldsDef: await fieldsDef(),
		sectorId,
	};
	if (params.id === "new") return { item: null, ...extra };
	let item = await assetById(params.id);
	if (!item) throw new Response("Not Found", { status: 404 });
	if(item.countryAccountsId!== countryAccountsId){
		throw new Response ("Unauthorized access", {status:401});
	}

	const selectedDisplay = await contentPickerConfigSector.selectedDisplay(
		dr,
		item.sectorIds || ""
	);

	extra = { ...extra, selectedDisplay } as any;
	return { item, ...extra };
});

export default function Screen() {
	let ld: any = useLoaderData<typeof loader>();
	let fieldsInitial = ld.item ? { ...ld.item } : {};
	if ("sectorId" in fieldsInitial && !fieldsInitial.sectorId && ld.sectorId) {
		fieldsInitial.sectorId = ld.sectorId;
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
		id: ld.item?.id || null,
	});
}
