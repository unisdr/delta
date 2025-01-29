import { fetchHazardClusters } from "~/backend.server/models/analytics/hazard-clusters";

/**
 * Handler to process fetching hazard clusters.
 */
export async function getHazardClustersHandler(classId?: string) {
  const parsedClassId = classId ? parseInt(classId, 10) : null; // Changed `undefined` to `null`

  // Validate classId if provided
  if (classId && isNaN(parsedClassId!)) {
    throw new Error("Invalid classId parameter");
  }

  // Fetch hazard clusters using the raw query logic
  return await fetchHazardClusters(parsedClassId); // Ensure null is passed when classId is absent
}
