import { authLoaderApi, authActionApi } from "~/util/auth";

import { jsonUpdate } from "~/backend.server/handlers/form/form_api";
import {
	disRecSectorsUpdateByIdAndCountryAccountsId,
	fieldsDefApi,
} from "~/backend.server/models/disaster_record__sectors";
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
			update: disRecSectorsUpdateByIdAndCountryAccountsId,
			countryAccountsId
		});

		return Response.json(saveRes);
	})(args);
};
