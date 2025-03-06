import { json } from "@remix-run/node";
import { handleGeographicImpactQuery } from "~/backend.server/handlers/analytics/geographicImpact";
import { z } from "zod";

// Input validation schema aligned with handler's GeographicImpactQuerySchema
const GeographicImpactQuerySchema = z.object({
    sectorId: z.string({
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
    assessmentType: z.enum(['rapid', 'detailed']).optional(),
    confidenceLevel: z.enum(['low', 'medium', 'high']).optional()
});

export const loader = async ({ request }: { request: Request }) => {
    try {
        const url = new URL(request.url);
        const params = Object.fromEntries(url.searchParams);

        // Validate parameters against schema
        const validParams = GeographicImpactQuerySchema.parse(params);

        console.log("Processing request with params:", JSON.stringify(validParams, null, 2));

        // Get GeoJSON data with validated parameters
        const result = await handleGeographicImpactQuery(validParams);

        if (!result.success) {
            return json({
                type: "FeatureCollection",
                features: [],
                error: result.error || "Failed to get geographic impact data"
            }, {
                status: 500,
                headers: {
                    'Content-Type': 'application/geo+json',
                    'Cache-Control': 'no-cache'
                }
            });
        }

        // Transform the result into GeoJSON format
        const features = result.divisions.map(division => ({
            type: "Feature",
            geometry: division.geojson,
            properties: {
                id: division.id,
                name: division.name,
                level: division.level,
                parentId: division.parentId,
                values: result.values[division.id.toString()] || {
                    totalDamage: 0,
                    totalLoss: 0,
                    metadata: {
                        assessmentType: validParams.assessmentType || 'rapid',
                        confidenceLevel: validParams.confidenceLevel || 'low'
                    },
                    dataAvailability: 'no_data'
                }
            }
        }));

        // Return the GeoJSON with proper content type
        return json({
            type: "FeatureCollection",
            features
        }, {
            headers: {
                'Content-Type': 'application/geo+json',
                'Cache-Control': 'no-cache'
            }
        });

    } catch (error) {
        console.error("Error in geographic-impacts loader:", error);

        let status = 400;
        let message = "Bad request";

        if (error instanceof z.ZodError) {
            message = "Invalid parameters: " + error.errors.map(e => e.message).join(", ");
        } else if (error instanceof Error) {
            message = error.message;
            if (error.message.includes("Internal")) {
                status = 500;
            }
        }

        return json({
            type: "FeatureCollection",
            features: [],
            error: message
        }, {
            status,
            headers: {
                'Content-Type': 'application/geo+json',
                'Cache-Control': 'no-cache'
            }
        });
    }
};