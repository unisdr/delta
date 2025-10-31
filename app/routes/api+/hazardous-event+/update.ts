import { authActionApi, authLoaderApi } from "~/util/auth";

import { fieldsDefApi } from "~/frontend/events/hazardeventform";

import { jsonUpdate } from "~/backend.server/handlers/form/form_api";
import { hazardousEventUpdateByIdAndCountryAccountsId } from "~/backend.server/models/event";
import { apiAuth } from "~/backend.server/models/api_key";
import { ActionFunction, ActionFunctionArgs } from "@remix-run/server-runtime";
import { SelectHazardousEvent } from "~/drizzle/schema";

export const loader = authLoaderApi(async () => {
	return Response.json("Use POST");
});

export const action: ActionFunction = async (args: ActionFunctionArgs) => {
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
		let data: SelectHazardousEvent[] = await args.request.json();

		// Forced the countryAccountsId from API link injected so it won't be manipulated via input data
		data = data.map((item) => ({
			...item,
			countryAccountsId: countryAccountsId,
		}));

		const saveRes = await jsonUpdate({
			data,
			fieldsDef: fieldsDefApi,
			update: hazardousEventUpdateByIdAndCountryAccountsId,
			countryAccountsId
		});

		return Response.json(saveRes);
	})(args);
};
