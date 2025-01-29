// app/routes/api+/analytics+/disaster-events.ts
import { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { getDisasterEvents } from "~/backend.server/handlers/analytics/disaster-events";

export const loader: LoaderFunction = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("query")?.trim();

    // Fetch disaster events using the handler
    const result = await getDisasterEvents(query);

    // Return the full QueryResult object in the response
    return json({ disasterEvents: result }, { status: 200 });
  } catch (error) {
    console.error("Error in API loader:", error);
    return new Response("Failed to fetch disaster events", { status: 500 });
  }
};

