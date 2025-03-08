import { hazardousEventTable } from "~/drizzle/schema";
import { dr } from "~/db.server";
import { desc } from "drizzle-orm";
import { createApiListLoader } from "~/backend.server/handlers/view";

export const loader = createApiListLoader(
	hazardousEventTable,
	async (offsetLimit) => {
		return await dr.query.hazardousEventTable.findMany({
			...offsetLimit,
			columns: {
				id: true,
				hipHazardId: true,
				startDate: true,
				endDate: true,
				description: true,
			},
			orderBy: [desc(hazardousEventTable.startDate)],
			with: {
				hipHazard: {
					columns: {
						nameEn: true,
					},
				},
			},
		});
	},
);

