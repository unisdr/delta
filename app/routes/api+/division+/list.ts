import { divisionTable } from "~/drizzle/schema";

import { dr } from "~/db.server";

import { sql, desc, eq } from "drizzle-orm";

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
				divisionTable,
				eq(divisionTable.countryAccountsId, countryAccountsId)
			);
		},
		async (offsetLimit) => {
			return dr.query.divisionTable.findMany({
				columns: {
					id: true,
					importId: true,
					nationalId: true,
					parentId: true,
					name: true,
					level: true,
				},
				where: eq(divisionTable.countryAccountsId, countryAccountsId),
				extras: {
					hasGeoData: sql`${divisionTable.geojson} IS NOT NULL`.as(
						"hasGeoData"
					),
				},
				...offsetLimit,
				orderBy: [desc(divisionTable.id)],
			});
		}
	)(args);
};
