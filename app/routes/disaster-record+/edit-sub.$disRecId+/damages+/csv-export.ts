import {
	damagesTable,
} from "~/drizzle/schema"

import { dr } from "~/db.server"

import { asc } from "drizzle-orm"

import { csvExportLoader } from "~/backend.server/handlers/form/csv_export"

export const loader = csvExportLoader({
	table: damagesTable,
	fetchData: () => {
		return dr.query.damagesTable.findMany({
			orderBy: [asc(damagesTable.id)],
		})
	},
})

