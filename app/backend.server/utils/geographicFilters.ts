// Applies geographic level filters to queries based on division IDs
// Robust support for multiple geojson + map_coords formats

import { SQL, sql, eq } from "drizzle-orm";
import { dr } from "~/db.server";
import { divisionTable } from "~/drizzle/schema";

export interface GeographicFilter {
  id: number;
  names: Record<string, string>;
  geometry: any;
}

const divisionCache = new Map<string, GeographicFilter>();

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s,-]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b(region|province|city|municipality)\b/g, '')
    .trim();
}

export async function getDivisionInfo(geographicLevelId: string): Promise<GeographicFilter | null> {
  console.log('getDivisionInfo', 'Fetching division info for ID:', geographicLevelId);
  const cached = divisionCache.get(geographicLevelId);
  if (cached) return cached;

  const division = await dr
    .select({
      id: divisionTable.id,
      name: divisionTable.name,
      geom: divisionTable.geom
    })
    .from(divisionTable)
    .where(eq(divisionTable.id, parseInt(geographicLevelId)))
    .limit(1);

  if (!division || division.length === 0) {
    console.log("getDivisionInfo", "No division found for ID", geographicLevelId);
    return null;
  }

  const result: GeographicFilter = {
    id: division[0].id,
    names: division[0].name as Record<string, string>,
    geometry: division[0].geom
  };

  divisionCache.set(geographicLevelId, result);
  return result;
}

export function debugMatchedGeoFormat(spatialFootprint: any, divisionId: number): string[] {
  const matches: string[] = [];

  for (const elem of spatialFootprint) {
    const geojson = elem.geojson;
    const mapCoords = elem.map_coords;

    if (geojson?.properties?.division_ids?.includes(divisionId)) {
      matches.push("geojson.properties.division_ids");
    }
    if (geojson?.dts_info?.division_ids?.includes(divisionId)) {
      matches.push("geojson.dts_info.division_ids");
    }
    if (geojson?.dts_info?.division_id === divisionId) {
      matches.push("geojson.dts_info.division_id");
    }
    if (elem.geographic_level) {
      matches.push("geographic_level match");
    }
    if (mapCoords?.mode === 'markers') {
      matches.push("map_coords.mode = markers");
    }
    if (mapCoords?.mode === 'circle') {
      matches.push("map_coords.mode = circle");
    }
    if (mapCoords?.mode === 'rectangle') {
      matches.push("map_coords.mode = rectangle");
    }
    if (mapCoords?.mode === 'polygon') {
      matches.push("map_coords.mode = polygon");
    }
    if (geojson?.features?.some((f: any) => f.geometry?.type === 'Point')) {
      matches.push("geojson.features.geometry = Point");
    }
  }

  return [...new Set(matches)];
}

export async function applyGeographicFilters(
  divisionInfo: GeographicFilter,
  disasterRecordsTable: any,
  baseConditions: SQL[],
  rawSpatialData: any[] | null = null
): Promise<SQL[]> {
  if (!divisionInfo?.id) return baseConditions;

  const divisionId = divisionInfo.id;
  const quotedInt = divisionId.toString(); // Always string
  const quotedJson = `"${quotedInt}"`;     // Quote for JSONPath string match

  if (process.env.NODE_ENV === 'development' && rawSpatialData) {
    const matchedFormats = debugMatchedGeoFormat(rawSpatialData, divisionId);
    console.log("[GeoMatch] Division", divisionId, "Matched Formats:", matchedFormats);

    const preferred = matchedFormats.find((f) => [
      "geojson.properties.division_ids",
      "geojson.dts_info.division_ids",
      "geojson.dts_info.division_id"
    ].includes(f));

    if (preferred) {
      console.log("[GeoMatch] Short-circuiting on preferred match:", preferred);
      // optionally skip adding full spatial filter logic here
      return baseConditions;
    }
  }

  const jsonbCondition = sql`${disasterRecordsTable.spatialFootprint} IS NOT NULL AND (
    ${sql.raw(`jsonb_path_exists("disaster_records"."spatial_footprint", '$[*].geojson.properties.division_ids[*] ? (@ == ${quotedJson})')`)} OR
${sql.raw(`jsonb_path_exists("disaster_records"."spatial_footprint", '$[*].geojson.dts_info.division_ids[*] ? (@ == ${quotedJson})')`)} OR
${sql.raw(`jsonb_path_exists("disaster_records"."spatial_footprint", '$[*].geojson.dts_info.division_id ? (@ == ${quotedJson})')`)} OR
    ${sql.raw(`EXISTS (
      SELECT 1 FROM jsonb_array_elements("disaster_records"."spatial_footprint") AS footprint
      WHERE footprint->>'geographic_level' IN (
        SELECT name->>'en' FROM division WHERE id = ${divisionId}
      )
    )`)} OR
    ${sql.raw(`EXISTS (
      SELECT 1 FROM jsonb_array_elements("disaster_records"."spatial_footprint") AS footprint
      WHERE footprint->'map_coords'->>'mode' = 'markers'
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements((footprint->'map_coords'->'coordinates')::jsonb) AS coord
        WHERE ST_Contains(
          (SELECT geom FROM division WHERE id = ${divisionId}),
          ST_SetSRID(ST_MakePoint(
            (coord->>1)::float,
            (coord->>0)::float
          ), 4326)
        )
      )
    )`)} OR
    ${sql.raw(`EXISTS (
      SELECT 1 FROM jsonb_array_elements("disaster_records"."spatial_footprint") AS footprint
      WHERE footprint->'map_coords'->>'mode' = 'circle'
      AND ST_Intersects(
        (SELECT geom FROM division WHERE id = ${divisionId}),
        ST_Buffer(
          ST_SetSRID(ST_MakePoint(
            (footprint->'map_coords'->'center'->>1)::float,
            (footprint->'map_coords'->'center'->>0)::float
          ), 4326),
          (footprint->'map_coords'->>'radius')::float / 111320.0
        )
      )
    )`)} OR
    ${sql.raw(`EXISTS (
      SELECT 1 FROM jsonb_array_elements("disaster_records"."spatial_footprint") AS footprint
      WHERE footprint->'map_coords'->>'mode' = 'rectangle'
      AND ST_Intersects(
        (SELECT geom FROM division WHERE id = ${divisionId}),
        ST_MakeEnvelope(
          (footprint->'map_coords'->'coordinates'->0->1)::float,
          (footprint->'map_coords'->'coordinates'->0->0)::float,
          (footprint->'map_coords'->'coordinates'->1->1)::float,
          (footprint->'map_coords'->'coordinates'->1->0)::float,
          4326
        )
      )
    )`)} OR
    ${sql.raw(`EXISTS (
      SELECT 1 FROM jsonb_array_elements("disaster_records"."spatial_footprint") AS footprint
      WHERE footprint->'map_coords'->>'mode' = 'polygon'
      AND ST_Intersects(
        (SELECT geom FROM division WHERE id = ${divisionId}),
        ST_SetSRID(ST_MakePolygon(
          ST_MakeLine(
            ARRAY(
              SELECT ST_MakePoint(
                (coord->>1)::float,
                (coord->>0)::float
              )
              FROM jsonb_array_elements((footprint->'map_coords'->'coordinates')::jsonb) AS coord
            )
          )
        ), 4326)
      )
    )`)} OR
    ${sql.raw(`EXISTS (
      SELECT 1 FROM jsonb_array_elements("disaster_records"."spatial_footprint") AS footprint,
                   jsonb_array_elements(footprint->'geojson'->'features') AS feature
      WHERE feature->'geometry'->>'type' = 'Point'
      AND ST_Contains(
        (SELECT geom FROM division WHERE id = ${divisionId}),
        ST_SetSRID(ST_MakePoint(
          (feature->'geometry'->'coordinates'->>0)::float,
          (feature->'geometry'->'coordinates'->>1)::float
        ), 4326)
      )
    )`)}
  )`;

  baseConditions.push(jsonbCondition);
  return baseConditions;
}