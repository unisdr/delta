// api/geographic-levels.ts
import { json } from "@remix-run/node";
import { dr } from "~/db.server"; // Database instance
import { divisionTable } from "~/drizzle/schema";
import { sql } from "drizzle-orm";

export async function loader({ request }: { request: Request }) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("query")?.trim() || ""; // Get search query, default to empty

    // Fetch geographic levels based on the query
    const geographicLevels = await dr
      .select({
        id: divisionTable.id,
        name: sql`(name->>'en')::text`.as("name"), // Extract English name from JSON field
      })
      .from(divisionTable)
      .where(
        query
          ? sql`(name->>'en') ILIKE ${`%${query}%`}` // Search for matches if query is provided
          : sql`true` // Return all results if no query
      )
      .limit(10) // Limit to 10 results for efficiency
      .execute();

    return json(geographicLevels); // Return results as JSON
  } catch (error) {
    console.error("Error fetching geographic levels:", error);
    return json(
      { error: "An unexpected error occurred while fetching geographic levels." },
      { status: 500 }
    );
  }
}
