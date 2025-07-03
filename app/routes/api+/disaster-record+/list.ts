import {
	disasterRecordsTable,
} from "~/drizzle/schema";

import { dr } from "~/db.server";

import { desc, eq, sql } from "drizzle-orm";

import { authLoaderApi, authLoaderGetAuth } from "~/util/auth";
import { getTenantContext } from "~/util/tenant";
import type { UserSession } from "~/util/session";
import type { OffsetLimit } from "~/frontend/pagination/api.server";
import { executeQueryForPagination3 } from "~/frontend/pagination/api.server";

// Custom implementation of list loader with tenant isolation
export const loader = authLoaderApi(async (loaderArgs) => {
	const { request } = loaderArgs;

	// Extract tenant context from user session
	const userSession = authLoaderGetAuth(loaderArgs) as UserSession;
	if (!userSession) {
		return Response.json({ error: "Authentication required" }, { status: 401 });
	}

	const tenantContext = await getTenantContext(userSession);

	// Get total count with tenant filtering
	const count = await dr
		.select({ count: sql<number>`count(*)` })
		.from(disasterRecordsTable)
		.where(eq(disasterRecordsTable.countryAccountsId, tenantContext.countryAccountId))
		.then(result => Number(result[0]?.count || 0));

	// Define data fetcher with tenant filtering
	const dataFetcher = async (offsetLimit: OffsetLimit) => {
		return dr.query.disasterRecordsTable.findMany({
			...offsetLimit,
			columns: {
				id: true,
				approvalStatus: true,
				disasterEventId: true,
				startDate: true,
				endDate: true
			},
			where: eq(disasterRecordsTable.countryAccountsId, tenantContext.countryAccountId),
			orderBy: [desc(disasterRecordsTable.id)],
		});
	};

	// Execute the query with pagination
	const res = await executeQueryForPagination3(request, count, dataFetcher, []);

	return Response.json({ data: res });
});
