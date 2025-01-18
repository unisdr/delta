import { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { dr } from "~/db.server";
import { disasterEventTable } from "~/drizzle/schema";

export const loader: LoaderFunction = async () => {
  try {
    const data = await dr
      .select({
        id: disasterEventTable.id,
        subtotalDamage: disasterEventTable.subtotaldamageUsd,
        subtotalLosses: disasterEventTable.subtotalLossesUsd,
      })
      .from(disasterEventTable)
      .limit(100) // Limit the number of rows for performance
      .orderBy(disasterEventTable.id);

    return json(data);
  } catch (error) {
    console.error("Error fetching damage inventory data:", error);
    throw new Response("Failed to fetch damage inventory data", { status: 500 });
  }
};
