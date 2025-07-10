/**
 * @fileoverview API endpoint for retrieving sector impact data for disaster analysis.
 * This route provides sector-specific impact data based on various filter criteria.
 * Access is controlled by authentication and tenant isolation.
 */

import { LoaderFunctionArgs, TypedResponse } from "@remix-run/node";
import { getImpactOnSector } from "~/backend.server/handlers/analytics/ImpactonSectors";
import { authLoaderWithPerm, authLoaderGetAuth } from "~/util/auth";
import { getTenantContext } from "~/util/tenant";
import { z } from "zod";
import { getCountrySettingsFromSession } from "~/util/session";

/**
 * Interface for impact analysis filter parameters
 */
interface ImpactFilters {
  startDate: string | null;
  endDate: string | null;
  hazardType: string | null;
  hazardCluster: string | null;
  specificHazard: string | null;
  geographicLevel: string | null;
  disasterEvent: string | null;
}

/**
 * Interface for the API response structure
 */
interface ImpactResponse {
  success: boolean;
  data?: any; // TODO: Replace with specific type from getImpactOnSector
  error?: string;
}

/**
 * Zod schema for validating query parameters
 */
const querySchema = z.object({
  sectorId: z.string()
    .regex(/^\d+$/, "Sector ID must be numeric")
    .transform(Number),

  hazardTypeId: z.string().regex(/^\d+$/).optional(),
  hazardClusterId: z.string().regex(/^\d+$/).optional(),
  specificHazardId: z.string().regex(/^\d+$/).optional(),
  geographicLevelId: z.string().regex(/^\d+$/).optional(),
  disasterEventId: z.string().optional(), // Allow UUID format for disaster event IDs
});

/**
 * Loader function for the ImpactOnSectors API endpoint.
 * @route GET /api/analytics/ImpactonSectors
 * @param {Object} loaderArgs - The loader function arguments
 * @authentication Requires ViewData permission and valid tenant context
 * @queryParams
 *   - sectorId {string} Required. Numeric ID of the sector to analyze
 *   - fromDate {string} Optional. Start date for the analysis period
 *   - toDate {string} Optional. End date for the analysis period
 *   - hazardTypeId {string} Optional. Filter by hazard type
 *   - hazardClusterId {string} Optional. Filter by hazard cluster
 *   - specificHazardId {string} Optional. Filter by specific hazard
 *   - geographicLevelId {string} Optional. Filter by geographic level
 *   - disasterEventId {string} Optional. Filter by specific disaster event
 * @returns {Promise<Response>} JSON response with sector impact data or error message
 */
export const loader = authLoaderWithPerm("ViewData", async (loaderArgs: LoaderFunctionArgs) => {
  try {
    // Extract user session and tenant context
    const userSession = authLoaderGetAuth(loaderArgs);
    const tenantContext = await getTenantContext(userSession);
    const request = loaderArgs.request;

    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams);

    const settings = await getCountrySettingsFromSession(request);
    const currency = settings.currency;

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
      ) as TypedResponse<ImpactResponse>;
    }

    const { sectorId, hazardTypeId, hazardClusterId,
      specificHazardId, geographicLevelId, disasterEventId } = validationResult.data;

    // Get the original query parameters directly from the URL
    // We'll pass the original date format to maintain compatibility with the database records
    const fromDate = url.searchParams.get('fromDate');
    const toDate = url.searchParams.get('toDate');

    /**
     * Construct typed filters object from parameters
     */
    const filters: ImpactFilters = {
      startDate: fromDate,
      endDate: toDate,
      hazardType: hazardTypeId ?? null,
      hazardCluster: hazardClusterId ?? null,
      specificHazard: specificHazardId ?? null,
      geographicLevel: geographicLevelId ?? null,
      disasterEvent: disasterEventId ?? null
    }
    /**
     * Data Retrieval and Processing
     * Calls the domain layer handler to fetch and process sector impact data with tenant isolation
     * Handles both successful and error responses from the handler
     */
    const result = await getImpactOnSector(tenantContext, String(sectorId), filters, currency);

    if (!result.success) {
      return Response.json(
        { success: false, error: result.error },
        { status: 400 }
      ) as TypedResponse<ImpactResponse>;
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
    ) as TypedResponse<ImpactResponse>;
  } catch (error) {
    /**
     * Global Error Handler
     * Catches and logs any unexpected errors
     * Returns a generic error message to avoid exposing internal details
     */
    console.error("Error in ImpactOnSectors loader:", error);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    ) as TypedResponse<ImpactResponse>;
  }
});
