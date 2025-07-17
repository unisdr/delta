import { dr } from "~/db.server";
import { hipHazardTable } from "~/drizzle/schema";
import { sql } from "drizzle-orm";

/**
 * Fetch specific hazards from the database based on clusterId and searchQuery.
 */
export async function fetchSpecificHazards(
  clusterId?: number,
  searchQuery: string = ""
) {
  // Build the base query
  const query = dr
      .select({
          id: hipHazardTable.id,
          name: hipHazardTable.nameEn,
          clusterId: hipHazardTable.clusterId, // Include clusterId for frontend filtering
      })
      .from(hipHazardTable);
  
  // If clusterId is provided, filter by it
  if (clusterId !== undefined && clusterId !== null) {
      // Apply clusterId filter and optional search filter
      if (searchQuery && searchQuery.trim() !== "") {
          return await query.where(
              sql`${hipHazardTable.clusterId} = ${clusterId} AND (
              LOWER(${hipHazardTable.id}) LIKE ${"%" + searchQuery.toLowerCase() + "%"} OR
              LOWER(${hipHazardTable.nameEn}) LIKE ${"%" + searchQuery.toLowerCase() + "%"}
          )`
          );
      } else {
          return await query.where(sql`${hipHazardTable.clusterId} = ${clusterId}`);
      }
  } else {
      // No clusterId filter, but maybe search filter
      if (searchQuery && searchQuery.trim() !== "") {
          return await query.where(
              sql`LOWER(${hipHazardTable.id}) LIKE ${"%" + searchQuery.toLowerCase() + "%"} OR
              LOWER(${hipHazardTable.nameEn}) LIKE ${"%" + searchQuery.toLowerCase() + "%"}`
          );
      } else {
          // No filters at all, return all hazards
          return await query;
      }
  }
}

export interface SpecificHazard {
  id: string;
  nameEn: string;
  clusterId: string;
}
export async function fetchAllSpecificHazards(): Promise<SpecificHazard[]> {
  return await dr
    .select({
      id: hipHazardTable.id,
      nameEn: hipHazardTable.nameEn,
      clusterId: hipHazardTable.clusterId,
    })
    .from(hipHazardTable)
    .orderBy(hipHazardTable.nameEn);
}