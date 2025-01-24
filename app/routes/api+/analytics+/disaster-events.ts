// app/routes/api+/analytics+/disaster-events.ts
import { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { dr } from "~/db.server";
import { sql } from "drizzle-orm";

export const loader: LoaderFunction = async ({ request }) => {
  try {
    const url = new URL(request.url);

    // Retrieve and validate the `query` parameter
    const query = url.searchParams.get("query")?.toLowerCase()?.trim();

    // Construct SQL query with safe validation
    const disasterEvents = await dr.execute(
      sql`
        SELECT id, name_national AS name
        FROM disaster_event
        WHERE ${
          query
            ? sql`LOWER(name_national) LIKE ${"%" + query + "%"}`
            : sql`TRUE`
        }
        ORDER BY start_date_utc
      `
    );

    // Return results in a safe and structured way
    return json({ disasterEvents }, { status: 200 });
  } catch (error) {
    // Improved error logging for debugging
    if (error instanceof Error) {
      console.error("Error fetching disaster events:", error.message);
    } else {
      console.error("Unexpected error:", error);
    }

    // Return user-friendly error response
    return new Response("Failed to fetch disaster events", { status: 500 });
  }
};
