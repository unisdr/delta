/**
 * @fileoverview API endpoint for retrieving effect details for disaster analysis.
 * This route provides detailed impact data based on various filter criteria.
 * Access is controlled by APPROVED_RECORDS_ARE_PUBLIC environment setting.
 */

import type { LoaderFunctionArgs, TypedResponse } from "@remix-run/node";
import { getEffectDetailsHandler, EffectDetailsError } from "~/backend.server/handlers/analytics/effectDetails";
import { authLoaderPublicOrWithPerm } from "~/util/auth";
import { z } from "zod";
import { json } from "@remix-run/node";

/**
 * Interface for the API response structure
 */
interface EffectDetailsResponse {
  success: boolean;
  data?: any; // TODO: Replace with specific type from getEffectDetails
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  error?: string;
  code?: string;
}

/**
 * Zod schema for validating query parameters
 */
const querySchema = z.object({
  sectorId: z.string()
    .regex(/^\d+$/, "Sector ID must be numeric")
    .transform(Number),
  subSectorId: z.string()
    .regex(/^\d+$/, "Sub-sector ID must be numeric")
    .transform(Number)
    .optional(),
  hazardTypeId: z.string().regex(/^\d+$/).optional(),
  hazardClusterId: z.string().regex(/^\d+$/).optional(),
  specificHazardId: z.string().regex(/^\d+$/).optional(),
  geographicLevelId: z.string().regex(/^\d+$/).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  disasterEventId: z.string().optional(),
  // Pagination parameters
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  pageSize: z.string().regex(/^(10|20|30|40|50)$/).transform(Number).default('10'),
  // Table selection for pagination (damages, losses, disruptions)
  table: z.enum(['damages', 'losses', 'disruptions']).optional(),
});

/**
 * Loader function for the effect-details API endpoint.
 * @route GET /api/analytics/effect-details
 * @param {Object} request - The incoming HTTP request
 * @param {Object} request.url - The request URL containing query parameters
 * @queryParam {string} sectorId - Required. The ID of the sector to filter by
 * @queryParam {string} [subSectorId] - Optional. The ID of the subsector to filter by
 * @queryParam {string} [hazardTypeId] - Optional. Filter by hazard type
 * @queryParam {string} [hazardClusterId] - Optional. Filter by hazard cluster
 * @queryParam {string} [specificHazardId] - Optional. Filter by specific hazard
 * @queryParam {string} [geographicLevelId] - Optional. Filter by geographic level
 * @queryParam {string} [fromDate] - Optional. Start date for filtering (YYYY-MM-DD)
 * @queryParam {string} [toDate] - Optional. End date for filtering (YYYY-MM-DD)
 * @queryParam {string} [disasterEventId] - Optional. Filter by specific disaster event
 * @queryParam {number} [page=1] - Page number for pagination (1-based)
 * @queryParam {number} [pageSize=10] - Number of items per page (10, 20, 30, 40, or 50)
 * @queryParam {string} [table] - Optional. Table to paginate (damages, losses, or disruptions)
 * @returns {Promise<Response>} JSON response with effect details data or error message
 */
export const loader = authLoaderPublicOrWithPerm("ViewData", async ({ request }: LoaderFunctionArgs) => {
  // Process the request
  const url = new URL(request.url);
  const queryParams = Object.fromEntries(url.searchParams);

  // Validate query parameters against the schema
  const result = querySchema.safeParse(queryParams);

  if (!result.success) {
    return json(
      {
        success: false,
        error: 'Invalid query parameters',
        details: result.error.format()
      },
      { status: 400 }
    ) as TypedResponse<EffectDetailsResponse>;
  }

  // Extract and format parameters with proper null/undefined handling
  const {
    page = 1,
    pageSize = 10,
    table,
    sectorId,
    subSectorId,
    hazardTypeId,
    hazardClusterId,
    specificHazardId,
    geographicLevelId,
    fromDate,
    toDate,
    disasterEventId
  } = result.data;

  try {
    // Call the handler with properly typed parameters
    const data = await getEffectDetailsHandler({
      // Required parameters
      sectorId: sectorId ?? null,
      // Optional parameters with null fallback
      subSectorId: subSectorId ?? null,
      hazardTypeId: hazardTypeId ?? null,
      hazardClusterId: hazardClusterId ?? null,
      specificHazardId: specificHazardId ?? null,
      geographicLevelId: geographicLevelId ?? null,
      fromDate: fromDate ?? null,
      toDate: toDate ?? null,
      disasterEventId: disasterEventId ?? null,
      // Pagination parameters
      page,
      pageSize,
      table
    });

    // Return the data with success status
    // Create response object with proper typing
    const responseData: EffectDetailsResponse = {
      success: true,
      data: data,
      // Pagination will be added by the handler if needed
    };

    return json(
      responseData,
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff'
        }
      }
    ) as TypedResponse<EffectDetailsResponse>;
  } catch (error) {
    // Handle expected errors
    if (error instanceof EffectDetailsError) {
      return json(
        {
          success: false,
          error: error.message,
          code: error.code
        },
        { status: 400 }
      ) as TypedResponse<EffectDetailsResponse>;
    }

    // Log unexpected errors for debugging
    console.error('Unexpected error in effect-details endpoint:', error);

    return json(
      {
        success: false,
        error: 'An unexpected error occurred',
        code: 'INTERNAL_SERVER_ERROR'
      },
      { status: 500 }
    ) as TypedResponse<EffectDetailsResponse>;
  }
});
