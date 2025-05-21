/**
 * @fileoverview API endpoint for retrieving related hazard data based on specific hazard ID.
 * This route provides hazard type and cluster information for a given specific hazard.
 * Access is controlled by APPROVED_RECORDS_ARE_PUBLIC environment setting.
 */

import { LoaderFunctionArgs, TypedResponse } from "@remix-run/node";
import { getRelatedHazardDataHandler } from "~/backend.server/handlers/analytics/related-hazard-data";
import { authLoaderPublicOrWithPerm } from "~/util/auth";
import { z } from "zod";

/**
 * Interface for the API response structure
 */
interface RelatedHazardDataResponse {
  success: boolean;
  data?: {
    hazardClusterId: string;
    hazardTypeId: string;
  };
  error?: string;
  code?: string;
}

/**
 * Zod schema for validating query parameters
 */
const querySchema = z.object({
  specificHazardId: z.string()
    .regex(/^\d+$/, "Specific Hazard ID must be numeric")
});

/**
 * Loader function for the related hazard data API endpoint.
 * @route GET /api/analytics/related-hazard-data
 * @param {LoaderFunctionArgs} args - The Remix loader function arguments
 * @authentication Requires ViewData permission if APPROVED_RECORDS_ARE_PUBLIC is false
 * @returns {Promise<TypedResponse<RelatedHazardDataResponse>>} JSON response with related hazard data or error message
 */
export const loader = authLoaderPublicOrWithPerm("ViewData", async ({ request }: LoaderFunctionArgs) => {
  /**
   * Parameter extraction & validation
   * Extract and validate query parameters using Zod schema
   */
  try {
    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams);

    // Validate parameters
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
      }) as TypedResponse<RelatedHazardDataResponse>;
    }

    const { specificHazardId } = validationResult.data;

    /**
     * Data retrieval
     * Fetch related hazard data using the handler
     */
    const relatedData = await getRelatedHazardDataHandler(specificHazardId);

    /**
     * Response construction
     * Build and return the appropriate JSON response
     */
    return Response.json({
      success: true,
      data: relatedData
    }, {
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      }
    }) as TypedResponse<RelatedHazardDataResponse>;
  } catch (error) {
    console.error("Error fetching related hazard data:", error);

    return Response.json({
      success: false,
      error: "Failed to fetch related hazard data",
      code: 'INTERNAL_ERROR'
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      }
    }) as TypedResponse<RelatedHazardDataResponse>;
  }
});
