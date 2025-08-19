import { assetTable } from "~/drizzle/schema";

import { dr } from "~/db.server";

import { desc, eq, or } from "drizzle-orm";

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
				assetTable,
				or(
					eq(assetTable.isBuiltIn, true),
					eq(assetTable.countryAccountsId, countryAccountsId)
				)
			);
		},
		async (offsetLimit) => {
			return dr.query.assetTable.findMany({
				...offsetLimit,
				where: or(eq(assetTable.isBuiltIn,true), eq(assetTable.countryAccountsId, countryAccountsId)),
				columns: { id: true, name: true, nationalId: true, notes: true },
				orderBy: [desc(assetTable.name)],
			});
		}
	)(args);
};
