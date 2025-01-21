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
const convertToGeoJSON = (divisions: Division[]) => {
  console.log("Raw divisions passed to GeoJSON converter:", divisions);

  return {
    type: "FeatureCollection",
    features: divisions
      .filter(division => division.geojson) // Ensure geojson is not null
      .map((division) => {
        const geometry = division.geojson.geometry.type
          ? division.geojson.geometry
          : JSON.parse(division.geojson).geometry;

        return {
          type: "Feature",
          geometry,
          properties: {
            id: division.id,
            name: division.name,
            totalDamage: Number(division.totalDamage) || 0, // Ensure numeric
            totalAffected: Number(division.totalAffected) || 0, // Ensure numeric
            totalLoss: Number(division.totalLoss) || 0, // Ensure numeric
          },
        };
      }),
  };
};


// Loader to fetch impact data
export const loader = async ({ request }: { request: Request }) => {
  const url = new URL(request.url);

  // Extract query parameters if needed in the future (e.g., filters)
  const divisionId = url.searchParams.get("divisionId");

  try {
    // Run query and log results
    const queryResult = await dr.execute(
      sql`
      SELECT 
        ${divisionTable.id} AS id,
        ${sql<string>`name->>'en'`} AS name,
        COALESCE(
          CASE 
            WHEN (geojson->'properties'->>'totalDamage') ~ '^\d+(\.\d+)?$' THEN (geojson->'properties'->>'totalDamage')::numeric
            ELSE NULL
          END, 0
        ) AS totalDamage,
        COALESCE(
          CASE 
            WHEN (geojson->'properties'->>'totalAffected') ~ '^\d+(\.\d+)?$' THEN (geojson->'properties'->>'totalAffected')::numeric
            ELSE NULL
          END, 0
        ) AS totalAffected,
        COALESCE(
          CASE 
            WHEN (geojson->'properties'->>'totalLoss') ~ '^\d+(\.\d+)?$' THEN (geojson->'properties'->>'totalLoss')::numeric
            ELSE NULL
          END, 0
        ) AS totalLoss,
        ${divisionTable.geojson} AS geojson
      FROM ${divisionTable}
      GROUP BY ${divisionTable.id}
      `
    );

    console.log("Query Result:", queryResult.rows);

    // Convert results to GeoJSON
    const divisions = queryResult.rows as unknown as Division[];
    const geojson = convertToGeoJSON(divisions);

    console.log("GeoJSON Response:", geojson);
    return json(geojson);
  } catch (err) {
    console.error("Error fetching division data:", {
    });
    return json({ error: "Failed to fetch data" }, { status: 500 });
  }
};