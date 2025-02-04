import {
	disruptionTable,
} from "~/drizzle/schema"

import { dr } from "~/db.server"

import { desc } from "drizzle-orm"

import { createApiListLoader } from "~/backend.server/handlers/view"

export const loader = createApiListLoader(
	disruptionTable,
	async (offsetLimit) => {
		return dr.query.disruptionTable.findMany({
			...offsetLimit,
			columns: {
				id: true,
				durationDays: true,
				durationHours: true,
				usersAffected: true,
				responseOperation: true,
				responseCost: true,
				responseCurrency: true
			},
			orderBy: [desc(disruptionTable.durationDays)],
		})
	},
	[desc(disruptionTable.durationDays)]
)

