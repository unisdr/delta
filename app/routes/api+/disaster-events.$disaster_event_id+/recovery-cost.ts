import { dr } from "~/db.server";
import { calculateTotalRecoveryCost } from "~/backend.server/models/analytics/disaster-events-cost-calculator";

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

		const totalRecoveryCost = await calculateTotalRecoveryCost(dr, disaster_event_id);
		return Response.json({ total_recovery_cost: totalRecoveryCost });
	} catch (error) {
		console.error("Error fetching recovery cost:", error);
		return Response.json({ error: "Internal server error" }, { status: 500 });
	}
};
