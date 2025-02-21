import { hazardEventTable } from "~/drizzle/schema";

import {dr} from "~/db.server";

import {asc} from "drizzle-orm";

import {csvExportLoader} from "~/backend.server/handlers/csv_export";

export const loader = csvExportLoader({
	table: hazardEventTable,
	fetchData: () => {
		return dr.query.hazardEventTable.findMany({
			orderBy: [asc(hazardEventTable.id)],
		});
	},
});
