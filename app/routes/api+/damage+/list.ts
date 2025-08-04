import { damagesTable, disasterRecordsTable } from "~/drizzle/schema";

import { dr } from "~/db.server";

import { desc, eq, sql } from "drizzle-orm";

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
			const [{ count }] = await dr
				.select({
					count: sql<number>`count(${damagesTable.id})`,
				})
				.from(damagesTable)
				.innerJoin(
					disasterRecordsTable,
					eq(damagesTable.recordId, disasterRecordsTable.id)
				)
				.where(eq(disasterRecordsTable.countryAccountsId, countryAccountsId));
			return count;
		},
		async (offsetLimit) => {
			return dr.query.damagesTable.findMany({
				...offsetLimit,
				columns: {
					id: true,
					recordId: true,
					sectorId: true,
				},
				where: (damages, { eq, and, inArray }) =>
					and(
						inArray(
							damages.recordId,
							dr
								.select({ id: disasterRecordsTable.id })
								.from(disasterRecordsTable)
								.where(
									eq(disasterRecordsTable.countryAccountsId, countryAccountsId)
								)
						)
					),
				orderBy: [desc(damagesTable.id)],
			});
		}
	)(args);
};
