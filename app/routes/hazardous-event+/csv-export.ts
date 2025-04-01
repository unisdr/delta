import { hazardousEventTable } from "~/drizzle/schema";

import {dr} from "~/db.server";

import {asc} from "drizzle-orm";

import {csvExportLoader} from "~/backend.server/handlers/form/csv_export";

export const loader = csvExportLoader({
	table: hazardousEventTable,
	fetchData: () => {
		return dr.query.hazardousEventTable.findMany({
			orderBy: [asc(hazardousEventTable.id)],
		});
	},
});
