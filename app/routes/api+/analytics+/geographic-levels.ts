import { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { dr } from "~/db.server";
import { divisionTable } from "~/drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Fetch geographic levels from the database.
 * Returns only level 1 divisions (regions)
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