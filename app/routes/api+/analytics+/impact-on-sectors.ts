import { json } from "@remix-run/node";
import { dr } from "~/db.server";
import { divisionTable } from "~/drizzle/schema";
import { sql } from "drizzle-orm";

// Define the type for division data
interface Division {
  id: number;
  name: string;
  totalDamage: number;
  totalAffected: number;
  totalLoss: any;
  geojson: any;
}

// Utility function to convert divisions to GeoJSON
const convertToGeoJSON = (divisions: Division[]) => ({
  type: "FeatureCollection",
  features: divisions
    .filter(division => division.geojson) // Filter out divisions with null geojson
    .map((division) => ({
      type: "Feature",
      geometry: division.geojson,
      properties: {
        id: division.id,
        name: division.name,
        totalDamage: division.totalDamage,
        totalAffected: division.totalAffected,
        totalLoss: division.totalLoss,
      },
    })),
});

// Loader to fetch impact data
export const loader = async ({ request }: { request: Request }) => {
  const url = new URL(request.url);

  // Extract query parameters if needed in the future (e.g., filters)
  const divisionId = url.searchParams.get("divisionId");

  try {
    // Ensure database connection is initialized
    if (!dr) {
      throw new Error("Database connection is not initialized.");
    }

    // Construct the base query with optional filters
    const filters: any[] = [];
    if (divisionId) {
      filters.push(sql`${divisionTable.id} = ${divisionId}`);
    }

    const whereClause = filters.length > 0 ? sql`WHERE ${sql.join(filters, " AND ")}` : sql``;

    // Query for division data with aggregates
    const queryResult = await dr.execute(
      sql`
      SELECT 
        ${divisionTable.id} AS id,
        ${sql<string>`name->>'en'`} AS name,
        ${sql<number>`COALESCE(SUM(0), 0)`} AS totalDamage,
        ${sql<number>`COALESCE(SUM(0), 0)`} AS totalAffected,
        ${sql<number>`COALESCE(SUM(0), 0)`} AS totalLoss,
        ${divisionTable.geojson} AS geojson
      FROM ${divisionTable}
      ${whereClause}
      GROUP BY ${divisionTable.id}
    `
    );

    // Log the raw query result for debugging
    console.log("Raw Query Result:", queryResult.rows);

    // Convert results to GeoJSON
    const divisions = queryResult.rows as unknown as Division[];
    const geojson = convertToGeoJSON(divisions);

    // Return GeoJSON response
    return json(geojson);
  } catch (err) {
    console.error("Error fetching division data at loader:", err);
    return json({ error: "Failed to fetch data" }, { status: 500 });
  }
};

// Exported utility function for front-end usage
export const fetchImpactData = async (): Promise<any> => {
  try {
    const response = await fetch("/api/analytics/impact-on-sectors");
    if (!response.ok) {
      throw new Error("Failed to fetch impact data.");
    }
    return await response.json();
  } catch (err) {
    console.error("Error fetching impact data from API:", err);
    throw err;
  }
};