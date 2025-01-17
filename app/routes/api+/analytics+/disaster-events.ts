import { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { dr } from "~/db.server";
import { disasterEventTable } from "~/drizzle/schema";

export const loader: LoaderFunction = async () => {
  try {
    const disasterEvents = await dr
      .select({
        id: disasterEventTable.id,
        name: disasterEventTable.nameNational,
      })
      .from(disasterEventTable)
      .orderBy(disasterEventTable.startDateUTC);

    return json(disasterEvents || []);
  } catch (error) {
    console.error("Error loading disaster events:", error);
    throw new Response("Failed to fetch disaster events", { status: 500 });
  }
};
