import { json } from "@remix-run/node";
import { dr } from "~/db.server"; // Correct import path
import { disasterEventTable } from "~/drizzle/schema";
import { sql } from "drizzle-orm";

// Loader function for autocomplete suggestions
export async function loader({ request }: { request: Request }) {
  try {
    // Parse the request URL and extract the search query
    const url = new URL(request.url);
    const query = url.searchParams.get("query")?.trim() || ""; // Allow empty query

    // Fetch disaster events based on the search query
    const disasterEvents = await dr
      .select({
        id: disasterEventTable.id,
        name: disasterEventTable.nameNational,
      })
      .from(disasterEventTable)
      .where(
        query
          ? sql`${disasterEventTable.nameNational} ILIKE ${`%${query}%`}` // Filter by query if provided
          : sql`true` // Return all results if query is empty
      )
      .limit(10) // Limit results for autocomplete dropdown
      .execute();

    // Return the disaster events as JSON
    return (disasterEvents);
  } catch (error) {
    console.error("Error fetching disaster events:", error);
    return Response.json(
      { error: "An unexpected error occurred while fetching disaster events." },
      { status: 500 }
    );
  }
}
