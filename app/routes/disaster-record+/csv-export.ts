import {
	disasterRecordsTable,
} from "~/drizzle/schema";

import { dr } from "~/db.server";

import { asc, eq } from "drizzle-orm";

import { csvExportLoader } from "~/backend.server/handlers/form/csv_export";
import type { LoaderFunctionArgs } from "@remix-run/node";

import {
	authLoaderWithPerm,
	authLoaderGetAuth
} from "~/util/auth";
import { sessionCookie } from "~/util/session";

export const loader = authLoaderWithPerm("EditData", async (loaderArgs) => {
	const {request} = loaderArgs;
	// Extract tenant context from session
	const userSession = authLoaderGetAuth(loaderArgs);
	if (!userSession) {
		throw new Response("Unauthorized", { status: 401 });
	}

	const session =  await sessionCookie().getSession(request.headers.get("Cookie"));
	const countryAccountsId = session.get("countryAccountsId")

	// Create tenant-aware data fetcher
	const fetchDataWithTenant = async () => {
		return dr.query.disasterRecordsTable.findMany({
			where: eq(disasterRecordsTable.countryAccountsId, countryAccountsId),
			orderBy: [asc(disasterRecordsTable.id)],
		});
	};

	// Use csvExportLoader with tenant-aware data fetcher
	const exportLoader = csvExportLoader({
		table: disasterRecordsTable,
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
