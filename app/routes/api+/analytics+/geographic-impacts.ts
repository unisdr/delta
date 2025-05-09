/**
 * @fileoverview API endpoint for retrieving geographic impact data for disaster analysis.
 * This route provides impact data aggregated by geographic divisions.
 * Access is controlled by APPROVED_RECORDS_ARE_PUBLIC environment setting.
 */

import { LoaderFunction, LoaderFunctionArgs, TypedResponse } from "@remix-run/node";
import { handleGeographicImpactQuery } from "~/backend.server/handlers/analytics/geographicImpact";
import { z } from "zod";
import { authLoaderPublicOrWithPerm } from "~/util/auth";

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

/**
 * Loader function for the geographic-impacts API endpoint.
 * @route GET /api/analytics/geographic-impacts
 * @param {Object} request - The incoming request object
 * @authentication Requires ViewData permission if APPROVED_RECORDS_ARE_PUBLIC is false
 * @queryParams
 *   - sectorId {string}. Numeric ID of the sector to analyze
 *   - subSectorId {string}. Numeric ID of the sub-sector
 *   - hazardTypeId {string} Optional. Filter by hazard type
 *   - hazardClusterId {string} Optional. Filter by hazard cluster
 *   - specificHazardId {string} Optional. Filter by specific hazard
 *   - geographicLevelId {string} Optional. Filter by geographic level
 *   - fromDate {string} Optional. Start date for the analysis period
 *   - toDate {string} Optional. End date for the analysis period
 *   - disasterEventId {string} Optional. Filter by specific disaster event
 *   - assessmentType {string} Optional. 'rapid' or 'detailed'
 *   - confidenceLevel {string} Optional. 'low', 'medium', or 'high'
 * @returns {Promise<Response>} GeoJSON response with geographic impact data or error message
 */
export const loader = authLoaderPublicOrWithPerm("ViewData", async ({ request }: LoaderFunctionArgs) => {
    try {
        /**
         * Parameter Extraction & Validation
         * Extracts query parameters and validates them against the Zod schema
         */
        const url = new URL(request.url);
        const params = Object.fromEntries(url.searchParams);
        const validParams = GeographicImpactQuerySchema.parse(params);
        console.log("Processing request with params:", JSON.stringify(validParams, null, 2));

        /**
         * Data Retrieval
         * Calls the domain layer handler to fetch and process geographic impact data
         */
        const result = await handleGeographicImpactQuery(validParams);

        if (!result.success) {
            return Response.json({
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

        /**
         * Response Construction
         * Transforms the result data into GeoJSON format and constructs the response
         */
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

        return Response.json({
            type: "FeatureCollection",
            features
        }, {
            headers: {
                'Content-Type': 'application/geo+json',
                'Cache-Control': 'no-cache'
            }
        });

    } catch (error) {
        /**
         * Error Handling
         * Handles validation and runtime errors, returning appropriate error responses
         */
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

        return Response.json({
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
});