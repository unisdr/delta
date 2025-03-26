import {
	devExample1Table,
} from "~/drizzle/schema";

import {dr} from "~/db.server";

import {desc} from "drizzle-orm";

import {createApiListLoader} from "~/backend.server/handlers/view";

export const loader = createApiListLoader(
	devExample1Table,
	async (offsetLimit) => {
		return dr.query.devExample1Table.findMany({
			...offsetLimit,
			columns: {
				id: true,
				field1: true,
				jsonData: true
			},
			orderBy: [desc(devExample1Table.field1)],
		});
	},
);
