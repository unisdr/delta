import { assetById, fieldsDefView } from "~/backend.server/models/asset";

import { AssetView } from "~/frontend/asset";

import { createViewLoader } from "~/backend.server/handlers/form/form";

import { ViewScreenWithDef } from "~/frontend/form";

import { ActionFunctionArgs } from "@remix-run/server-runtime";
import { dr } from "~/db.server";
import { contentPickerConfigSector } from "~/frontend/asset-content-picker-config";
import { getCountryAccountsIdFromSession } from "~/util/session";

export const loader = async (args: ActionFunctionArgs) => {
	const { request } = args;

	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	if (!countryAccountsId) {
		throw new Response("Unauthorized access", { status: 401 });
	}

	const result = createViewLoader({
		getById: assetById,
		extra: async (item) => {
			const selectedDisplay = await contentPickerConfigSector.selectedDisplay(
				dr,
				item?.sectorIds || ""
			);
			return { def: await fieldsDefView(), extraData: { selectedDisplay } };
		},
	})(args);
	if ((await result).item.countryAccountsId !== countryAccountsId) {
		throw new Response("Unauthorized access", { status: 401 });
	}
	return result;
};

export default function Screen() {
	return ViewScreenWithDef({
		viewComponent: AssetView,
	});
}
