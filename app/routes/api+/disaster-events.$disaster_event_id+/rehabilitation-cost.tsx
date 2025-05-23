/**
 * Returns the total repair cost of a disaster_event
 *
 */

import { dr } from "~/db.server";


import { calculateTotalRehabilitationCost } from "~/backend.server/models/analytics/disaster-events-cost-calculator";

export const loader = async ({
	params,
}: {
	params: { disaster_event_id: string };
}) => {
	try {
		const { disaster_event_id } = params;
		if (!disaster_event_id) {
			return Response.json(
				{ error: "Missing disaster_event_id" },
				{ status: 400 }
			);
		}

		const totalRepairCost = await calculateTotalRehabilitationCost(dr, disaster_event_id);
		return Response.json({ total_repair_cost: totalRepairCost });
	} catch (error) {
		console.error("Error fetching rehabilitation cost:", error);
		return Response.json({ error: "Internal server error" }, { status: 500 });
	}
};
