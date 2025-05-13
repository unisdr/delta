// app/routes/api+/analytics+/disaster-events.ts
import { LoaderFunction } from "@remix-run/node";
import { getDisasterEvents } from "~/backend.server/handlers/analytics/disaster-events";
import { authLoaderPublicOrWithPerm } from "~/util/auth";

/**
 * API route to fetch disaster events.
 * This route is public only if APPROVED_RECORDS_ARE_PUBLIC env variable is true.
 * Otherwise, it requires authentication with the "ViewData" permission.
 *
 * @param {Object} params - Loader function parameters
 * @param {Request} params.request - The incoming HTTP request
 * @returns {Promise<Response>} JSON response with disaster events or error details
 */
export const loader: LoaderFunction = authLoaderPublicOrWithPerm("ViewData", async ({ request }) => {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("query")?.trim();

    // Fetch disaster events using the handler
    const result = await getDisasterEvents(query);

    // Return the full QueryResult object in the response
    return Response.json({ disasterEvents: result }, { status: 200 });
  } catch (error) {
    console.error("Error in API loader:", error);
    return new Response("Failed to fetch disaster events", { status: 500 });
  }
});

