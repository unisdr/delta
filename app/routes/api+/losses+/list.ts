import {
	lossesTable,
} from "~/drizzle/schema"

import { dr } from "~/db.server"

import { desc } from "drizzle-orm"

import { createApiListLoader } from "~/backend.server/handlers/view"

export const loader = createApiListLoader(
	lossesTable,
	async (offsetLimit) => {
		return dr.query.lossesTable.findMany({
			...offsetLimit,
			columns: {
				id: true,
				type: true,
				publicValue: true,
				publicTotalCost: true,
				privateTotalCost: true
			},
			orderBy: [desc(lossesTable.publicValue)],
		})
	},
	[desc(lossesTable.publicValue)]
)


