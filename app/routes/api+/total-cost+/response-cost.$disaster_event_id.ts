/**
 * Returns the total repair cost of a disaster_event
 *
 */
import { dr } from "~/db.server";
import {
	damagesTable,
	disasterEventTable,
	disasterRecordsTable,
	disruptionTable,
} from "~/drizzle/schema";
import { eq, inArray } from "drizzle-orm";

export const loader = async ({
	params,
}: {
	params: { disaster_event_id: string };
}) => {
	const { disaster_event_id } = params;
	if (!disaster_event_id) {
		return Response.json(
			{ error: "Missing disaster_event_id" },
			{ status: 400 }
		);
	}

	try {
		const disasterEvent = await dr
			.select({ responseCost: disasterEventTable.responseCostTotalUsd })
			.from(disasterEventTable)
			.where(eq(disasterEventTable.id, disaster_event_id));

		let totalResponseCost = 0;

		//Get the recovery cost from disaster event table if exist
		if (disasterEvent.length > 0 && disasterEvent[0].responseCost) {
			totalResponseCost = Number(disasterEvent[0].responseCost);
			return Response.json({ total_response_cost: totalResponseCost });
		}

		// Fetch all disaster record IDs linked to the given disaster event
		const disasterRecords = await dr
			.select({ id: disasterRecordsTable.id })
			.from(disasterRecordsTable)
			.where(eq(disasterRecordsTable.disasterEventId, disaster_event_id));

		const recordIds = disasterRecords.map((record) => record.id);
		if (recordIds.length === 0) {
			return Response.json({ total_response_cost: 0 });
		}

		// Fetch all disruption linked to the disaster records
		const disruptions = await dr
			.select({
				responseCost: disruptionTable.responseCost,
			})
			.from(disruptionTable)
			.where(inArray(disruptionTable.recordId, recordIds));

		// Calculate total response cost
		for (const disruption of disruptions) {
			// Convert values to numbers safely
			const responseCostTotal = disruption.responseCost
				? Number(disruption.responseCost)
				: 0;
			totalResponseCost += responseCostTotal;
		}

		return Response.json({ total_response_cost: totalResponseCost });
	} catch (error) {
		console.error("Error fetching repair cost:", error);
		return Response.json({ error: "Internal server error" }, { status: 500 });
	}
};
