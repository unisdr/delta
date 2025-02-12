import {
	measureTable,
} from "~/drizzle/schema";

import {dr} from "~/db.server";

import {desc} from "drizzle-orm";

import {createApiListLoader} from "~/backend.server/handlers/view";

export const loader = createApiListLoader(
	measureTable,
	async (offsetLimit) => {
		return dr.query.measureTable.findMany({
			...offsetLimit,
			columns: {id: true, name: true},
			orderBy: [desc(measureTable.name)],
		});
	},
	[desc(measureTable.name)]
);

