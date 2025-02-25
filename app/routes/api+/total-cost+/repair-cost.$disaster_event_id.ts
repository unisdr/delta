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
				pdRepairCostTotal:
					damagesTable.pdRepairCostTotal,
				pdRepairCostUnit: damagesTable.pdRepairCostUnit,
				pdRepairUnits: damagesTable.pdRepairUnits,
			})
			.from(damagesTable)
			.where(inArray(damagesTable.recordId, recordIds));

		// Calculate total repair cost
		let totalRepairCost = 0;

		for (const damage of damages) {
            // Convert values to numbers safely
            const pdRepairCostTotal = damage.pdRepairCostTotal ? Number(damage.pdRepairCostTotal) : 0;
            const pdRepairCostUnit = damage.pdRepairCostUnit ? Number(damage.pdRepairCostUnit) : 0;
            const pdRepairUnits = damage.pdRepairUnits ? Number(damage.pdRepairUnits) : 0;
            
            // Calculate partially damage repair cost
            const publicRepairCost = pdRepairCostTotal || (pdRepairCostUnit * pdRepairUnits);

            totalRepairCost += publicRepairCost;
        }

		return Response.json({ total_repair_cost: totalRepairCost });
	} catch (error) {
		console.error("Error fetching repair cost:", error);
		return Response.json({ error: "Internal server error" }, { status: 500 });
	}
};
