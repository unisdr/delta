import { hazardEventTable } from "~/drizzle/schema";
import { dr } from "~/db.server";
import { desc } from "drizzle-orm";
import { createApiListLoader } from "~/backend.server/handlers/view";

export const loader = createApiListLoader(
	hazardEventTable,
	async (offsetLimit) => {
		return await dr.query.hazardEventTable.findMany({
			...offsetLimit,
			columns: {
				id: true,
				hipHazardId: true,
				startDate: true,
				endDate: true,
				description: true,
			},
			orderBy: [desc(hazardEventTable.startDate)],
			with: {
				hipHazard: {
					columns: {
						nameEn: true,
					},
				},
			},
		});
	},
	[desc(hazardEventTable.startDate)]
);

