import {
	damagesTable,
} from "~/drizzle/schema"

import { dr } from "~/db.server"

import { desc } from "drizzle-orm"

import { createApiListLoader } from "~/backend.server/handlers/view"

export const loader = createApiListLoader(
	damagesTable,
	async (offsetLimit) => {
		return dr.query.damagesTable.findMany({
			...offsetLimit,
			columns: {
				id: true,
				damage: true,
				damageAmount: true,
				damageUnitType: true,
				repairCostUnit: true,
				repairCostUnitCurr: true,
				recoveryCostUnit: true,
				recoveryCostUnitCurr: true
			},
			orderBy: [desc(damagesTable.damageAmount)],
		})
	},
	[desc(damagesTable.damageAmount)]
)


