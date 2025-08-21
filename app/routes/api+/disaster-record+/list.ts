import { disasterRecordsTable } from "~/drizzle/schema";

import { dr } from "~/db.server";
import { desc, eq } from "drizzle-orm";

import { LoaderFunction, LoaderFunctionArgs } from "@remix-run/server-runtime";
import { apiAuth } from "~/backend.server/models/api_key";
import { createApiListLoader } from "~/backend.server/handlers/view";

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
				disasterRecordsTable,
				eq(disasterRecordsTable.countryAccountsId, countryAccountsId)
			);
		},
		async (offsetLimit) => {
			return dr.query.disasterRecordsTable.findMany({
				...offsetLimit,
				with: {
					hipHazard: {
						columns: {
							id: true,
							nameEn: true,
							code: true
						},
					},
					hipCluster: {
						columns: {
							id: true,
							nameEn: true,
						},
					},
					hipType: {
						columns: {
							id: true,
							nameEn: true,
						},
					},
				},
				where: eq(disasterRecordsTable.countryAccountsId, countryAccountsId),
				orderBy: [desc(disasterRecordsTable.id)],
			});
		}
	)(args);
};
