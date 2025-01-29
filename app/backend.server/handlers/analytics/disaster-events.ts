
import { fetchDisasterEvents } from "~/backend.server/models/analytics/disaster-events";

/**
 * Handler to get disaster events with business logic.
 * @param query Search query string (optional).
 * @returns Array of disaster events with applied transformations.
 */
export const getDisasterEvents = async (query?: string) => {
  try {
    // Fetch the full QueryResult object from the model
    const result = await fetchDisasterEvents(query);

    // Return the full QueryResult object as is
    return result;
  } catch (error) {
    console.error("[getDisasterEvents] Error:", error);
    throw new Error("Failed to fetch disaster events");
  }
};
