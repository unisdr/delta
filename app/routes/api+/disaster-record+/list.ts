import {
	disasterRecordsTable,
} from "~/drizzle/schema";

import { dr } from "~/db.server";

import { desc } from "drizzle-orm";

import { createApiListLoader } from "~/backend.server/handlers/view";

export const loader = createApiListLoader(
	disasterRecordsTable,
	async (offsetLimit) => {
		return dr.query.disasterRecordsTable.findMany({
			...offsetLimit,
			orderBy: [desc(disasterRecordsTable.id)],
			with: {
				hipHazard: {
					columns: {
						id: true,
						nameEn: true,
						code: true
					},
				},
				hipCluster: {
					columns: {
						id: true,
						nameEn: true,
					},
				},
				hipType: {
					columns: {
						id: true,
						nameEn: true,
					},
				},
			}
		});
	},
);
