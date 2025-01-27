import { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { dr } from "~/db.server";
import { divisionTable } from "~/drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Fetch geographic levels from the database.
 */
export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const parentId = url.searchParams.get("parentId");

  try {
    const query = dr
      .select({
        id: divisionTable.id,
        name: divisionTable.name,
      })
      .from(divisionTable);

    if (parentId) {
      query.where(eq(divisionTable.parentId, parseInt(parentId)));
    }

    const levels = await query;

    return json({ levels });
  } catch (error) {
    console.error("Error fetching geographic levels:", error);
    throw new Response("Failed to fetch geographic levels", { status: 500 });
  }
};