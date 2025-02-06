import {
	lossesTable,
} from "~/drizzle/schema"

import { dr } from "~/db.server"

import { asc } from "drizzle-orm"

import { csvExportLoader } from "~/backend.server/handlers/csv_export"

export const loader = csvExportLoader({
	table: lossesTable,
	fetchData: () => {
		return dr.query.lossesTable.findMany({
			orderBy: [asc(lossesTable.id)],
		})
	},
})

