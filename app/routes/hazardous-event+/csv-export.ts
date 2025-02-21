import { hazardous_eventTable } from "~/drizzle/schema";

import {dr} from "~/db.server";

import {asc} from "drizzle-orm";

import {csvExportLoader} from "~/backend.server/handlers/csv_export";

export const loader = csvExportLoader({
	table: hazardous_eventTable,
	fetchData: () => {
		return dr.query.hazardous_eventTable.findMany({
			orderBy: [asc(hazardous_eventTable.id)],
		});
	},
});
