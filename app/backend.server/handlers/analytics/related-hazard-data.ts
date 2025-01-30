import { fetchRelatedHazardData } from "~/backend.server/models/analytics/related-hazard-data";

/**
 * Handler function to fetch related Hazard Cluster and Hazard Type.
 * @param specificHazardId - ID of the specific hazard
 * @returns Related hazard data
 * @throws Error if no related hazard data is found
 */
export async function getRelatedHazardDataHandler(specificHazardId: string) {
  // Fetch related hazard data from the database model
  const relatedData = await fetchRelatedHazardData(specificHazardId);

  if (!relatedData) {
    throw new Error(
      `No related hazard data found for specificHazardId: ${specificHazardId}`
    );
  }

  return relatedData;
}
