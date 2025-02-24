import { json } from "@remix-run/node";
import type { LoaderFunction } from "@remix-run/node";
import { getHazardImpact } from "~/backend.server/handlers/analytics/hazardImpact";
import type { HazardImpactFilters } from "~/types/hazardImpact";

export const loader: LoaderFunction = async ({ request }) => {
    const url = new URL(request.url);

    // Required parameters
    const sectorId = url.searchParams.get("sectorId");
    if (!sectorId) {
        return json({ success: false, error: "Sector ID is required" }, { status: 400 });
    }

    // Optional parameters
    const hazardTypeId = url.searchParams.get("hazardTypeId");
    const hazardClusterId = url.searchParams.get("hazardClusterId");
    const specificHazardId = url.searchParams.get("specificHazardId");
    const geographicLevelId = url.searchParams.get("geographicLevelId");
    const fromDate = url.searchParams.get("fromDate");
    const toDate = url.searchParams.get("toDate");
    const disasterEventId = url.searchParams.get("disasterEventId");
    const _disasterEventId = url.searchParams.get("_disasterEventId");

    // Validate date range if provided
    if ((fromDate && !toDate) || (!fromDate && toDate)) {
        return json(
            { success: false, error: "Both fromDate and toDate must be provided together" },
            { status: 400 }
        );
    }

    const filters: HazardImpactFilters = {
        sectorId,
        hazardTypeId,
        hazardClusterId,
        specificHazardId,
        geographicLevelId,
        fromDate,
        toDate,
        disasterEventId,
        _disasterEventId
    };

    const result = await getHazardImpact(filters);
    return json(result);
}
