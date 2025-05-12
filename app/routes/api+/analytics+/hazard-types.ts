// app/routes/api+/analytics+/hazard-types.ts
import { LoaderFunction } from "@remix-run/node";
import { getHazardTypes } from "~/backend.server/handlers/analytics/hazard-types";

/**
 * Loader to fetch hazard types via the handler.
 */
export const loader: LoaderFunction = async () => {
  try {
    // Fetch hazard types using the handler
    const hazardTypes = await getHazardTypes();

    // Return hazard types as a JSON response using Response.json()
    return new Response(JSON.stringify({ hazardTypes }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("[HazardTypesLoader] Error:", error);
    return new Response("Failed to fetch hazard types.", { status: 500 });
  }
};
