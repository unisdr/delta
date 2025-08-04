import { authLoaderApi } from "~/util/auth";

import { createFieldsDefApi } from "~/backend.server/models/losses";

import { jsonCreate } from "~/backend.server/handlers/form/form_api";
import { lossesCreate } from "~/backend.server/models/losses";
import { ActionFunctionArgs } from "@remix-run/server-runtime";
import { apiAuth } from "~/backend.server/models/api_key";
import { SelectLosses } from "~/drizzle/schema";
import { getInstanceSystemSettingsByCountryAccountId } from "~/db/queries/instanceSystemSetting";

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

	let data: SelectLosses[] = await request.json();
	data = data.map((item) => ({
		...item,
		countryAccountsId: countryAccountsId,
	}));

	const saveRes = await jsonCreate({
		data,
		fieldsDef: createFieldsDefApi(currencies),
		create: lossesCreate,
	});

	return Response.json(saveRes);
};
