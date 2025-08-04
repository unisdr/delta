import { authLoaderApi, authActionGetAuth } from "~/util/auth";

import { fieldsDefApi } from "~/frontend/events/disastereventform";

import { jsonCreate } from "~/backend.server/handlers/form/form_api";
import { disasterEventCreate } from "~/backend.server/models/event";
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

	let data: SelectDisasterEvent[] = await request.json();
	data = data.map((item) => ({
		...item,
		countryAccountsId: countryAccountsId,
	}));

	// Extract tenant context from session
	const userSession = authActionGetAuth(args);
	if (!userSession) {
		return Response.json(
			{
				ok: false,
				errors: {
					form: ["Unauthorized: Missing or invalid session"],
				},
			},
			{ status: 401 }
		);
	}
	// Create wrapper function that includes tenant context
	const createWithTenant = (tx: any, data: any) => {
		return disasterEventCreate(tx, data);
	};

	const saveRes = await jsonCreate({
		data,
		fieldsDef: fieldsDefApi,
		create: createWithTenant,
	});

	return Response.json(saveRes);
};
