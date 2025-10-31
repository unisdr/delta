import { authActionApi, authLoaderApi } from "~/util/auth";

import { fieldsDefApi } from "~/frontend/events/disastereventform";

import { jsonUpdate } from "~/backend.server/handlers/form/form_api";
import {
	disasterEventUpdateByIdAndCountryAccountsId,
} from "~/backend.server/models/event";
import { ActionFunctionArgs } from "@remix-run/server-runtime";
import { apiAuth } from "~/backend.server/models/api_key";
import { SelectDisasterEvent } from "~/drizzle/schema";

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
		let data: SelectDisasterEvent[] = await args.request.json();
		data = data.map((item) => ({
			...item,
			countryAccountsId: countryAccountsId,
		}));

		const saveRes = await jsonUpdate({
			data,
			fieldsDef: fieldsDefApi,
			update: disasterEventUpdateByIdAndCountryAccountsId,
			countryAccountsId,
		});

		return Response.json(saveRes);
	})(args);
};
