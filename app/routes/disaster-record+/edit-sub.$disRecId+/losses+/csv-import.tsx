import { authLoaderWithPerm } from "~/util/auth";

import {
	lossesCreate,
	lossesUpdate,
	lossesIdByImportId,
	createFieldsDefApi,
} from "~/backend.server/models/losses";

import { createAction } from "~/backend.server/handlers/form/csv_import";

import { createScreen } from "~/frontend/csv_import";
import { ActionFunctionArgs } from "@remix-run/server-runtime";
import { getCountrySettingsFromSession } from "~/util/session";

export const loader = authLoaderWithPerm("EditData", async () => {
	return null;
});

export const action = async (actionArgs: ActionFunctionArgs) => {
	const { request } = actionArgs;
	return createAction({
		fieldsDef: async () => {
			const settings = await getCountrySettingsFromSession(request);
			const currencies = settings.currencyCode
				? [settings.currencyCode]
				: ["USD"];
			return await createFieldsDefApi(currencies);
		},
		create: lossesCreate,
		update: lossesUpdate,
		idByImportId: lossesIdByImportId,
	});
};

export default createScreen({
	title: "Losses",
	apiBaseUrl: "/api/losses",
	listUrl: "/losses",
});
