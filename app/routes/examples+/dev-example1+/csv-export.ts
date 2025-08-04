import { devExample1Table } from "~/drizzle/schema";

import { dr } from "~/db.server";

import { asc, eq } from "drizzle-orm";

import { csvExportLoader } from "~/backend.server/handlers/form/csv_export";
import { LoaderFunctionArgs } from "@remix-run/server-runtime";
import { getCountryAccountsIdFromSession } from "~/util/session";

export const loader = async (args: LoaderFunctionArgs) => {
	const {request} = args;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	if(!countryAccountsId){
		throw new Response("No selected instance", {status: 401})
	}

	return csvExportLoader({
		table: devExample1Table,
		fetchData: () => {
			return dr.query.devExample1Table.findMany({
				columns: {
					id: true,
					field1: true,
				},
				where: eq(devExample1Table.countryAccountsId, countryAccountsId),
				orderBy: [asc(devExample1Table.id)],
			});
		},
	})(args);
};
