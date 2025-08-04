import { authLoaderApi } from "~/util/auth";

import { jsonUpsert } from "~/backend.server/handlers/form/form_api";

import {
	disasterRecordsCreate,
	disasterRecordsUpdate,
	disasterRecordsIdByImportId,
} from "~/backend.server/models/disaster_record";

import { fieldsDefApi } from "~/frontend/disaster-record/form";
import { apiAuth } from "~/backend.server/models/api_key";
import { ActionFunction, ActionFunctionArgs } from "@remix-run/server-runtime";

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

	const data = await args.request.json();
	const saveRes = await jsonUpsert({
		data,
		fieldsDef: fieldsDefApi,
		create: disasterRecordsCreate,
		update: async (tx: any, id: string, fields: any) => {
			return disasterRecordsUpdate(tx, id, fields, countryAccountsId);
		},
		idByImportId: disasterRecordsIdByImportId,
	});

	return Response.json(saveRes);
};
