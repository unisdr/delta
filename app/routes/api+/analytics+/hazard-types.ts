import { LoaderFunction } from "@remix-run/node";
import { getHazardTypes } from "~/backend.server/handlers/analytics/hazard-types";
import { authLoaderPublicOrWithPerm } from "~/util/auth";


/**
 * This route is public only if APPROVED_RECORDS_ARE_PUBLIC env variable is true.
 * Otherwise, it requires authentication with the "ViewData" permission.
 * @returns {Promise<Response>} JSON response with hazard types or error details
 */

export const loader: LoaderFunction = authLoaderPublicOrWithPerm("ViewData", async () => {
  try {
    const hazardTypes = await getHazardTypes();
    return new Response(JSON.stringify({ hazardTypes }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("[HazardTypesLoader] Error:", error);
    return new Response("Failed to fetch hazard types.", { status: 500 });
  }
});
