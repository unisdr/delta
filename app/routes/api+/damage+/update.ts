import { authLoaderApi, authActionApi } from "~/util/auth";

import { damagesUpdateByIdAndCountryAccountsId, fieldsDefApi } from "~/backend.server/models/damages";

import { jsonUpdate } from "~/backend.server/handlers/form/form_api";
import { getCountrySettingsFromSession } from "~/util/session";
import { ActionFunctionArgs } from "@remix-run/server-runtime";
import { apiAuth } from "~/backend.server/models/api_key";

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

	return authActionApi(async (args) => {
		const data = await args.request.json();
		const settings = await getCountrySettingsFromSession(args.request);

		const saveRes = await jsonUpdate({
			data,
			fieldsDef: await fieldsDefApi([settings.currencyCode]),
			update: damagesUpdateByIdAndCountryAccountsId,
			countryAccountsId
		});

		return Response.json(saveRes);
	})(args);
};
