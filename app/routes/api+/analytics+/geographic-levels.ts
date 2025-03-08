import { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { dr } from "~/db.server";
import { divisionTable } from "~/drizzle/schema";
import { eq } from "drizzle-orm";

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
 */
export const loader: LoaderFunction = async ({ request }) => {
  try {
    const query = dr
      .select({
        id: divisionTable.id,
        name: divisionTable.name,
        level: divisionTable.level,
        parentId: divisionTable.parentId,
      })
      .from(divisionTable)
      .where(eq(divisionTable.level, 1));

    const levels = await query;

    return json({ levels });
  } catch (error) {
    console.error("Error fetching geographic levels:", error);
    throw new Response("Failed to fetch geographic levels", { status: 500 });
  }
}