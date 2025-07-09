
import { LoaderFunction } from "@remix-run/node";
import { getDisasterEvents } from "~/backend.server/handlers/analytics/disaster-events";
import { authLoaderWithPerm, authLoaderGetAuth } from "~/util/auth";
import { getTenantContext } from "~/util/tenant";

/**
 * API route to fetch disaster events.
 * This route requires authentication with the "ViewData" permission.
 * Tenant isolation is enforced by filtering events by the user's country account ID.
 *
 * @param {Object} params - Loader function parameters
 * @param {Request} params.request - The incoming HTTP request
 * @returns {Promise<Response>} JSON response with disaster events or error details
 */
export const loader: LoaderFunction = authLoaderWithPerm("ViewData", async (loaderArgs) => {
  try {
    // Extract user session and tenant context
    const userSession = authLoaderGetAuth(loaderArgs);
    const tenantContext = await getTenantContext(userSession);
    const request = loaderArgs.request;

    const url = new URL(request.url);
    const query = url.searchParams.get("query")?.trim();

    // Fetch disaster events using the handler with tenant context
    const result = await getDisasterEvents(tenantContext, query);

    // Return the full QueryResult object in the response
    return Response.json({ disasterEvents: result }, { status: 200 });
  } catch (error) {
    console.error("Error in API loader:", error);
    return new Response("Failed to fetch disaster events", { status: 500 });
  }
});

