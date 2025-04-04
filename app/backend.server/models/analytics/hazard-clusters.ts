import { dr } from "~/db.server";
import { hipClusterTable } from "~/drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Fetch hazard clusters from the database.
 */
export async function fetchHazardClusters(typeId: string | null) {
  const query = dr
    .select({
      id: hipClusterTable.id,
      name: hipClusterTable.nameEn,
      typeId: hipClusterTable.typeId,
    })
    .from(hipClusterTable)
    .orderBy(hipClusterTable.nameEn)

  if (typeId !== null) {
    query.where(eq(hipClusterTable.typeId, typeId));
  }

  return await query;
}
