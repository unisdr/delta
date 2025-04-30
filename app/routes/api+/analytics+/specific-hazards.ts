import { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { getSpecificHazardsHandler } from "~/backend.server/handlers/analytics/specific-hazards";

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);

  // Extract query parameters
  const clusterId = parseInt(url.searchParams.get("clusterId") || "", 10);
  const searchQuery = url.searchParams.get("searchQuery")?.toLowerCase() || "";

  try {
    // Call the handler to fetch hazards
    const hazards = await getSpecificHazardsHandler(clusterId, searchQuery);
    return { hazards };
  } catch (error) {
    console.error("Error fetching specific hazards:", error);
    return new Response("Failed to fetch specific hazards", { status: 500 });
  }
};
