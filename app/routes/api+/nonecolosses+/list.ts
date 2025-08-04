import { disasterRecordsTable, nonecoLossesTable } from "~/drizzle/schema";

import { dr } from "~/db.server";

import { desc, eq, sql } from "drizzle-orm";

import { createApiListLoader } from "~/backend.server/handlers/view";
import { apiAuth } from "~/backend.server/models/api_key";
import { LoaderFunction, LoaderFunctionArgs } from "@remix-run/server-runtime";

export const loader: LoaderFunction = async (args: LoaderFunctionArgs) => {
	const { request } = args;
	const apiKey = await apiAuth(request);
	const countryAccountsId = apiKey.countryAccountsId;
	if (!countryAccountsId) {
		throw new Response("Unauthorized", { status: 401 });
	}

	return createApiListLoader(
		async () => {
			const [{ count }] = await dr
				.select({
					count: sql<number>`count(${nonecoLossesTable.id})`,
				})
				.from(nonecoLossesTable)
				.innerJoin(
					disasterRecordsTable,
					eq(nonecoLossesTable.disasterRecordId, disasterRecordsTable.id)
				)
				.where(eq(disasterRecordsTable.countryAccountsId, countryAccountsId));
			return count;
		},
		async (offsetLimit) => {
			return dr.query.nonecoLossesTable.findMany({
				...offsetLimit,
				columns: {
					id: true,
					disasterRecordId: true,
					categoryId: true,
					description: true,
					apiImportId: true,
				},
				where: (nonecoLosses, { eq, and, inArray }) =>
					and(
						inArray(
							nonecoLosses.disasterRecordId,
							dr
								.select({ id: disasterRecordsTable.id })
								.from(disasterRecordsTable)
								.where(
									eq(disasterRecordsTable.countryAccountsId, countryAccountsId)
								)
						)
					),
				orderBy: [desc(nonecoLossesTable.id)],
			});
		}
	)(args);
};
