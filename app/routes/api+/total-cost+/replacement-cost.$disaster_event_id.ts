/**
 * Returns the total repair cost of a disaster_event
 * 
 */
import { dr } from "~/db.server";
import {
	damagesTable,
	disasterRecordsTable,
} from "~/drizzle/schema";
import { eq, inArray } from "drizzle-orm";
import { log } from "console";

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
		// Fetch all disaster record IDs linked to the given disaster event
		const disasterRecords = await dr
			.select({ id: disasterRecordsTable.id })
			.from(disasterRecordsTable)
			.where(eq(disasterRecordsTable.disasterEventId, disaster_event_id));

		const recordIds = disasterRecords.map((record) => record.id);
		if (recordIds.length === 0) {
			return Response.json({ total_repair_cost: 0 });
		}

		// Fetch all damages linked to the disaster records
		const damages = await dr
			.select({
				tdReplacementCostTotal:
					damagesTable.tdReplacementCostTotal,
			})
			.from(damagesTable)
			.where(inArray(damagesTable.recordId, recordIds));

		// Calculate total repair cost
		let totalReplacementCost = 0;

		for (const damage of damages) {
            // Convert values to numbers safely
            const tdReplacementCostTotal = damage.tdReplacementCostTotal ? Number(damage.tdReplacementCostTotal) : 0;
            totalReplacementCost += tdReplacementCostTotal;
        }

		return Response.json({ total_replacement_cost: totalReplacementCost });
	} catch (error) {
		console.error("Error fetching repair cost:", error);
		return Response.json({ error: "Internal server error" }, { status: 500 });
	}
};
