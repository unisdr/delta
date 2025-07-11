import { LoaderFunction } from "@remix-run/node";
import { dr } from "~/db.server";
import { divisionTable } from "~/drizzle/schema";
import { eq } from "drizzle-orm";
import { authLoaderPublicOrWithPerm } from "~/util/auth";

/**
 * Geographic Levels API Endpoint
 * 
 * Purpose:
 * - Provides a list of all available geographic levels for the Filters component
 * - Used to populate the geographic level dropdown in the UI
 * - Returns only essential data (id, name, level) to keep response size minimal
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
 *   levels: [
 *     { id: number, name: string, level: number, parentId: number | null }
 *   ]
 * }
 * 
 * @param {Object} params - Loader function parameters
 * @param {Request} params.request - The incoming HTTP request
 * @returns {Promise<Response>} JSON response with geographic levels or error details
 */
export const loader: LoaderFunction = authLoaderPublicOrWithPerm("ViewData", async () => {
  try {


    /** Parameter extraction & validation
     * No query parameters are used for this endpoint.
     */
    // No parameters extracted from request

    /** Filter construction
     * Constructs a query to select level 1 divisions (regions) with essential fields.
     */
    const query = dr
      .select({
        id: divisionTable.id,
        name: divisionTable.name,
        level: divisionTable.level,
        parentId: divisionTable.parentId,
      })
      .from(divisionTable)
      .where(eq(divisionTable.level, 1));

    /** Data retrieval
     * Executes the query to fetch geographic levels from the database.
     */
    const levels = await query;

    /** Typed API response
     * Returns the geographic levels in a JSON response with cache control headers.
     */
    return Response.json({ levels });
  } catch (error) {
    console.error("Error fetching geographic levels:", error);
    throw new Response("Failed to fetch geographic levels", { status: 500 });
  }
});