import { LoaderFunction } from "@remix-run/node";
import { getSectorsWithSubsectors } from "~/backend.server/handlers/analytics/sectorsHandlers";
import { authLoaderPublicOrWithPerm } from "~/util/auth";

/**
 * API route to fetch sectors with subsectors.
 * This route is public only if APPROVED_RECORDS_ARE_PUBLIC env variable is true.
 * Otherwise, it requires authentication with the "ViewData" permission.
 *
 * @param {Object} params - Loader function parameters
 * @param {Request} params.request - The incoming HTTP request
 * @returns {Promise<Response>} JSON response with sectors and subsectors or error details
 */
export const loader: LoaderFunction = authLoaderPublicOrWithPerm("ViewData", async () => {
  try {
    const sectors = await getSectorsWithSubsectors();
    return new Response(JSON.stringify({ sectors }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Error fetching sectors:", error);
    return new Response("Failed to fetch sectors", { status: 500 });
  }
});
