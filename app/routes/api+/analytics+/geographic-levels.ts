// app/routes/api+/analytics+/geographic-levels.ts

import { LoaderFunction } from "@remix-run/node";
import { authLoaderWithPerm, authLoaderGetAuth } from "~/util/auth";
import { getTenantContext } from "~/util/tenant";
import { getGeographicLevelsHandler } from "~/backend.server/handlers/analytics/geographicLevelsHandler";

/**
 * Geographic Levels API Endpoint
 * 
 * Purpose:
 * - Provides a list of all available geographic levels for the Filters component
 * - Used to populate the geographic level dropdown in the UI
 * - Returns only essential data (id, name, level) to keep response size minimal
 * 
 * Architecture:
 * - API Layer: Handles HTTP request/response and authentication
 * - Handler Layer: Contains business logic and validation
 * - Model Layer: Contains database queries
 * 
 * Related Endpoints:
 * - /geographic-levels/$id/boundary - Fetches geographic boundary data for a specific level
 * 
 * Usage:
 * - Called when initializing the Filters component
 * - No parameters required, returns all level 1 divisions (regions)
 * 
 * Response Format:
 * {
 *   success: boolean,
 *   levels?: [
 *     { id: number, name: Record<string, string>, level: number, parentId: number | null }
 *   ],
 *   error?: string
 * }
 * 
 * @param {Object} params - Loader function parameters
 * @param {Request} params.request - The incoming HTTP request
 * @returns {Promise<Response>} JSON response with geographic levels or error details
 */
export const loader: LoaderFunction = authLoaderWithPerm("ViewData", async (loaderArgs) => {
  try {
    // Extract user session and tenant context
    const userSession = authLoaderGetAuth(loaderArgs);
    const tenantContext = await getTenantContext(userSession);

    /** Parameter extraction & validation
     * No query parameters are used for this endpoint.
     */
    // No parameters extracted from request

    /** Business Logic Delegation
     * Delegate all business logic and database operations to the handler.
     * The API layer only handles HTTP concerns.
     */
    const result = await getGeographicLevelsHandler(tenantContext);

    /** Response Handling
     * Return the handler result directly as JSON response.
     * The handler already includes proper success/error formatting.
     */
    if (!result.success) {
      return Response.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    /** Successful Response
     * Return the geographic levels data with success status.
     */
    return Response.json({
      success: true,
      levels: result.levels
    });

  } catch (error) {
    console.error("Error in geographic levels API:", error);
    return Response.json(
      {
        success: false,
        error: "Internal server error"
      },
      { status: 500 }
    );
  }
});