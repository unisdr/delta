
import { dr } from "~/db.server";

import { desc } from "drizzle-orm";

import { createApiListLoader } from "~/backend.server/handlers/view";

import {
	disasterEventTable,
} from '~/drizzle/schema';

export const loader = createApiListLoader(
	disasterEventTable,
	async (offsetLimit) => {
		return dr.query.disasterEventTable.findMany({
			...offsetLimit,
			orderBy: [desc(disasterEventTable.startDate)],
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

