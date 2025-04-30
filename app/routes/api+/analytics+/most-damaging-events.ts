import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { checkRateLimit } from "~/utils/security";
import { handleMostDamagingEventsRequest } from "~/backend.server/handlers/analytics/mostDamagingEvents";

export async function loader({ request }: LoaderFunctionArgs) {
  // Rate limiting check
  if (!checkRateLimit(request, 100, 15 * 60 * 1000)) {
    return Response.json({
      success: false,
      error: "Rate limit exceeded. Please try again later.",
      code: 'RATE_LIMIT_EXCEEDED'
    }, {
      status: 429,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Retry-After': '900'
      }
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

    return Response.json({
      success: true,
      data: result.data
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block'
      }
    });
  } catch (error) {
    console.error("Error in most-damaging-events loader:", error);
    return Response.json({
      success: false,
      error: "Internal server error",
      code: 'INTERNAL_ERROR'
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  }
}
