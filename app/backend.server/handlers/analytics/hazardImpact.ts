import type { HazardImpactFilters, HazardImpactResponse } from "~/types/hazardImpact";
import { fetchHazardImpactData } from "~/backend.server/models/analytics/hazardImpact";

export const getHazardImpact = async (filters: HazardImpactFilters): Promise<HazardImpactResponse> => {
    try {
        const data = await fetchHazardImpactData(filters);
        return {
            success: true,
            data
        };
    } catch (error) {
        console.error("Error fetching hazard impact data:", error);
        return {
            success: false,
            error: "Failed to fetch hazard impact data"
        };
    }
};
