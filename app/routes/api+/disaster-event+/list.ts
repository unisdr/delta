
import { dr } from "~/db.server";

import { desc, eq } from "drizzle-orm";

import {
	authLoaderApi,
	authLoaderGetAuth
} from "~/util/auth";

import { getTenantContext } from "~/util/tenant";

import { createApiListLoader } from "~/backend.server/handlers/view";

import {
	disasterEventTable,
} from '~/drizzle/schema';

export const loader = authLoaderApi(async (args) => {
	// Extract tenant context from session
	const userSession = authLoaderGetAuth(args);
	if (!userSession) {
		return Response.json({
			ok: false,
			error: "Unauthorized: Missing or invalid session"
		}, { status: 401 });
	}
	const tenantContext = await getTenantContext(userSession);

	// Create tenant-aware list loader
	const listLoader = createApiListLoader(
		disasterEventTable,
		async (offsetLimit) => {
			return dr.query.disasterEventTable.findMany({
				...offsetLimit,
				columns: {
					id: true,
					startDate: true,
					endDate: true,
				},
				where: eq(disasterEventTable.countryAccountsId, tenantContext.countryAccountId),
				orderBy: [desc(disasterEventTable.startDate)],
			});
		},
	);

	return listLoader(args);
});

