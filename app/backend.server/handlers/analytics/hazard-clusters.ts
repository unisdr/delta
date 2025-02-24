import { fetchHazardClusters } from "~/backend.server/models/analytics/hazard-clusters";

/**
 * Handler to process fetching hazard clusters.
 */
export async function getHazardClustersHandler(classId?: string) {
  // Fetch hazard clusters using the raw query logic
  return await fetchHazardClusters(classId || null);
}
