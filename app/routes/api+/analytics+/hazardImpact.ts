/**
 * @fileoverview API endpoint for retrieving hazard impact data for disaster analysis.
 * This route provides impact data based on various filter criteria.
 * Access is controlled by APPROVED_RECORDS_ARE_PUBLIC environment setting.
 */

import { LoaderFunctionArgs, TypedResponse } from "@remix-run/node";
import { getHazardImpact } from "~/backend.server/handlers/analytics/hazardImpact";
import type { HazardImpactFilters } from "~/types/hazardImpact";
import { authLoaderPublicOrWithPerm } from "~/util/auth";
import { z } from "zod";

/**
 * Interface for the API response structure
 */
interface HazardImpactResponse {
  success: boolean;
  data?: any; // TODO: Replace with specific type from getHazardImpact
  error?: string;
}

/**
 * Zod schema for validating query parameters
 */
const querySchema = z.object({
  sectorId: z.string()
    .regex(/^\d+$/, "Sector ID must be numeric"),
  hazardTypeId: z.string().regex(/^\d+$/).optional(),
  hazardClusterId: z.string().regex(/^\d+$/).optional(),
  specificHazardId: z.string().regex(/^\d+$/).optional(),
  geographicLevelId: z.string().regex(/^\d+$/).optional(),
  fromDate: z.string().optional(), // Allow flexible date formats for compatibility with database records
  toDate: z.string().optional(), // Allow flexible date formats for compatibility with database records
  disasterEventId: z.string().optional(), // Allow UUID format for disaster event IDs
  _disasterEventId: z.string().optional(), // Allow UUID format for disaster event IDs
});

/**
 * Loader function for the hazardImpact API endpoint.
 * @route GET /api/analytics/hazardImpact
 * @param {Object} request - The incoming request object
 * @authentication Requires ViewData permission if APPROVED_RECORDS_ARE_PUBLIC is false
 * @queryParams
 *   - sectorId {string} Optional. Numeric ID of the sector to analyze
 *   - hazardTypeId {string} Optional. Filter by hazard type
 *   - hazardClusterId {string} Optional. Filter by hazard cluster
 *   - specificHazardId {string} Optional. Filter by specific hazard
 *   - geographicLevelId {string} Optional. Filter by geographic level
 *   - fromDate {string} Optional. Start date for the analysis period
 *   - toDate {string} Optional. End date for the analysis period
 *   - disasterEventId {string} Optional. Filter by specific disaster event
 *   - _disasterEventId {string} Optional. Alternative disaster event ID
 * @returns {Promise<Response>} JSON response with hazard impact data or error message
 */
export const loader = authLoaderPublicOrWithPerm("ViewData", async ({ request }: LoaderFunctionArgs) => {
  try {
    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams);

    /**
     * Validate and transform query parameters using Zod schema
     * This ensures type safety and proper format of all inputs
     */
    const validationResult = querySchema.safeParse(searchParams);
    
    if (!validationResult.success) {
      return Response.json(
        {
          success: false,
          error: validationResult.error.issues.map(i => i.message).join(", ")
        },
        { status: 400 }
      ) as TypedResponse<HazardImpactResponse>;
    }

    /**
     * Construct typed filters object from validated parameters
     */
    const filters: HazardImpactFilters = {
      sectorId: validationResult.data.sectorId,
      hazardTypeId: validationResult.data.hazardTypeId,
      hazardClusterId: validationResult.data.hazardClusterId,
      specificHazardId: validationResult.data.specificHazardId,
      geographicLevelId: validationResult.data.geographicLevelId,
      fromDate: validationResult.data.fromDate,
      toDate: validationResult.data.toDate,
      disasterEventId: validationResult.data.disasterEventId,
      _disasterEventId: validationResult.data._disasterEventId,
    };

    /**
     * Data Retrieval and Processing
     * Calls the domain layer handler to fetch and process hazard impact data
     * Handles both successful and error responses from the handler
     */
    const result = await getHazardImpact(filters);

    if (!result.success) {
      return Response.json(
        { success: false, error: result.error },
        { status: 400 }
      ) as TypedResponse<HazardImpactResponse>;
    }

    /**
     * Return successful response with cache control headers
     * Using typed json helper from Remix for better type safety
     */
    return Response.json(
      { success: true, data: result.data },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store' // Disable caching to ensure fresh data
        }
      }
    ) as TypedResponse<HazardImpactResponse>;
  } catch (error) {
    /**
     * Global Error Handler
     * Catches and logs any unexpected errors
     * Returns a generic error message to avoid exposing internal details
     */
    console.error("Error in hazardImpact loader:", error);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    ) as TypedResponse<HazardImpactResponse>;
  }
});