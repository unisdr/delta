import { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { dr } from "~/db.server";
import { divisionTable } from "~/drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Geographic Level Boundary API Endpoint
 * 
 * Purpose:
 * - Provides GeoJSON boundary data for a specific geographic level
 * - Used by the map component to visualize and zoom to selected areas
 * - Follows Remix's resource route pattern for dynamic parameters
 * 
 * Related Endpoints:
 * - /geographic-levels - Lists all available geographic levels
 * 
 * URL Parameters:
 * - id: The ID of the geographic level to fetch boundary data for
 * 
 * Usage:
 * - Called when a user selects a geographic level in the Filters component
 * - Used by ImpactMapOl to update the map visualization
 * 
 * Response Format:
 * - Returns GeoJSON data if available:
 *   {
 *     type: "FeatureCollection",
 *     features: [{
 *       type: "Feature",
 *       geometry: {...},
 *       properties: { id, name, level, parentId }
 *     }]
 *   }
 * 
 * Implementation Notes:
 * - Separate from the main geographic-levels endpoint to:
 *   1. Follow Single Responsibility Principle
 *   2. Optimize performance by loading heavy GeoJSON data only when needed
 *   3. Adhere to REST API best practices
 */
export const loader: LoaderFunction = async ({ params }) => {
  try {
    const { id } = params;
    if (!id) throw new Error("Geographic level ID is required");

    const query = dr
      .select({
        id: divisionTable.id,
        name: divisionTable.name,
        level: divisionTable.level,
        parentId: divisionTable.parentId,
        geojson: divisionTable.geojson,
      })
      .from(divisionTable)
      .where(eq(divisionTable.id, parseInt(id, 10)));

    const division = await query;
    if (!division || division.length === 0) {
      throw new Response("Geographic level not found", { status: 404 });
    }

    // Return the GeoJSON directly if it exists
    if (division[0].geojson) {
      return json(division[0].geojson);
    }

    // If no GeoJSON, create a basic feature
    const geoJSON = {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        geometry: null,
        properties: {
          id: division[0].id,
          name: division[0].name,
          level: division[0].level,
          parentId: division[0].parentId,
        }
      }]
    };

    return json(geoJSON);
  } catch (error) {
    console.error("Error fetching geographic level boundary:", error);
    if (error instanceof Response) throw error;
    throw new Response("Failed to fetch geographic level boundary", { status: 500 });
  }
}
