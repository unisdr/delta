import { authActionApi, authLoaderApi } from "~/util/auth";

import { fieldsDefApi } from "~/frontend/events/disastereventform";

import { jsonUpdate } from "~/backend.server/handlers/form/form_api";
import {
	disasterEventUpdateByIdAndCountryAccountsId,
} from "~/backend.server/models/event";
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

		const saveRes = await jsonUpdate({
			data,
			fieldsDef: fieldsDefApi,
			update: disasterEventUpdateByIdAndCountryAccountsId,
			countryAccountsId,
		});

		return Response.json(saveRes);
	})(args);
};
