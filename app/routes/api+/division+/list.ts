import {
	divisionTable,
} from "~/drizzle/schema";

import {dr} from "~/db.server";

import {sql, desc} from "drizzle-orm";

import {createApiListLoader} from "~/backend.server/handlers/view";

export const loader = createApiListLoader(
	divisionTable,
	async (offsetLimit) => {
		return dr.query.divisionTable.findMany({
			columns: {
				id: true,
				importId: true,
				nationalId: true,
				parentId: true,
				name: true,
				level: true,
			},
			extras: {
				hasGeoData: sql`${divisionTable.geojson} IS NOT NULL`.as('hasGeoData'),
			},
			...offsetLimit,
			orderBy: [desc(divisionTable.id)],
		});
	},
);

