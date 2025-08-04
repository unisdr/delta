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
	hazardousEventIdByImportId,
	hazardousEventCreate
} from "~/backend.server/models/event";
import { ActionFunction, ActionFunctionArgs } from "@remix-run/server-runtime";
import { apiAuth } from "~/backend.server/models/api_key";

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
		create: hazardousEventCreate,
		update: hazardousEventUpdate,
		idByImportId: hazardousEventIdByImportId,
	});

	return Response.json(saveRes)
};
