import { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { dr } from "~/db.server";
import { hipClassTable } from "~/drizzle/schema";

/**
 * Fetch hazard types from the database.
 */
export const loader: LoaderFunction = async () => {
  try {
    const hazardTypes = await dr
      .select({
        id: hipClassTable.id,
        name: hipClassTable.nameEn,
      })
      .from(hipClassTable);

    return json({ hazardTypes });
  } catch (error) {
    console.error("Error fetching hazard types:", error);
    throw new Response("Failed to fetch hazard types", { status: 500 });
  }
};