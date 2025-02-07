import {
	damagesTable,
} from "~/drizzle/schema"

import {dr} from "~/db.server"

import {desc} from "drizzle-orm"

import {createApiListLoader} from "~/backend.server/handlers/view"

export const loader = createApiListLoader(
	damagesTable,
	async (offsetLimit) => {
		return dr.query.damagesTable.findMany({
			...offsetLimit,
			columns: {
				id: true,
				recordId: true,
				sectorId: true,
				pubDamageAmount: true,
				pubDamageUnitType: true,
				privDamageAmount: true,
				privDamageUnitType: true
			},
			orderBy: [desc(damagesTable.id)],
		})
	},
	[]
)


