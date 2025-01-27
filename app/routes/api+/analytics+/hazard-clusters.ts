import { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { dr } from "~/db.server";
import { hipClusterTable } from "~/drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Fetch hazard clusters from the database.
 */
export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const classId = url.searchParams.get("classId");

  try {
    const query = dr
      .select({
        id: hipClusterTable.id,
        name: hipClusterTable.nameEn,
      })
      .from(hipClusterTable);

    if (classId) {
      query.where(eq(hipClusterTable.classId, parseInt(classId)));
    }

    const clusters = await query;

    return json({ clusters });
  } catch (error) {
    console.error("Error fetching hazard clusters:", error);
    throw new Response("Failed to fetch hazard clusters", { status: 500 });
  }
};