import { json } from "@remix-run/node";
import type { LoaderFunction } from "@remix-run/node";
import { getTotalAffectedPeople } from "~/backend.server/models/analytics/affected-people";

// Define the filter shape
type FilterValues = {
  hazardTypeId: string | null;
  hazardClusterId: string | null;
  specificHazardId: string | null;
  geographicLevelId: string | null;
  fromDate: string | null;
  toDate: string | null;
};

// Define the return type from getTotalAffectedPeople
type AffectedPeopleTotals = {
  missingTotal: number;
  injuredTotal: number;
  deathsTotal: number;
  directTotal: number;
  displacedTotal: number;
};

export const loader: LoaderFunction = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const filters: FilterValues = {
      hazardTypeId: url.searchParams.get("hazardTypeId") || null,
      hazardClusterId: url.searchParams.get("hazardClusterId") || null,
      specificHazardId: url.searchParams.get("specificHazardId") || null,
      geographicLevelId: url.searchParams.get("geographicLevelId") || null,
      fromDate: url.searchParams.get("fromDate") || null,
      toDate: url.searchParams.get("toDate") || null,
    };

    console.log("Filters received:", filters);

    const totals = await getTotalAffectedPeople(filters);
    return {
      success: true,
      data: totals, // Return the full object with individual totals
    };
  } catch (error) {
    console.error("Loader error:", error);
    return Response.json(
      { success: false, error: "Failed to fetch total affected people" },
      { status: 500 }
    );
  }
};