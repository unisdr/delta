import {
	devExample1Table,
} from "~/drizzle/schema";

import {dr} from "~/db.server";

import {asc} from "drizzle-orm";

import {csvExportLoader} from "~/backend.server/handlers/csv_export";

export const loader = csvExportLoader({
	table: devExample1Table,
	fetchData: () => {
		return dr.query.devExample1Table.findMany({
			columns: {
				id: true,
				field1: true
			},
			orderBy: [asc(devExample1Table.id)],
		});
	},
});
