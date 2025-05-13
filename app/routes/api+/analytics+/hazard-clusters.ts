import { LoaderFunction } from "@remix-run/node";
import { getHazardClustersHandler } from "~/backend.server/handlers/analytics/hazard-clusters";
import { authLoaderPublicOrWithPerm } from "~/util/auth"; 

/**
 * API route to fetch hazard clusters.
 * This route is public only if APPROVED_RECORDS_ARE_PUBLIC env variable is true.
 * Otherwise, it requires authentication with the "ViewData" permission.
 *
 * @param {Object} params - Loader function parameters
 * @param {Request} params.request - The incoming HTTP request
 * @returns {Promise<Response>} JSON response with hazard clusters or error details
 */
export const loader: LoaderFunction = authLoaderPublicOrWithPerm("ViewData", async ({ request }) => {
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
});
