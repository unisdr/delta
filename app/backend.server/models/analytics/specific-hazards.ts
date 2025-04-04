import { dr } from "~/db.server";
import { hipHazardTable } from "~/drizzle/schema";
import { sql } from "drizzle-orm";

/**
 * Fetch specific hazards from the database based on clusterId and searchQuery.
 */
export async function fetchSpecificHazards(
	clusterId: number,
	searchQuery: string
) {
	return await dr
		.select({
			id: hipHazardTable.id,
			name: hipHazardTable.nameEn,
			description: hipHazardTable.descriptionEn,
		})
		.from(hipHazardTable)
		.where(
			sql`${hipHazardTable.clusterId} = ${clusterId} AND (
        LOWER(${hipHazardTable.id}) LIKE ${"%" + searchQuery + "%"} OR
        LOWER(${hipHazardTable.nameEn}) LIKE ${"%" + searchQuery + "%"}
      )`
		);
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