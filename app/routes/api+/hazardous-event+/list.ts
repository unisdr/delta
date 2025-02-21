import { hazardous_eventTable } from "~/drizzle/schema";
import { dr } from "~/db.server";
import { desc } from "drizzle-orm";
import { createApiListLoader } from "~/backend.server/handlers/view";

export const loader = createApiListLoader(
	hazardous_eventTable,
	async (offsetLimit) => {
		return await dr.query.hazardous_eventTable.findMany({
			...offsetLimit,
			columns: {
				id: true,
				hipHazardId: true,
				startDate: true,
				endDate: true,
				description: true,
			},
			orderBy: [desc(hazardous_eventTable.startDate)],
			with: {
				hipHazard: {
					columns: {
						nameEn: true,
					},
				},
			},
		});
	},
	[desc(hazardous_eventTable.startDate)]
);

