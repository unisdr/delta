// app/routes/api+/analytics+/sectors.ts
import { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { getSectorsWithSubsectors } from "~/backend.server/handlers/analytics/sectorsHandlers";

export const loader: LoaderFunction = async () => {
  try {
    const sectors = await getSectorsWithSubsectors();
    return json({ sectors });
  } catch (error) {
    console.error("Error fetching sectors:", error);
    return new Response("Failed to fetch sectors", { status: 500 });
  }
};
