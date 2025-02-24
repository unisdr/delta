import { dr } from "~/db.server";
import { hipClusterTable } from "~/drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Fetch hazard clusters from the database.
 */
export async function fetchHazardClusters(classId: string | null) {
  const query = dr
    .select({
      id: hipClusterTable.id,
      name: hipClusterTable.nameEn,
    })
    .from(hipClusterTable);

  if (classId !== null) {
    query.where(eq(hipClusterTable.classId, classId));
  }

  return await query;
}
