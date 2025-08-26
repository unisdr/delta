import {
	authLoaderApi,
} from "~/util/auth";

import {
	fieldsDefApi,
} from "~/frontend/events/hazardeventform";

import {
	jsonUpsert,
} from "~/backend.server/handlers/form/form_api";
import {
	hazardousEventUpdate,
	hazardousEventCreate,
	HazardousEventFields,
	hazardousEventIdByImportIdAndCountryAccountsId
} from "~/backend.server/models/event";
import { ActionFunction, ActionFunctionArgs } from "@remix-run/server-runtime";
import { apiAuth } from "~/backend.server/models/api_key";
import { SelectHazardousEvent } from "~/drizzle/schema";
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

	let data: SelectHazardousEvent[] = await args.request.json();
	data = data.map((item) => ({
		...item,
		countryAccountsId: countryAccountsId,
	}));
	let fieldsDef: FormInputDef<HazardousEventFields>[] = [
			...(fieldsDefApi),
			{ key: "countryAccountsId", label: "", type: "text" },
	];
	const saveRes = await jsonUpsert({
		data,
		fieldsDef: fieldsDef,
		create: hazardousEventCreate,
		update: hazardousEventUpdate,
		idByImportIdAndCountryAccountsId: hazardousEventIdByImportIdAndCountryAccountsId,
		countryAccountsId
	});

	return Response.json(saveRes)
};
