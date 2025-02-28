import { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { getHazardClustersHandler } from "~/backend.server/handlers/analytics/hazard-clusters";

/**
 * API route to fetch hazard clusters.
 */
export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const typeId = url.searchParams.get("typeId") || undefined; // Convert null to undefined

  try {
    // Call the handler to fetch hazard clusters
    const clusters = await getHazardClustersHandler(typeId);
    return json({ clusters });
  } catch (error) {
    console.error("Error fetching hazard clusters:", error);
    return new Response("Failed to fetch hazard clusters", { status: 500 });
  }
};
