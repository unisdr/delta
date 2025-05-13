import { LoaderFunction } from "@remix-run/node";
import { getSpecificHazardsHandler } from "~/backend.server/handlers/analytics/specific-hazards"; 
import { authLoaderPublicOrWithPerm } from "~/util/auth";

/**
 * API route to fetch specific hazards.
 * This route is public only if APPROVED_RECORDS_ARE_PUBLIC env variable is true.
 * Otherwise, it requires authentication with the "ViewData" permission.
 *
 * @param {Object} params - Loader function parameters
 * @param {Request} params.request - The incoming HTTP request
 * @returns {Promise<Response>} JSON response with specific hazards or error details
 */
export const loader: LoaderFunction = authLoaderPublicOrWithPerm("ViewData", async ({ request }) => {
  const url = new URL(request.url);

  // Extract query parameters
  const clusterId = parseInt(url.searchParams.get("clusterId") || "", 10);
  const searchQuery = url.searchParams.get("searchQuery")?.toLowerCase() || "";

  try {
    // Call the handler to fetch hazards and wrap response with Response.json()
    const hazards = await getSpecificHazardsHandler(clusterId, searchQuery);
    return new Response(JSON.stringify({ hazards }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Error fetching specific hazards:", error);
    return new Response("Failed to fetch specific hazards", { status: 500 });
  }
});
