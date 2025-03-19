import {
	nonecoLossesTable,
} from "~/drizzle/schema";

import {dr} from "~/db.server";

import {desc} from "drizzle-orm";

import {createApiListLoader} from "~/backend.server/handlers/view";

export const loader = createApiListLoader(
	nonecoLossesTable,
	async (offsetLimit) => {
		return dr.query.nonecoLossesTable.findMany({
			...offsetLimit,
			columns: {
				id: true,
				disasterRecordId: true,
				categoryId: true,
				description: true,
				apiImportId: true
			},
			orderBy: [desc(nonecoLossesTable.id)],
		});
	},
);
