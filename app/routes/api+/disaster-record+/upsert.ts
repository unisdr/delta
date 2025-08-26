import { authLoaderApi } from "~/util/auth";

import { jsonUpsert } from "~/backend.server/handlers/form/form_api";

import {
	disasterRecordsCreate,
	disasterRecordsUpdate,
	disasterRecordsIdByImportId,
	DisasterRecordsFields,
} from "~/backend.server/models/disaster_record";

import { fieldsDefApi } from "~/frontend/disaster-record/form";
import { apiAuth } from "~/backend.server/models/api_key";
import { ActionFunction, ActionFunctionArgs } from "@remix-run/server-runtime";
import { SelectDisasterRecords } from "~/drizzle/schema";
import { FormInputDef } from "~/frontend/form";

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

	let data: SelectDisasterRecords[] = await args.request.json();
	data = data.map((item) => ({
		...item,
		countryAccountsId: countryAccountsId,
	}));
	let fieldsDef: FormInputDef<DisasterRecordsFields>[] = [
		...fieldsDefApi,
		{ key: "countryAccountsId", label: "", type: "text" },
	];
	const saveRes = await jsonUpsert({
		data,
		fieldsDef: fieldsDef,
		create: disasterRecordsCreate,
		update: async (tx: any, id: string, fields: any) => {
			return disasterRecordsUpdate(tx, id, fields, countryAccountsId);
		},
		idByImportIdAndCountryAccountsId: disasterRecordsIdByImportId,
		countryAccountsId,
	});

	return Response.json(saveRes);
};
