import { hipHazardTable } from "~/drizzle/schema";

import { dr } from "~/db.server";

import { desc } from "drizzle-orm";

import { createApiListLoader } from "~/backend.server/handlers/view";

export const loader = createApiListLoader(
	async () => {
		return dr.$count(hipHazardTable);
	},
	async (offsetLimit) => {
		return dr.query.hipHazardTable.findMany({
			...offsetLimit,
			orderBy: [desc(hipHazardTable.id)],
		});
	}
);
