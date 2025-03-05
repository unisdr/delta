import { calculateTotalReplacementCost } from "~/backend.server/models/analytics/disaster-events-cost-calculator";
import { dr } from "~/db.server";

export const loader = async ({ params }: { params: { disaster_event_id: string } }) => {
    try {
        const { disaster_event_id } = params;
        if (!disaster_event_id) {
            return Response.json({ error: "Missing disaster_event_id" }, { status: 400 });
        }

        const totalReplacementCost = await calculateTotalReplacementCost(dr, disaster_event_id);
        return Response.json({ total_replacement_cost: totalReplacementCost });

    } catch (error) {
        console.error("Error fetching replacement cost:", error);
        return Response.json({ error: "Internal server error" }, { status: 500 });
    }
};
