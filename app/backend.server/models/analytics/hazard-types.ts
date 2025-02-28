
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
