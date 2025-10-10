import { hazardousEventTable } from "~/drizzle/schema";
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
				hazardousEventTable,
				eq(hazardousEventTable.countryAccountsId, countryAccountsId)
			);
		},
		async (offsetLimit) => {
			return await dr.query.hazardousEventTable.findMany({
			...offsetLimit,
			where: eq(hazardousEventTable.countryAccountsId, countryAccountsId),
			orderBy: [desc(hazardousEventTable.startDate)],
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
				event: {
					columns: {},
					with: {
						ps: true,
						cs: true
					}
				}
			},
			});
		}
	)(args);
};
