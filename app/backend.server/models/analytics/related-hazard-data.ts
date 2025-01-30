import { dr } from "~/db.server";
import {
  hipHazardTable,
  hipClusterTable,
  hipClassTable,
} from "~/drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Fetch related Hazard Cluster and Hazard Type based on Specific Hazard ID.
 * @param specificHazardId - ID of the specific hazard
 * @returns Object containing hazardTypeId and hazardClusterId
 */
export async function fetchRelatedHazardData(specificHazardId: string) {
  try {
    // Perform a join query to fetch related hazard cluster and hazard type
    const result = await dr
      .select({
        hazardClusterId: hipClusterTable.id,
        hazardTypeId: hipClassTable.id,
      })
      .from(hipHazardTable)
      .leftJoin(
        hipClusterTable,
        eq(hipHazardTable.clusterId, hipClusterTable.id)
      )
      .leftJoin(hipClassTable, eq(hipClusterTable.classId, hipClassTable.id))
      .where(eq(hipHazardTable.id, specificHazardId));

    // Return the first result (if any)
    return result[0] || null;
  } catch (error) {
    console.error("Error in fetchRelatedHazardData:", error);
    throw new Error("Database query failed");
  }
}
