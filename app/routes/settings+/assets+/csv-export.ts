import {
	assetTable,
} from "~/drizzle/schema";

import {dr} from "~/db.server";

import {asc, eq} from "drizzle-orm";

import {csvExportLoader} from "~/backend.server/handlers/form/csv_export"

export const loader = csvExportLoader({
	table: assetTable,
	fetchData: () => {
		return dr.query.assetTable.findMany({
			columns: {
				id: true,
				apiImportId: true,
				sectorIds: true,
				name: true,
				category: true,
				nationalId: true,
				notes: true
			},
			orderBy: [asc(assetTable.id)],
			where: eq(assetTable.isBuiltIn, false),
		})
	},
})
