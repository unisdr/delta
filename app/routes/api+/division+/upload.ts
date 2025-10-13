import type {} from "@remix-run/node";

import { handleRequest } from "~/backend.server/handlers/geography_upload";

import { ActionFunctionArgs } from "@remix-run/server-runtime";

import { apiAuth } from "~/backend.server/models/api_key";

import { authLoaderApi } from "~/util/auth";

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
	return handleRequest(request)
};

