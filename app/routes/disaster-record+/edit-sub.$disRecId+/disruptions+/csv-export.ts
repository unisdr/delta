import {
	disruptionTable,
} from "~/drizzle/schema"

import { dr } from "~/db.server"

import { asc } from "drizzle-orm"

import { csvExportLoader } from "~/backend.server/handlers/form/csv_export"

export const loader = csvExportLoader({
	table: disruptionTable,
	fetchData: () => {
		return dr.query.disruptionTable.findMany({
			orderBy: [asc(disruptionTable.id)],
		})
	},
})

