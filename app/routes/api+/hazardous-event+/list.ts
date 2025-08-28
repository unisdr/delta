import {hazardousEventTable} from "~/drizzle/schema";
import {dr} from "~/db.server";
import {desc} from "drizzle-orm";
import {createApiListLoader} from "~/backend.server/handlers/view";

export const loader = createApiListLoader(
	hazardousEventTable,
	async (offsetLimit) => {
		return await dr.query.hazardousEventTable.findMany({
			...offsetLimit,
			orderBy: [desc(hazardousEventTable.startDate)],
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
				event: {
					columns: {},
					with: {
						ps: true,
						cs: true
					}
				}
			},
		});
	},
);
