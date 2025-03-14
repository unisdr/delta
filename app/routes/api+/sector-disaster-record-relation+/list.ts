import {
	sectorDisasterRecordsRelationTable,
} from "~/drizzle/schema";

import {dr} from "~/db.server";

import {desc} from "drizzle-orm";

import {createApiListLoader} from "~/backend.server/handlers/view";

export const loader = createApiListLoader(
	sectorDisasterRecordsRelationTable,
	async (offsetLimit) => {
		return dr.query.sectorDisasterRecordsRelationTable.findMany({
			...offsetLimit,
			columns: {
				id: true,
				sectorId: true,
				disasterRecordId:true,
			},
			orderBy: [desc(sectorDisasterRecordsRelationTable.id)],
		});
	},
);
