import { z } from "zod";
import { getGeographicImpact } from "~/backend.server/models/analytics/geographicImpact";

// Input validation schema
const GeographicImpactQuerySchema = z.object({
    sectorId: z.string({
        required_error: "Sector ID is required",
        invalid_type_error: "Sector ID must be a string"
    }),
    hazardTypeId: z.string().optional(),
    specificHazardId: z.string().optional(),
    geographicLevelId: z.string().optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
    disasterEventId: z.string().optional(),
});

export async function handleGeographicImpactQuery(params: unknown) {
    try {
        // Validate input parameters
        const validParams = GeographicImpactQuerySchema.parse(params);
        
        // Get geographic impact data
        const result = await getGeographicImpact(validParams);
        
        // Validate response data structure
        if (!result || !result.features) {
            throw new Error("Invalid response data structure");
        }

        // Check if we have any features
        if (result.features.length === 0) {
            console.warn(`No features found for sector ${validParams.sectorId}`);
        }

        // Check if we have any non-zero values
        const hasValues = result.features.some(feature => 
            (feature.properties?.totalDamage || 0) > 0 || 
            (feature.properties?.totalLoss || 0) > 0
        );

        if (!hasValues) {
            console.warn(`No damage or loss values found for sector ${validParams.sectorId}`);
        }

        return result;

    } catch (error) {
        console.error("Error in handleGeographicImpactQuery:", error);
        
        if (error instanceof z.ZodError) {
            throw new Error("Invalid query parameters: " + error.message);
        }

        throw error;
    }
}
