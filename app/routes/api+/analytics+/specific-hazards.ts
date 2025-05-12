import { LoaderFunction } from "@remix-run/node";
import { getSpecificHazardsHandler } from "~/backend.server/handlers/analytics/specific-hazards";

export const loader: LoaderFunction = async ({ request }) => {
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
};
