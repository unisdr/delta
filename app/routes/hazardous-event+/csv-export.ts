import { hazardousEventTable } from "~/drizzle/schema";
import { dr } from "~/db.server";
import { asc, eq } from "drizzle-orm";
import { csvExportLoader } from "~/backend.server/handlers/form/csv_export";
import { sessionCookie } from "~/util/session";
import { getTenantContext } from "~/util/tenant";

export const loader = csvExportLoader({
	table: hazardousEventTable,
	fetchData: async () => {
		// Get the session from the request
		const session = await sessionCookie().getSession();
		const user = session.get("user");
		if (!user) {
			throw new Response("Unauthorized", { status: 401 });
		}

		// Extract tenant context from user session
		const tenantContext = await getTenantContext(user);

		// Apply tenant isolation by filtering on countryAccountsId
		return dr.query.hazardousEventTable.findMany({
			where: eq(hazardousEventTable.countryAccountsId, tenantContext.countryAccountId),
			orderBy: [asc(hazardousEventTable.id)],
		});
	},
});
