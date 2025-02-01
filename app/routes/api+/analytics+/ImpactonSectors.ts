import { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { getImpactOnSector } from "~/backend.server/handlers/analytics/ImpactonSectors";

export const loader: LoaderFunction = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const sectorIdParam = url.searchParams.get("sectorId");

    if (!sectorIdParam) {
      return new Response("Sector ID is required", { status: 400 });
    }

    const sectorId = parseInt(sectorIdParam, 10);

    if (isNaN(sectorId)) {
      return new Response("Invalid Sector ID format", { status: 400 });
    }

    // Call the handler to fetch sector impact data
    const result = await getImpactOnSector(sectorId);

    // Return the result as JSON
    return json(result, { status: 200 });
  } catch (error) {
    console.error("Error in Impact on Sector API:", error);
    return new Response("Failed to fetch impact on sector", { status: 500 });
  }
};
