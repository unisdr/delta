import { dr } from "~/db.server";
import { sql } from "drizzle-orm";
import { disasterEventTable } from "~/drizzle/schema";

/**
 * Fetch disaster events from the database based on the query parameter.
 * @param query Search query string (optional).
 * @returns an array of disaster events.
 */
export const fetchDisasterEvents = async (query?: string) => {
  try {
    // Add conditions for searching multiple fields
    const queryCondition = query
      ? sql`
        LOWER(name_national) LIKE ${"%" + query.toLowerCase() + "%"} OR 
        LOWER(glide) LIKE ${"%" + query.toLowerCase() + "%"} OR
        LOWER(national_disaster_id) LIKE ${"%" + query.toLowerCase() + "%"} OR
        id::text LIKE ${"%" + query.toLowerCase() + "%"} OR
        LOWER(other_id1) LIKE ${"%" + query.toLowerCase() + "%"}
      `
      : sql`TRUE`;

    // Execute query and return the full result object
    const result = await dr.execute(
      sql`
        SELECT 
          id, 
          name_national AS name, 
          glide, 
          national_disaster_id, 
          other_id1,
          start_date,
          end_date,
          effects_total_usd
        FROM disaster_event
        WHERE ${queryCondition}
        ORDER BY start_date DESC
      `
    );

    return result; // Return the full QueryResult object
  } catch (error) {
    console.error(`[fetchDisasterEvents] Failed with query="${query}":`, error);
    throw new Error("Database query failed. Please try again later.");
  }
};
