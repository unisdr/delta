import { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { dr } from "~/db.server";
import { hipHazardTable } from "~/drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Fetch specific hazards from the database.
 */
export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const clusterId = url.searchParams.get("clusterId");

  try {
    const query = dr
      .select({
        id: hipHazardTable.id,
        name: hipHazardTable.nameEn,
        description: hipHazardTable.descriptionEn,
      })
      .from(hipHazardTable);

    if (clusterId) {
      query.where(eq(hipHazardTable.clusterId, parseInt(clusterId)));
    }

    const hazards = await query;

    return json({ hazards });
  } catch (error) {
    console.error("Error fetching specific hazards:", error);
    throw new Response("Failed to fetch specific hazards", { status: 500 });
  }
};