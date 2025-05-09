/**
 * @fileoverview API endpoint for retrieving effect details for disaster analysis.
 * This route provides detailed impact data based on various filter criteria.
 * Access is controlled by APPROVED_RECORDS_ARE_PUBLIC environment setting.
 */

import { LoaderFunction, LoaderFunctionArgs, TypedResponse } from "@remix-run/node";
import { getEffectDetailsHandler, EffectDetailsError } from "~/backend.server/handlers/analytics/effectDetails";
import { sanitizeInput, checkRateLimit } from "~/utils/security";
import { authLoaderPublicOrWithPerm } from "~/util/auth";
import { z } from "zod";

/**
 * Interface for the API response structure
 */
interface EffectDetailsResponse {
  success: boolean;
  data?: any; // TODO: Replace with specific type from getEffectDetails
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
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  disasterEventId: z.string().regex(/^\d+$/).optional(),
}).refine(
  (data) => (!data.fromDate || data.toDate) && (!data.toDate || data.fromDate),
  {
    message: "Both fromDate and toDate must be provided together",
    path: ["fromDate", "toDate"],
  }
);

/**
 * Loader function for the effect-details API endpoint.
 * @route GET /api/analytics/effect-details
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
 * @returns {Promise<Response>} JSON response with effect details data or error message
 */
export const loader = authLoaderPublicOrWithPerm("ViewData", async ({ request }: LoaderFunctionArgs) => {
  try {
    /**
     * Rate Limiting
     * Enforces rate limiting to prevent abuse (100 requests per 15 minutes)
     */
    if (!checkRateLimit(request)) {
      return Response.json(
        {
          success: false,
          error: 'Too many requests from this IP, please try again later',
          code: 'RATE_LIMIT_EXCEEDED'
        },
        {
          status: 429,
          headers: {
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
            'Retry-After': '900' // 15 minutes in seconds
          }
        }
      ) as TypedResponse<EffectDetailsResponse>;
    }

    /**
     * Parameter Extraction & Validation
     * Extracts query parameters and validates them using Zod schema
     */
    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams);
    const validationResult = querySchema.safeParse(searchParams);

    if (!validationResult.success) {
      return Response.json(
        {
          success: false,
          error: validationResult.error.issues.map(i => i.message).join(", "),
          code: 'INVALID_PARAMS'
        },
        {
          status: 400,
          headers: {
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff'
          }
        }
      ) as TypedResponse<EffectDetailsResponse>;
    }

    /**
     * Data Retrieval
     * Calls the domain layer handler to fetch and process effect details data
     */
    const validatedData = validationResult.data;
    const data = await getEffectDetailsHandler({
      sectorId: validatedData.sectorId?.toString() || null,
      subSectorId: validatedData.subSectorId?.toString() || null,
      hazardTypeId: validatedData.hazardTypeId || null,
      hazardClusterId: validatedData.hazardClusterId || null,
      specificHazardId: validatedData.specificHazardId || null,
      geographicLevelId: validatedData.geographicLevelId || null,
      fromDate: validatedData.fromDate || null,
      toDate: validatedData.toDate || null,
      disasterEventId: validatedData.disasterEventId || null,
    });

    /**
     * Response Construction
     * Returns the data with proper security headers
     */
    return Response.json(data, {
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block'
      }
    }) as TypedResponse<EffectDetailsResponse>;

  } catch (error) {
    /**
     * Error Handling
     * Handles all types of errors with appropriate status codes and messages
     */
    console.error('API Error:', error);

    if (error instanceof EffectDetailsError) {
      return Response.json(
        {
          success: false,
          error: error.message,
          code: error.code
        },
        {
          status: error.code === 'INVALID_PARAMS' ? 400 : 500,
          headers: {
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff'
          }
        }
      ) as TypedResponse<EffectDetailsResponse>;
    }

    return Response.json(
      {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff'
        }
      }
    ) as TypedResponse<EffectDetailsResponse>;
  }
});
