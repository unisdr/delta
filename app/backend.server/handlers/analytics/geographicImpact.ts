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
    parentId: z.string().optional(),
    level: z.string().optional()
});

export async function handleGeographicImpactQuery(params: unknown) {
    try {
        // Validate input parameters
        const validParams = GeographicImpactQuerySchema.parse(params);
        
        // Convert string parameters to numbers where needed
        const processedParams = {
            ...validParams,
            level: validParams.level ? parseInt(validParams.level, 10) : 1,
            parentId: validParams.parentId ? parseInt(validParams.parentId, 10) : undefined
        };

        // Validate numeric parameters
        if (processedParams.level < 1 || processedParams.level > 3) {
            throw new Error("Invalid level: must be between 1 and 3");
        }

        if (processedParams.parentId && processedParams.parentId < 1) {
            throw new Error("Invalid parentId: must be a positive number");
        }
        
        // Get geographic impact data
        const result = await getGeographicImpact(processedParams);
        
        // Validate response data structure
        if (!result || !result.features) {
            throw new Error("Invalid response data structure");
        }

        // Check if we have any features
        if (result.features.length === 0) {
            console.warn(`No features found for sector ${processedParams.sectorId}`);
        }

        // Check if we have any non-zero values
        const hasValues = result.features.some(feature => 
            (feature.properties?.totalDamage || 0) > 0 || 
            (feature.properties?.totalLoss || 0) > 0
        );

        if (!hasValues) {
            console.warn(`No damage or loss values found for sector ${processedParams.sectorId}`);
        }

        return result;
    } catch (error) {
        console.error("Error in handleGeographicImpactQuery:", error);
        throw error;
    }
}
