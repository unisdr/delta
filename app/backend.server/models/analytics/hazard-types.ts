
import { eq } from "drizzle-orm";
import { dr } from "~/db.server";
import { hipTypeTable } from "~/drizzle/schema";

export interface HazardType {
  id: string;
  name: string;
}

/**
 * Fetch hazard types directly from the database.
 * @returns Array of hazard types.
 */
export const fetchHazardTypes = async (): Promise<HazardType[]> => {
  try {
    const hazardTypes = await dr
      .select({
        id: hipTypeTable.id,
        name: hipTypeTable.nameEn,
      })
      .from(hipTypeTable);

    return hazardTypes;
  } catch (error) {
    console.error("[fetchHazardTypes] Error fetching hazard types:", error);
    throw new Error("Failed to fetch hazard types from the database.");
  }
};

/**
 * Fetches a hazard type record by its ID.
 * @param {string} hazardTypeId - The ID of the hazard type.
 * @returns {Promise<{ id: string; nameEn: string } | null>} The hazard type record or null if not found.
 */
export async function getHazardTypeById(hazardTypeId: string) {
  const result = await dr.select().from(hipTypeTable).where(eq(hipTypeTable.id, hazardTypeId));
  return result.length > 0 ? result[0] : null;
}
