/**
 * @fileoverview API endpoint for retrieving most damaging disaster events analysis.
 * This route provides detailed information about high-impact disaster events,
 * following Sendai Framework Priority 1 and UNDRR Technical Guidance.
 * Access is controlled by APPROVED_RECORDS_ARE_PUBLIC environment setting.
 */

import type { LoaderFunctionArgs } from "@remix-run/node";
import { checkRateLimit } from "~/utils/security";
import { handleMostDamagingEventsRequest } from "~/backend.server/handlers/analytics/mostDamagingEvents";
import { authLoaderPublicOrWithPerm } from "~/util/auth";
import { z } from "zod";

/**
 * Interface for the API response structure
 */
interface MostDamagingEventsResponse {
  success: boolean;
  data?: any; // TODO: Replace with specific type from getMostDamagingEvents
  error?: string;
  code?: string;
}

/**
 * Loader function that handles the most damaging events API request
 * @param {LoaderFunctionArgs} args - The Remix loader function arguments
 * @returns {Promise<Response>} JSON response with most damaging events data or error message
 */
export const loader = authLoaderPublicOrWithPerm("ViewData", async ({ request }: LoaderFunctionArgs) => {
  // Rate limiting check
  if (!checkRateLimit(request, 100, 15 * 60 * 1000)) {
    return Response.json({
      success: false,
      error: "Rate limit exceeded. Please try again later.",
      code: 'RATE_LIMIT_EXCEEDED'
    }, {
      status: 429,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Retry-After': '900'
      }
    });
  }

  /**
   * Parameter extraction & validation
   * Extract and validate query parameters using Zod schema
   */
  try {
    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams);

    // Zod validation schema for query parameters
    const querySchema = z.object({
      sectorId: z.string()
        .regex(/^\d+$/, "Sector ID must be numeric")
        .transform(value => value || null),
      subSectorId: z.string()
        .regex(/^\d+$/, "Sub-sector ID must be numeric")
        .transform(value => value || null)
        .optional(),
      hazardTypeId: z.string()
        .regex(/^\d+$/, "Hazard type ID must be numeric")
        .transform(value => value || null)
        .optional(),
      hazardClusterId: z.string()
        .regex(/^\d+$/, "Hazard cluster ID must be numeric")
        .transform(value => value || null)
        .optional(),
      specificHazardId: z.string()
        .regex(/^\d+$/, "Specific hazard ID must be numeric")
        .transform(value => value || null)
        .optional(),
      geographicLevelId: z.string()
        .regex(/^\d+$/, "Geographic level ID must be numeric")
        .transform(value => value || null)
        .optional(),
      fromDate: z.string()
        .datetime("Invalid date format")
        .transform(value => value || null)
        .optional(),
      toDate: z.string()
        .datetime("Invalid date format")
        .transform(value => value || null)
        .optional(),
      disasterEventId: z.string()
        .regex(/^\d+$/, "Disaster event ID must be numeric")
        .transform(value => value || null)
        .optional(),
      sortBy: z.enum(['damages', 'losses', 'eventName', 'createdAt'])
        .transform(value => value || null)
        .optional(),
      sortDirection: z.enum(['asc', 'desc'])
        .transform(value => value || null)
        .optional()
    }).refine(
      (data) => (!data.fromDate || data.toDate) && (!data.toDate || data.fromDate),
      {
        message: "Both fromDate and toDate must be provided together",
        path: ["fromDate", "toDate"]
      }
    );

    const validationResult = querySchema.safeParse(searchParams);

    if (!validationResult.success) {
      return Response.json({
        success: false,
        error: validationResult.error.issues.map(i => i.message).join(", "),
        code: 'INVALID_PARAMS'
      }, {
        status: 400,
        headers: {
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff'
        }
      });
    }

    const params = validationResult.data;

    /**
     * Data retrieval
     * Call the handler with validated parameters to get the most damaging events data
     */
    const result = await handleMostDamagingEventsRequest({
      sectorId: params.sectorId,
      subSectorId: params.subSectorId || null,
      hazardTypeId: params.hazardTypeId || null,
      hazardClusterId: params.hazardClusterId || null,
      specificHazardId: params.specificHazardId || null,
      geographicLevelId: params.geographicLevelId || null,
      fromDate: params.fromDate || null,
      toDate: params.toDate || null,
      disasterEventId: params.disasterEventId || null,
      sortBy: params.sortBy || null,
      sortDirection: params.sortDirection || null
    });

    return Response.json({
      success: true,
      data: result.data
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block'
      }
    });
  } catch (error) {
    console.error("Error in most-damaging-events loader:", error);
    return Response.json({
      success: false,
      error: "Internal server error",
      code: 'INTERNAL_ERROR'
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  }
});
