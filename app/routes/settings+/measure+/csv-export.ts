import {
	measureTable,
} from "~/drizzle/schema";

import {dr} from "~/db.server";

import {asc} from "drizzle-orm";

import {csvExportLoader} from "~/backend.server/handlers/form/csv_export";

export const loader = csvExportLoader({
	table: measureTable,
	fetchData: () => {
		return dr.query.measureTable.findMany({
			orderBy: [asc(measureTable.id)],
		});
	},
});

