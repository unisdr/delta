
import { dr } from "~/db.server";
import { hipClassTable } from "~/drizzle/schema";

export interface HazardType {
  id: number;
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
        id: hipClassTable.id,
        name: hipClassTable.nameEn,
      })
      .from(hipClassTable);

    return hazardTypes;
  } catch (error) {
    console.error("[fetchHazardTypes] Error fetching hazard types:", error);
    throw new Error("Failed to fetch hazard types from the database.");
  }
};
