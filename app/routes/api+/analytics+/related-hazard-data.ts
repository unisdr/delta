import { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { getRelatedHazardDataHandler } from "~/backend.server/handlers/analytics/related-hazard-data";

/**
 * API Loader for fetching related Hazard Cluster and Hazard Type based on Specific Hazard.
 * @param request - HTTP request
 * @returns JSON response containing related Hazard Cluster and Hazard Type
 */
export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const specificHazardId = url.searchParams.get("specificHazardId");

  // Validate required parameter
  if (!specificHazardId) {
    return new Response("specificHazardId is required", { status: 400 });
  }

  try {
    // Fetch related hazard data using the handler
    const relatedData = await getRelatedHazardDataHandler(specificHazardId);
    return (relatedData);
  } catch (error) {
    console.error("Error fetching related hazard data:", error);
    return new Response("Failed to fetch related hazard data", { status: 500 });
  }
};

