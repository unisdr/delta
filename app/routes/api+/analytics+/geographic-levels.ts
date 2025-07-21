// app/routes/api+/analytics+/geographic-levels.ts

import { LoaderFunction } from "@remix-run/node";
import { authLoaderWithPerm } from "~/util/auth";
import { getGeographicLevelsHandler } from "~/backend.server/handlers/analytics/geographicLevelsHandler";

/**
 * Geographic Levels API Endpoint
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
 */
export const loader: LoaderFunction = authLoaderWithPerm("ViewData", async () => {
  try {


    /**
     * Business Logic Delegation
     * Delegate all business logic and database operations to the handler.
     * The API layer only handles HTTP concerns.
     */
    const result = await getGeographicLevelsHandler();

    /**
     * Response Handling
     * Return the handler result directly as JSON response.
     * The handler already includes proper success/error formatting.
     */
    if (!result.success) {
      return Response.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    /**
     * Successful Response
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