import { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { getImpactOnSector } from "~/backend.server/handlers/analytics/ImpactonSectors";

export const loader: LoaderFunction = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const sectorId = url.searchParams.get("sectorId");
    const filters = {
      startDate: url.searchParams.get("fromDate"),
      endDate: url.searchParams.get("toDate"),
      hazardType: url.searchParams.get("hazardTypeId"),
      hazardCluster: url.searchParams.get("hazardClusterId"),
      specificHazard: url.searchParams.get("specificHazardId"),
      geographicLevel: url.searchParams.get("geographicLevelId"),
      disasterEvent: url.searchParams.get("disasterEventId"),
    };

    // Input validation
    if (!sectorId) {
      return Response.json(
        { success: false, error: "Sector ID is required" },
        { status: 400 }
      );
    }

    // Validate that sectorId is a valid format (numeric string)
    if (!/^\d+$/.test(sectorId)) {
      return Response.json(
        { success: false, error: "Invalid Sector ID format - must be numeric" },
        { status: 400 }
      );
    }

    // Call the handler to fetch sector impact data
    const result = await getImpactOnSector(sectorId, filters);

    if (!result.success) {
      return Response.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // Return successful response
    return Response.json(
      { success: true, data: result.data },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store', // Disable caching to ensure fresh data
        },
      }
    );
  } catch (error) {
    console.error("Error in ImpactOnSectors loader:", error);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
};
