import { authLoaderApi } from "~/util/auth";

import { loadData } from "~/backend.server/handlers/human_effects";
import { apiAuth } from "~/backend.server/models/api_key";
import { LoaderFunction, LoaderFunctionArgs } from "@remix-run/server-runtime";

export const loader: LoaderFunction = async (args: LoaderFunctionArgs) => {
	const { request } = args;
	const apiKey = await apiAuth(request);
	const countryAccountsId = apiKey.countryAccountsId;
	if (!countryAccountsId) {
		throw new Response("Unauthorized", { status: 401 });
	}

	return authLoaderApi(async (actionArgs) => {
		const { request } = actionArgs;
		let url = new URL(request.url);
		let recordId = url.searchParams.get("recordId") || "";
		let tblStr = url.searchParams.get("table") || "";

		let res = await loadData(recordId, tblStr, countryAccountsId);
		return Response.json(res);
	})(args);
};
