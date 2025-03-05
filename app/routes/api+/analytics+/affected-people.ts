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

export const loader: LoaderFunction = async ({ request }) => {
  console.log("Loader called for /api/affected-people");
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

    const totalAffected = await getTotalAffectedPeople(filters);
    return json({
      success: true,
      data: { totalAffectedPeople: totalAffected },
    });
  } catch (error) {
    console.error("Loader error:", error);
    return json(
      { success: false, error: "Failed to fetch total affected people" },
      { status: 500 }
    );
  }
};