import { authLoaderApi } from "~/util/auth";

import { createFieldsDef } from "~/backend.server/models/losses";

import { jsonUpdate } from "~/backend.server/handlers/form/form_api";
import { lossesUpdate } from "~/backend.server/models/losses";
import { getInstanceSystemSettingsByCountryAccountId } from "~/db/queries/instanceSystemSetting";
import { apiAuth } from "~/backend.server/models/api_key";
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

	let data = await request.json();

	const saveRes = await jsonUpdate({
		data,
		fieldsDef: createFieldsDef(currencies),
		update: lossesUpdate,
	});

	return Response.json(saveRes);
};
