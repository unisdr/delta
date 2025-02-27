import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { checkRateLimit } from "~/utils/security";
import { handleMostDamagingEventsRequest } from "~/backend.server/handlers/analytics/mostDamagingEvents";

export async function loader({ request }: LoaderFunctionArgs) {
  // Rate limiting check
  if (!checkRateLimit(request, 100, 15 * 60 * 1000)) {
    return json({
      success: false,
      error: "Rate limit exceeded. Please try again later."
    }, {
      status: 429
    });
  }

  try {
    const url = new URL(request.url);
    const params = {
      sectorId: url.searchParams.get("sectorId"),
      subSectorId: url.searchParams.get("subSectorId"),
      hazardTypeId: url.searchParams.get("hazardTypeId"),
      hazardClusterId: url.searchParams.get("hazardClusterId"),
      specificHazardId: url.searchParams.get("specificHazardId"),
      geographicLevelId: url.searchParams.get("geographicLevelId"),
      fromDate: url.searchParams.get("fromDate"),
      toDate: url.searchParams.get("toDate"),
      disasterEventId: url.searchParams.get("disasterEventId"),
      page: url.searchParams.get("page"),
      pageSize: url.searchParams.get("pageSize"),
      sortBy: url.searchParams.get("sortBy"),
      sortDirection: url.searchParams.get("sortDirection") as 'asc' | 'desc' | null,
    };

    const result = await handleMostDamagingEventsRequest(params);

    if (!result.success) {
      return json({ error: result.error }, { status: 400 });
    }

    return json(result.data);
  } catch (error) {
    console.error("Error in most-damaging-events loader:", error);
    return json({
      success: false,
      error: "Failed to process request"
    }, {
      status: 500
    });
  }
}
