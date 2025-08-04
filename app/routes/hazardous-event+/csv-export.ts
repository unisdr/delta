import type { LoaderFunctionArgs } from "@remix-run/node";
import { asc, eq } from "drizzle-orm";
import { csvExportLoader } from "~/backend.server/handlers/form/csv_export";
import { dr } from "~/db.server";
import { hazardousEventTable } from "~/drizzle/schema";
import { authLoaderGetAuth, authLoaderWithPerm } from "~/util/auth";
import { getCountryAccountsIdFromSession } from "~/util/session";

export const loader = authLoaderWithPerm("ViewData", async (loaderArgs) => {
	const { request } = loaderArgs;
	const userSession = authLoaderGetAuth(loaderArgs);
	if (!userSession) {
		throw new Response("Unauthorized", { status: 401 });
	}
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	

	const fetchDataWithTenant = async () => {
		return dr.query.hazardousEventTable.findMany({
			where: eq(hazardousEventTable.countryAccountsId, countryAccountsId),
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
		context: {},
	};

	// Call the export loader with the proper args
	return exportLoader(loaderFunctionArgs);
});
