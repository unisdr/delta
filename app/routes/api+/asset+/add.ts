import { authLoaderApi } from "~/util/auth";

import { jsonCreate } from "~/backend.server/handlers/form/form_api";
import { assetCreate, fieldsDefApi } from "~/backend.server/models/asset";
import { apiAuth } from "~/backend.server/models/api_key";
import { ActionFunctionArgs } from "@remix-run/server-runtime";
import { SelectAsset } from "~/drizzle/schema";

export let loader = authLoaderApi(async () => {
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
	let data: SelectAsset[] = await args.request.json();
	data = data.map((item) => ({
		...item,
		countryAccountsId: countryAccountsId,
	}));

	let saveRes = await jsonCreate({
		data,
		fieldsDef: await fieldsDefApi(),
		create: assetCreate,
	});

	return Response.json(saveRes);
};
