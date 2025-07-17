import { hazardousEventTable } from "~/drizzle/schema";
import { dr } from "~/db.server";
import { asc, eq } from "drizzle-orm";
import { csvExportLoader } from "~/backend.server/handlers/form/csv_export";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { authLoaderWithPerm, authLoaderGetAuth } from "~/util/auth";
import { getTenantContext } from "~/util/tenant";

export const loader = authLoaderWithPerm("ViewData", async (loaderArgs) => {
	// Extract tenant context from session
	const userSession = authLoaderGetAuth(loaderArgs);
	if (!userSession) {
		throw new Response("Unauthorized", { status: 401 });
	}
	const tenantContext = await getTenantContext(userSession);

	// Create tenant-aware data fetcher
	const fetchDataWithTenant = async () => {
		return dr.query.hazardousEventTable.findMany({
			where: eq(hazardousEventTable.countryAccountsId, tenantContext.countryAccountId),
			orderBy: [asc(hazardousEventTable.id)],
		});
	};

	// Use csvExportLoader with tenant-aware data fetcher
	const exportLoader = csvExportLoader({
		table: hazardousEventTable,
		fetchData: fetchDataWithTenant,
	});

	// Create a proper LoaderFunctionArgs object
	const loaderFunctionArgs: LoaderFunctionArgs = {
		request: loaderArgs.request,
		params: loaderArgs.params,
		context: {}
	};

	// Call the export loader with the proper args
	return exportLoader(loaderFunctionArgs);
});
