
import {
  fetchHazardTypes,
  HazardType,
} from "~/backend.server/models/analytics/hazard-types";

/**
 * Business logic to get hazard types.
 * @returns Array of hazard types with any necessary transformations applied.
 */
export const getHazardTypes = async (): Promise<HazardType[]> => {
  try {
    // Fetch hazard types from the database
    const hazardTypes = await fetchHazardTypes();

    // Apply any necessary transformations (currently none)
    return hazardTypes;
  } catch (error) {
    console.error("[getHazardTypes] Error:", error);
    throw new Error("Failed to get hazard types.");
  }
};
