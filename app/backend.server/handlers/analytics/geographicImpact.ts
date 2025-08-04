import { z } from "zod";
import { getGeographicImpact } from "~/backend.server/models/analytics/geographicImpact";

// Input validation schema
const GeographicImpactQuerySchema = z.object({
    sectorId: z.string({
        // required_error: "Sector ID is required",
        invalid_type_error: "Sector ID must be a string"
    }).refine((val) => !isNaN(parseInt(val, 10)), {
        message: "Sector ID must be a valid number"
    }).optional(),
    subSectorId: z.string()
        .refine((val) => !isNaN(parseInt(val, 10)), {
            message: "Sub-sector ID must be a valid number"
        })
        .optional(),
    hazardTypeId: z.string().optional(),
    hazardClusterId: z.string().optional(),
    specificHazardId: z.string().optional(),
    geographicLevelId: z.string().optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
    disasterEventId: z.string().optional(),
    parentId: z.string()
        .refine((val) => !isNaN(parseInt(val, 10)), {
            message: "Parent ID must be a valid number"
        })
        .optional(),
    level: z.string()
        .refine((val) => !isNaN(parseInt(val, 10)), {
            message: "Level must be a valid number"
        })
        .optional()
});

type GeographicImpactFilters = {
    sectorId?: string;
    subSectorId?: string;
    hazardTypeId?: string;
    hazardClusterId?: string;
    specificHazardId?: string;
    geographicLevelId?: string;
    fromDate?: string;
    toDate?: string;
    disasterEventId?: string;
};

export async function handleGeographicImpactQuery(countryAccountsId: string, params: unknown) {
    try {
        // Validate input parameters
        const validParams = GeographicImpactQuerySchema.parse(params);

        // Convert validated params to filters
        const filters: GeographicImpactFilters = {
            sectorId: validParams.sectorId || undefined,
            subSectorId: validParams.subSectorId || undefined,
            hazardTypeId: validParams.hazardTypeId,
            hazardClusterId: validParams.hazardClusterId,
            specificHazardId: validParams.specificHazardId,
            geographicLevelId: validParams.geographicLevelId,
            fromDate: validParams.fromDate,
            toDate: validParams.toDate,
            disasterEventId: validParams.disasterEventId
        };

        // Get GeoJSON data with all filters and tenant isolation
        const result = await getGeographicImpact(countryAccountsId, filters);

        return result;
    } catch (error) {
        console.error("Error in handleGeographicImpactQuery:", error);
        throw error;
    }
}
