import { authLoaderApi } from "~/util/auth";

import { createFieldsDefApi, lossesIdByImportIdAndCountryAccountsId } from "~/backend.server/models/losses";

import { jsonUpsert } from "~/backend.server/handlers/form/form_api";

import {
	lossesCreate,
	lossesUpdate,
} from "~/backend.server/models/losses";
import { apiAuth } from "~/backend.server/models/api_key";
import { getInstanceSystemSettingsByCountryAccountId } from "~/db/queries/instanceSystemSetting";
import { ActionFunctionArgs } from "@remix-run/server-runtime";

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST");
});

export const action = async (args: ActionFunctionArgs) => {
	const { request } = args;
	if (request.method !== "POST") {
		throw new Response("Method Not Allowed: Only POST requests are supported", {
			status: 405,
		});
	}

	const apiKey = await apiAuth(request);
	const countryAccountsId = apiKey.countryAccountsId;
	if (!countryAccountsId) {
		throw new Response("Unauthorized", { status: 401 });
	}
	const settings = await getInstanceSystemSettingsByCountryAccountId(
		countryAccountsId
	);
	const currencies = [settings?.currencyCode || "USD"];

	const data = await args.request.json();
	const saveRes = await jsonUpsert({
		data,
		fieldsDef: createFieldsDefApi(currencies),
		create: lossesCreate,
		update: lossesUpdate,
		idByImportIdAndCountryAccountsId: lossesIdByImportIdAndCountryAccountsId,
		countryAccountsId
	});

	return Response.json(saveRes);
};
