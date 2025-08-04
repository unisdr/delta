import { devExample1Table } from "~/drizzle/schema";

import { dr } from "~/db.server";

import { desc, eq } from "drizzle-orm";

import { createApiListLoader } from "~/backend.server/handlers/view";
import { LoaderFunction, LoaderFunctionArgs } from "@remix-run/server-runtime";
import { apiAuth } from "~/backend.server/models/api_key";

export const loader: LoaderFunction = async (args: LoaderFunctionArgs) => {
	const { request } = args;
	const apiKey = await apiAuth(request);
	const countryAccountsId = apiKey.countryAccountsId;
	if (!countryAccountsId) {
		throw new Response("Unauthorized", { status: 401 });
	}

	return createApiListLoader(
		async () => {
			return dr.$count(
				devExample1Table,
				eq(devExample1Table.countryAccountsId, countryAccountsId)
			);
		},
		async (offsetLimit) => {
			return dr.query.devExample1Table.findMany({
				...offsetLimit,
				columns: {
					id: true,
					field1: true,
					jsonData: true,
				},
				where: eq(devExample1Table.countryAccountsId, countryAccountsId),
				orderBy: [desc(devExample1Table.field1)],
			});
		}
	)(args);
};
