import { hazardousEventTable } from "~/drizzle/schema";
import { dr } from "~/db.server";
import { desc, eq, and, ilike } from "drizzle-orm";
import { createApiListLoader } from "~/backend.server/handlers/view";
import { authLoaderApi, authActionGetAuth } from "~/util/auth";
import { getTenantContext } from "~/util/tenant";

// Export the loader with proper tenant isolation
export const loader = authLoaderApi(async (args) => {
	const { request } = args;

	// Get search parameter from the URL
	const search = new URL(request.url).searchParams.get("search") || "";

	// Extract user session from API request
	const userSession = authActionGetAuth(args);

	// Get tenant context from the user session
	const tenantContext = await getTenantContext(userSession);

	// Create a data fetcher that includes tenant filtering
	const fetchData = async (offsetLimit: { offset: number; limit: number }) => {
		const conditions = [
			// Apply tenant isolation by filtering on countryAccountsId
			eq(hazardousEventTable.countryAccountsId, tenantContext.countryAccountId)
		];

		// Add search condition if provided
		if (search) {
			conditions.push(ilike(hazardousEventTable.description, `%${search}%`));
		}

		return dr.query.hazardousEventTable.findMany({
			...offsetLimit,
			where: and(...conditions),
			columns: {
				id: true,
				hipHazardId: true,
				startDate: true,
				endDate: true,
				description: true,
			},
			orderBy: [desc(hazardousEventTable.startDate)],
			with: {
				hipHazard: {
					columns: {
						nameEn: true,
					},
				},
			},
		});
	};

	// Use the existing API list loader with our tenant-aware fetcher
	return createApiListLoader(hazardousEventTable, fetchData)(args);
});