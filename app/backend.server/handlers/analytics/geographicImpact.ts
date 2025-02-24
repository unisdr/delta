import { z } from "zod";
import { getGeographicImpact } from "~/backend.server/models/analytics/geographicImpact";

// Input validation schema
const GeographicImpactQuerySchema = z.object({
    sectorId: z.string({
        required_error: "Sector ID is required",
        invalid_type_error: "Sector ID must be a string"
    }),
    subSectorId: z.string().optional(),
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
        
        // Only pass the required parameters to getGeographicImpact
        const result = await getGeographicImpact(
            validParams.sectorId,
            validParams.subSectorId ? parseInt(validParams.subSectorId, 10) : undefined
        );

        // Validate response data structure
        if (!result || !result.success) {
            throw new Error("Invalid response data structure");
        }

        // Transform the result into GeoJSON
        const features = result.divisions.map(division => {
            const values = result.values[division.id.toString()] || { totalDamage: 0, totalLoss: 0 };
            return {
                type: "Feature",
                geometry: division.geojson,
                properties: {
                    id: division.id,
                    name: division.name,
                    totalDamage: values.totalDamage,
                    totalLoss: values.totalLoss
                }
            };
        });

        return {
            type: "FeatureCollection",
            features
        };

    } catch (error) {
        console.error("Error in handleGeographicImpactQuery:", error);
        throw error;
    }
}
