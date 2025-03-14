import {
	hipTypeTable,
} from "~/drizzle/schema";

import {dr} from "~/db.server";

import {desc} from "drizzle-orm";

import {createApiListLoader} from "~/backend.server/handlers/view";

export const loader = createApiListLoader(
	hipTypeTable,
	async (offsetLimit) => {
		return dr.query.hipTypeTable.findMany({
			...offsetLimit,
			orderBy: [desc(hipTypeTable.id)],
		});
	},
);
