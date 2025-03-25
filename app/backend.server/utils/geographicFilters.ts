// Applies geographic level filters to queries based on division IDs
// Handles both single division_id and division_ids array in the JSONB structure
// Validates filter logic and joins against division table

import { SQL, sql, eq } from "drizzle-orm";
import { dr } from "~/db.server";
import { divisionTable } from "~/drizzle/schema";

export interface GeographicFilter {
  id: number;
  names: Record<string, string>;
  geometry: any;
}

// Cache for division info
const divisionCache = new Map<string, GeographicFilter>();

// Helper function to normalize text for matching
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')                // Normalize unicode characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w\s,-]/g, ' ')      // Replace special chars with space
    .replace(/\s+/g, ' ')            // Clean up multiple spaces
    .replace(/\b(region|province|city|municipality)\b/g, '') // Remove common geographic terms
    .trim();
}

export async function getDivisionInfo(geographicLevelId: string): Promise<GeographicFilter | null> {
  console.log('getDivisionInfo', 'Fetching division info for ID:', geographicLevelId);
  // Check cache first
  const cached = divisionCache.get(geographicLevelId);
  if (cached) {
    // console.log("getDivisionInfo", "Found in cache", cached);
    return cached;
  }

  // If not in cache, fetch from database
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

  // Cache the result
  divisionCache.set(geographicLevelId, result);
  return result;
}

export async function applyGeographicFilters(
  divisionInfo: GeographicFilter,
  disasterRecordsTable: any,
  baseConditions: SQL[]
): Promise<SQL[]> {
  if (!divisionInfo?.id) {
    return baseConditions;
  }

  // Check division IDs in the JSONB structure using CROSS JOIN for better performance
  const jsonbCondition = sql`
    ${disasterRecordsTable.spatialFootprint} IS NOT NULL AND
    EXISTS (
      SELECT 1
      FROM jsonb_array_elements(${disasterRecordsTable.spatialFootprint}) elem
      WHERE (elem->'geojson'->'dts_info'->>'division_id')::int = ${divisionInfo.id}
         OR ${divisionInfo.id} = ANY(
              SELECT jsonb_array_elements_text(elem->'geojson'->'dts_info'->'division_ids')::int
         )
    )
  `;
  baseConditions.push(jsonbCondition);
  return baseConditions;
}
