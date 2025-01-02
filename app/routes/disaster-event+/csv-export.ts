import {
	disasterEventTable,
} from "~/drizzle/schema";

import {dr} from "~/db.server";

import {asc} from "drizzle-orm";

import {csvExportLoader} from "~/backend.server/handlers/csv_export";

export const loader = csvExportLoader({
	table: disasterEventTable,
	fetchData: () => {
		return dr.query.disasterEventTable.findMany({
			orderBy: [asc(disasterEventTable.id)],
		});
	},
});
