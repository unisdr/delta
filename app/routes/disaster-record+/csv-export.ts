import {
	disasterRecordsTable,
} from "~/drizzle/schema";

import {dr} from "~/db.server";

import {asc} from "drizzle-orm";

import {csvExportLoader} from "~/backend.server/handlers/csv_export";

export const loader = csvExportLoader({
	table: disasterRecordsTable,
	fetchData: () => {
		return dr.query.disasterRecordsTable.findMany({
			orderBy: [asc(disasterRecordsTable.id)],
		});
	},
});
