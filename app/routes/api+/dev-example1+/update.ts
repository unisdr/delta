import { authLoaderApi, authActionApi } from "~/util/auth";

import { jsonUpdate } from "~/backend.server/handlers/form/form_api";
import {
	fieldsDefApi,
	devExample1UpdateById,
} from "~/backend.server/models/dev_example1";
import { apiAuth } from "~/backend.server/models/api_key";
import { ActionFunctionArgs } from "@remix-run/server-runtime";

export const loader = authLoaderApi(async () => {
	return Response.json("Use PUT");
});

export const action = async (args: ActionFunctionArgs) => {
	const { request } = args;
	if (request.method !== "PUT") {
		throw new Response("Method Not Allowed: Only PUT requests are supported", {
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
		console.log("dev_example1 data = ", data);

		const saveRes = await jsonUpdate({
			data,
			fieldsDef: await fieldsDefApi(),
			update: devExample1UpdateById,
		});

		return Response.json(saveRes);
	})(args);
};
