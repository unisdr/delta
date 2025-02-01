import { dr } from "~/db.server";
import { sql } from "drizzle-orm";
import {
  disasterEventTable,
  hazardEventTable,
  sectorTable,
} from "~/drizzle/schema";

// Function to fetch hazard events for a given sector
const getHazardEventsForSector = async (
  sectorId: number
): Promise<string[]> => {
  try {
    const results = await dr
      .select({
        hazardEventId: hazardEventTable.id,
      })
      .from(hazardEventTable)
      .innerJoin(
        sectorTable,
        sql`${hazardEventTable.hazardId} = ${sectorTable.id}::TEXT` // Explicitly cast `sector.id` to `TEXT`
      )
      .where(sql`${sectorTable.id} = ${sectorId}`);

    // Explicitly typing the map function result
    return results.map((row: { hazardEventId: string }) => row.hazardEventId);
  } catch (error) {
    console.error("Error fetching hazard events for sector:", error);
    throw new Error("Failed to fetch hazard events for the given sector");
  }
};

// Function to fetch disaster events related to hazard events
const getDisasterEventsForHazards = async (
  hazardEventIds: string[]
): Promise<string[]> => {
  try {
    if (hazardEventIds.length === 0) return [];

    const results = await dr
      .select({
        disasterEventId: disasterEventTable.id,
      })
      .from(disasterEventTable)
      .where(
        sql`${disasterEventTable.hazardEventId} IN (${sql.join(
          hazardEventIds.map((id) => `'${id}'`)
        )})`
      );

    // Explicitly typing the map function result
    return results.map(
      (row: { disasterEventId: string }) => row.disasterEventId
    );
  } catch (error) {
    console.error("Error fetching disaster events for hazard events:", error);
    throw new Error("Failed to fetch disaster events for the given hazards");
  }
};

// Fetch aggregated data for the selected sector
export const fetchSectorImpactData = async (sectorId: number) => {
  try {
    // Step 1: Get hazard events related to the sector
    const hazardEventIds = await getHazardEventsForSector(sectorId);

    if (hazardEventIds.length === 0) {
      throw new Error(`No hazard events found for sector ID ${sectorId}`);
    }

    // Step 2: Get disaster events related to the hazard events
    const disasterEventIds = await getDisasterEventsForHazards(hazardEventIds);

    if (disasterEventIds.length === 0) {
      throw new Error(`No disaster events found for sector ID ${sectorId}`);
    }

    // Step 3: Aggregate data from disaster events
    const eventCountQuery = dr
      .select({ count: sql<number>`COUNT(*)`.as("count") })
      .from(disasterEventTable)
      .where(
        sql`${disasterEventTable.id} IN (${sql.join(
          disasterEventIds.map((id) => `'${id}'`)
        )})`
      );

    const totalsQuery = dr
      .select({
        totalDamage:
          sql<number>`SUM(${disasterEventTable.subtotaldamageUsd})`.as(
            "totalDamage"
          ),
        totalLoss: sql<number>`SUM(${disasterEventTable.subtotalLossesUsd})`.as(
          "totalLoss"
        ),
      })
      .from(disasterEventTable)
      .where(
        sql`${disasterEventTable.id} IN (${sql.join(
          disasterEventIds.map((id) => `'${id}'`)
        )})`
      );

    const timeSeriesQuery = dr
      .select({
        year: sql<number>`EXTRACT(YEAR FROM ${disasterEventTable.startDateUTC})`.as(
          "year"
        ),
        damage: sql<number>`SUM(${disasterEventTable.subtotaldamageUsd})`.as(
          "damage"
        ),
        loss: sql<number>`SUM(${disasterEventTable.subtotalLossesUsd})`.as(
          "loss"
        ),
      })
      .from(disasterEventTable)
      .where(
        sql`${disasterEventTable.id} IN (${sql.join(
          disasterEventIds.map((id) => `'${id}'`)
        )})`
      )
      .groupBy(sql`EXTRACT(YEAR FROM ${disasterEventTable.startDateUTC})`);

    const [eventCount, totals, timeSeries] = await Promise.all([
      eventCountQuery.execute(),
      totalsQuery.execute(),
      timeSeriesQuery.execute(),
    ]);

    return {
      eventCount: eventCount[0]?.count || 0,
      totalDamage: totals[0]?.totalDamage || 0,
      totalLoss: totals[0]?.totalLoss || 0,
      timeSeries,
    };
  } catch (error) {
    console.error("Error fetching sector impact data:", error);
    throw new Error("Failed to fetch sector impact data");
  }
};
