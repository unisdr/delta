import {
	disasterRecordsTable,
} from "~/drizzle/schema";

import {dr} from "~/db.server";

import {desc} from "drizzle-orm";

import {createApiListLoader} from "~/backend.server/handlers/view";

export const loader = createApiListLoader(
	disasterRecordsTable,
	async (offsetLimit) => {
		return dr.query.disasterRecordsTable.findMany({
			...offsetLimit,
			columns: {
				id: true,
				approvalStatus: true,
				disasterEventId: true,
				startDate: true,
				endDate: true
			},
			orderBy: [desc(disasterRecordsTable.id)],
		});
	},
);
