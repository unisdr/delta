import type { HazardImpactFilters, HazardImpactResponse } from "~/types/hazardImpact";
import { fetchHazardImpactData } from "~/backend.server/models/analytics/hazardImpact";

export const getHazardImpact = async (countryAccountsId: string, filters: HazardImpactFilters): Promise<HazardImpactResponse> => {
    try {
        // Validate disaster event ID if provided
        if (filters.disasterEventId || filters._disasterEventId) {
            try {
                // Try to parse the UUID to validate it
                const eventId = filters._disasterEventId || filters.disasterEventId;
                if (eventId && !eventId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
                    throw new Error("Invalid disaster event ID format");
                }
            } catch (error) {
                console.error("Error validating disaster event ID:", error);
                return {
                    success: false,
                    error: "Invalid disaster event ID format"
                };
            }
        }

        // Pass tenant context to model for tenant isolation
        const data = await fetchHazardImpactData(countryAccountsId, filters);
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
