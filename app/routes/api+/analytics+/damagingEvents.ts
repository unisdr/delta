import { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { dr } from "~/db.server";
import {
  disasterEventTable,
  sectorEventRelationTable,
  sectorTable,
} from "~/drizzle/schema";
import { eq, desc } from "drizzle-orm";

/**
 * Loader function to fetch the top 3 most damaging disaster events,
 * including related sector information.
 */
export const loader: LoaderFunction = async () => {
  try {
    // Construct and execute the query to fetch the required data
    const results = await dr
      .select({
        disasterEventId: disasterEventTable.id,
        disasterName: disasterEventTable.nameNational,
        startDate: disasterEventTable.startDateUTC,
        lastUpdated: disasterEventTable.updatedAt,
        sectorName: sectorTable.name,
        totalDamage: disasterEventTable.subtotaldamageUsd,
        totalLoss: disasterEventTable.subtotalLossesUsd,
        totalRecoveryNeed: disasterEventTable.recoveryNeedsTotalUsd,
      })
      .from(disasterEventTable)
      .leftJoin(
        sectorEventRelationTable,
        eq(sectorEventRelationTable.disasterEventId, disasterEventTable.id) // Use eq for equality comparison
      )
      .leftJoin(
        sectorTable,
        eq(sectorTable.id, sectorEventRelationTable.sectorId) // Use eq for equality comparison
      )
      .orderBy(desc(disasterEventTable.subtotaldamageUsd)) // Use desc for descending order
      .limit(3); // Fetch top 3 most damaging events

    // Return the results as JSON
    return json(results);
  } catch (error) {
    // Log the error for debugging purposes
    console.error("Error fetching damaging events data:", error);

    // Return a JSON response with a 500 status code in case of an error
    return json(
      { error: "Failed to fetch damaging events data" },
      { status: 500 }
    );
  }
};
