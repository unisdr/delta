import { fetchSpecificHazards } from "~/backend.server/models/analytics/specific-hazards";

/**
 * Handler to validate inputs and process fetching specific hazards.
 * @param clusterId Optional cluster ID to filter hazards by
 * @param searchQuery Optional search query to filter hazards by name
 * @returns Array of specific hazards
 */
export async function getSpecificHazardsHandler(
  clusterId?: number | null,
  searchQuery: string = ""
) {
  // If clusterId is provided, validate it
  if (clusterId !== undefined && clusterId !== null && isNaN(Number(clusterId))) {
    throw new Error("Invalid clusterId parameter");
  }

  // Fetch specific hazards using the raw query logic
  // Pass undefined for clusterId to fetch all hazards
  const hazards = await fetchSpecificHazards(
    clusterId !== undefined && clusterId !== null ? Number(clusterId) : undefined,
    searchQuery
  );

  return hazards;
}
