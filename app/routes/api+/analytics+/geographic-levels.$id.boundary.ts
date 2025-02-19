import { LoaderFunction, json } from "@remix-run/node";
import { db } from "~/backend.server/db";
import { division } from "~/drizzle/schema";
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
    const id = parseInt(params.id as string);
    if (isNaN(id)) {
      throw new Error("Invalid geographic level ID");
    }

    const result = await db.select({ 
      geojson: division.geojson 
    })
    .from(division)
    .where(eq(division.id, id))
    .limit(1);

    if (!result.length || !result[0].geojson) {
      console.error(`No boundary data found for geographic level ${id}`);
      throw new Error("Boundary data not found");
    }

    // Validate GeoJSON structure
    const geojson = result[0].geojson;
    if (!geojson.type || !geojson.coordinates) {
      console.error(`Invalid GeoJSON structure for geographic level ${id}:`, geojson);
      throw new Error("Invalid boundary data format");
    }

    console.log(`Successfully fetched boundary for geographic level ${id}`);
    return json(geojson);
  } catch (error) {
    console.error("Error fetching geographic boundary:", error);
    throw new Response("Failed to fetch geographic boundary", { status: 500 });
  }
}
