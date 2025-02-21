import { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { getImpactOnSector } from "~/backend.server/handlers/analytics/ImpactonSectors";

export const loader: LoaderFunction = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const sectorId = url.searchParams.get("sectorId");
    const filters = {
      startDate: url.searchParams.get("startDate"),
      endDate: url.searchParams.get("endDate"),
      hazardType: url.searchParams.get("hazardType"),
      hazardCluster: url.searchParams.get("hazardCluster"),
      specificHazard: url.searchParams.get("specificHazard"),
      geographicLevel: url.searchParams.get("geographicLevel"),
      disasterEvent: url.searchParams.get("disasterEvent"),
    };

    // Input validation
    if (!sectorId) {
      return json(
        { success: false, error: "Sector ID is required" },
        { status: 400 }
      );
    }

    // Validate that sectorId is a valid format (numeric string)
    if (!/^\d+$/.test(sectorId)) {
      return json(
        { success: false, error: "Invalid Sector ID format - must be numeric" },
        { status: 400 }
      );
    }

    // Call the handler to fetch sector impact data
    const result = await getImpactOnSector(sectorId);

    if (!result.success) {
      return json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // Return successful response
    return json(
      { success: true, data: result.data },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        },
      }
    );
  } catch (error) {
    console.error("Error in ImpactOnSectors loader:", error);
    return json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
};
