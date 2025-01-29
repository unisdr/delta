import { fetchSpecificHazards } from "~/backend.server/models/analytics/specific-hazards";

/**
 * Handler to validate inputs and process fetching specific hazards.
 */
export async function getSpecificHazardsHandler(
  clusterId: number,
  searchQuery: string
) {
  if (isNaN(clusterId)) {
    throw new Error("Invalid clusterId parameter");
  }

  // Fetch specific hazards using the raw query logic
  const hazards = await fetchSpecificHazards(clusterId, searchQuery);
  return hazards;
}
