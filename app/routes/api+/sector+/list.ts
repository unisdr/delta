import {
	sectorTable,
} from "~/drizzle/schema";

import {dr} from "~/db.server";

import {desc} from "drizzle-orm";

import {createApiListLoader} from "~/backend.server/handlers/view";

export const loader = createApiListLoader(
	sectorTable,
	async (offsetLimit) => {
		return dr.query.sectorTable.findMany({
			...offsetLimit,
			orderBy: [desc(sectorTable.id)],
		});
	},
);

