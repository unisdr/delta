import { dr } from "~/db.server";

import { desc, eq } from "drizzle-orm";

import { authLoaderApi } from "~/util/auth";

import { createApiListLoader } from "~/backend.server/handlers/view";

import { disasterEventTable } from "~/drizzle/schema";
import { apiAuth } from "~/backend.server/models/api_key";

export const loader = authLoaderApi(async (args) => {
	const { request } = args;
	const apiKey = await apiAuth(request);
	const countryAccountsId = apiKey.countryAccountsId;
	if (!countryAccountsId) {
		throw new Response("Unauthorized", { status: 401 });
	}
	return createApiListLoader(
		async () => {
			return dr.$count(
				disasterEventTable,
				eq(disasterEventTable.countryAccountsId, countryAccountsId)
			);
		},
		async (offsetLimit) => {
			return dr.query.disasterEventTable.findMany({
				...offsetLimit,
				where: eq(disasterEventTable.countryAccountsId, countryAccountsId),
				orderBy: [desc(disasterEventTable.startDate)],
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
				}
			});
		}
	)(args);
});
