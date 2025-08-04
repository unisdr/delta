import { authLoaderApi } from "~/util/auth";

import { jsonUpdate } from "~/backend.server/handlers/form/form_api";

import { fieldsDefApi } from "~/frontend/disaster-record/form";

import { disasterRecordsUpdate } from "~/backend.server/models/disaster_record";
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

	const data = await args.request.json();

	const saveRes = await jsonUpdate({
		data,
		fieldsDef: fieldsDefApi,
		update: async (tx: any, id: string, fields: any) => {
			return disasterRecordsUpdate(tx, id, fields, countryAccountsId);
		},
	});
	return Response.json(saveRes);
};
