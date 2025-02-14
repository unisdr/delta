
import {dr} from "~/db.server";

import {desc} from "drizzle-orm";

import {createApiListLoader} from "~/backend.server/handlers/view";

import {
	disasterEventTable,
} from '~/drizzle/schema';

export const loader = createApiListLoader(
	disasterEventTable,
	async (offsetLimit) => {
		return dr.query.disasterEventTable.findMany({
			...offsetLimit,
			columns: {
				id: true,
				startDate: true,
				endDate: true,
			},
			orderBy: [desc(disasterEventTable.startDate)],
		});
	},
	[desc(disasterEventTable.startDate)]
);

