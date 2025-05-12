import { LoaderFunction } from "@remix-run/node";
import { getHazardClustersHandler } from "~/backend.server/handlers/analytics/hazard-clusters";

/**
 * API route to fetch hazard clusters.
 */
export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const typeId = url.searchParams.get("typeId") || undefined; // Convert null to undefined

  try {
    // Call the handler to fetch hazard clusters and wrap response with Response.json()
    const clusters = await getHazardClustersHandler(typeId);
    return new Response(JSON.stringify({ clusters }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Error fetching hazard clusters:", error);
    return new Response("Failed to fetch hazard clusters", { status: 500 });
  }
};
