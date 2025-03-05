import { calculateTotalRepairCost } from "~/backend.server/models/analytics/disaster-events-cost-calculator";
import { dr } from "~/db.server";



export const loader = async ({ params }: { params: { disaster_event_id: string } }) => {
    try {
        const { disaster_event_id } = params;
        if (!disaster_event_id) {
            return Response.json({ error: "Missing disaster_event_id" }, { status: 400 });
        }

        const totalRepairCost = await calculateTotalRepairCost(dr, disaster_event_id);
        return Response.json({ total_repair_cost: totalRepairCost });

    } catch (error) {
        console.error("Error fetching repair cost:", error);
        return Response.json({ error: "Internal server error" }, { status: 500 });
    }
};
