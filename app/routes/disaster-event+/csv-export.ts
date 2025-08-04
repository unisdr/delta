import {
	disasterEventTable,
} from "~/drizzle/schema";

import { dr } from "~/db.server";

import { asc, eq } from "drizzle-orm";

import { csvExportLoader } from "~/backend.server/handlers/form/csv_export";
import type { LoaderFunctionArgs } from "@remix-run/node";

import {
	authLoaderWithPerm,
} from "~/util/auth";
import { sessionCookie } from "~/util/session";


export const loader = authLoaderWithPerm("EditData", async (loaderArgs) => {
	const {request} = loaderArgs;
	const session =  await sessionCookie().getSession(request.headers.get("Cookie"));
	const countryAccountsId = session.get("countryAccountsId")

	const fetchDataWithTenant = async () => {
		return dr.query.disasterEventTable.findMany({
			where: eq(disasterEventTable.countryAccountsId, countryAccountsId),
			orderBy: [asc(disasterEventTable.id)],
		});
	};

	// Use csvExportLoader with tenant-aware data fetcher
	const exportLoader = csvExportLoader({
		table: disasterEventTable,
		fetchData: fetchDataWithTenant,
	});

	// Create a proper LoaderFunctionArgs object
	const loaderFunctionArgs: LoaderFunctionArgs = {
		request: loaderArgs.request,
		params: loaderArgs.params,
		context: {}
	};

	return exportLoader(loaderFunctionArgs);
});
