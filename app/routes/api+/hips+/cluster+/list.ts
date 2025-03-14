import {
	hipClusterTable,
} from "~/drizzle/schema";

import {dr} from "~/db.server";

import {desc} from "drizzle-orm";

import {createApiListLoader} from "~/backend.server/handlers/view";

export const loader = createApiListLoader(
	hipClusterTable,
	async (offsetLimit) => {
		return dr.query.hipClusterTable.findMany({
			...offsetLimit,
			orderBy: [desc(hipClusterTable.id)],
		});
	},
);
