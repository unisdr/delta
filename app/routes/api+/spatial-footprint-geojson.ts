import { dr } from "~/db.server";
import { sql } from "drizzle-orm";
import { authLoaderApiDocs } from "~/util/auth";

export let loader = authLoaderApiDocs(async ({ request }) => {
  const url = new URL(request.url);
  const division_id = url.searchParams.get("division_id");
  const record_id = url.searchParams.get("record_id");

  if (!division_id || !record_id) {
    return new Response(JSON.stringify({ error: "Missing parameters" }), {
      status: 400,
    });
  }

  const query = sql`
    SELECT value -> 'geojson' AS geojson
    FROM disaster_records,
         jsonb_array_elements(spatial_footprint) AS value
    WHERE disaster_records.id = ${record_id}
      AND value -> 'geojson' -> 'properties' ->> 'division_id' = ${division_id}
    LIMIT 1
  `;

  const result = await dr.execute(query);
  const raw = result?.rows?.[0]?.geojson;
  const geojson = typeof raw === "string" ? JSON.parse(raw) : raw;

  if (!geojson || !geojson.geometry) {
    return new Response(JSON.stringify({ error: "No matching geojson found" }), {
      status: 404,
    });
  }

  return new Response(JSON.stringify(geojson), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
