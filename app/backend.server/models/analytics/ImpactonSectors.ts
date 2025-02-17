import { dr } from "~/db.server";
import { sql } from "drizzle-orm";
import {
  damagesTable,
  lossesTable,
  disasterRecordsTable,
} from "~/drizzle/schema";
import { and, eq, inArray, or } from "drizzle-orm";
import { getSectorsByParentId } from "./sectors";

// Types
interface TimeSeriesData {
  year: number;
  count: number;
  amount: number;
}

interface SectorImpactData {
  eventCount: number;
  totalDamage: string;
  totalLoss: string;
  eventsOverTime: { [year: string]: string };
  damageOverTime: { [year: string]: string };
  lossOverTime: { [year: string]: string };
}

// Helper function to validate sector ID
const validateSectorId = (sectorId: string): number => {
  if (!sectorId || sectorId.trim() === '') {
    throw new Error("Invalid sector ID provided");
  }
  const numericId = parseInt(sectorId, 10);
  if (isNaN(numericId)) {
    throw new Error("Sector ID must be a valid number");
  }
  return numericId;
};

// Function to get all disaster records for a sector
const getDisasterRecordsForSector = async (sectorId: string): Promise<string[]> => {
  const numericSectorId = validateSectorId(sectorId);

  // Get all subsectors if this is a parent sector
  const subsectors = await getSectorsByParentId(numericSectorId);
  const sectorIds = subsectors.length > 0
    ? [numericSectorId, ...subsectors.map(s => s.id)]
    : [numericSectorId];

  const records = await dr
    .select({ id: disasterRecordsTable.id })
    .from(disasterRecordsTable)
    .where(
      inArray(disasterRecordsTable.sectorId, sectorIds)
    );

  return records.map((record) => record.id);
};

// Function to aggregate damages data
const aggregateDamagesData = async (recordIds: string[]) => {
  if (recordIds.length === 0) return { total: 0, byYear: new Map<number, number>() };

  const damagesData = await dr
    .select({
      year: sql<number>`EXTRACT(YEAR FROM to_timestamp(${disasterRecordsTable.startDate}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))`.as("year"),
      total: sql<number>`
        SUM(
          COALESCE(${damagesTable.publicRepairCostTotalOverride}, 
            ${damagesTable.publicRepairCostUnit} * ${damagesTable.publicRepairUnits}, 0) +
          COALESCE(${damagesTable.privateRepairCostTotalOverride},
            ${damagesTable.privateRepairCostUnit} * ${damagesTable.privateRepairUnits}, 0)
        )`.as("total")
    })
    .from(damagesTable)
    .innerJoin(
      disasterRecordsTable,
      eq(damagesTable.recordId, disasterRecordsTable.id)
    )
    .where(inArray(damagesTable.recordId, recordIds))
    .groupBy(sql`EXTRACT(YEAR FROM to_timestamp(${disasterRecordsTable.startDate}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))`);

  const totalDamage = damagesData.reduce((sum, row) => sum + (row.total || 0), 0);
  const damagesByYear = new Map(damagesData.map(row => [row.year, row.total || 0]));

  return { total: totalDamage, byYear: damagesByYear };
};

// Function to aggregate losses data
const aggregateLossesData = async (recordIds: string[]) => {
  if (recordIds.length === 0) return { total: 0, byYear: new Map<number, number>() };

  const lossesData = await dr
    .select({
      year: sql<number>`EXTRACT(YEAR FROM to_timestamp(${disasterRecordsTable.startDate}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))`.as("year"),
      total: sql<number>`
        SUM(
          COALESCE(${lossesTable.publicTotalCost}, 0) +
          COALESCE(${lossesTable.privateTotalCost}, 0)
        )`.as("total")
    })
    .from(lossesTable)
    .innerJoin(
      disasterRecordsTable,
      eq(lossesTable.recordId, disasterRecordsTable.id)
    )
    .where(inArray(lossesTable.recordId, recordIds))
    .groupBy(sql`EXTRACT(YEAR FROM to_timestamp(${disasterRecordsTable.startDate}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))`);

  const totalLoss = lossesData.reduce((sum, row) => sum + (row.total || 0), 0);
  const lossesByYear = new Map(lossesData.map(row => [row.year, row.total || 0]));

  return { total: totalLoss, byYear: lossesByYear };
};

// Function to get event counts by year
const getEventCountsByYear = async (recordIds: string[]) => {
  if (recordIds.length === 0) return new Map<number, number>();

  const eventCounts = await dr
    .select({
      year: sql<number>`EXTRACT(YEAR FROM to_timestamp(${disasterRecordsTable.startDate}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))`.as("year"),
      count: sql<number>`COUNT(*)`.as("count")
    })
    .from(disasterRecordsTable)
    .where(inArray(disasterRecordsTable.id, recordIds))
    .groupBy(sql`EXTRACT(YEAR FROM to_timestamp(${disasterRecordsTable.startDate}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))`);

  return new Map(eventCounts.map(row => [row.year, row.count]));
};

// Main function to fetch sector impact data
export const fetchSectorImpactData = async (sectorId: string) => {
  try {
    // Get all disaster records for the sector and its subsectors
    const recordIds = await getDisasterRecordsForSector(sectorId);

    // If no records found, return empty data
    if (recordIds.length === 0) {
      return {
        eventCount: 0,
        totalDamage: "0",
        totalLoss: "0",
        eventsOverTime: {},
        damageOverTime: {},
        lossOverTime: {}
      };
    }

    // Get all required data
    const [damagesResult, lossesResult, eventsByYear] = await Promise.all([
      aggregateDamagesData(recordIds),
      aggregateLossesData(recordIds),
      getEventCountsByYear(recordIds)
    ]);

    // Convert Maps to objects for the response
    const eventsOverTime = Object.fromEntries(
      Array.from(eventsByYear.entries()).map(([year, count]) => [year.toString(), count.toString()])
    );

    const damageOverTime = Object.fromEntries(
      Array.from(damagesResult.byYear.entries()).map(([year, amount]) => [year.toString(), amount.toString()])
    );

    const lossOverTime = Object.fromEntries(
      Array.from(lossesResult.byYear.entries()).map(([year, amount]) => [year.toString(), amount.toString()])
    );

    return {
      eventCount: recordIds.length,
      totalDamage: damagesResult.total.toString(),
      totalLoss: lossesResult.total.toString(),
      eventsOverTime,
      damageOverTime,
      lossOverTime
    };
  } catch (error) {
    console.error("Error in fetchSectorImpactData:", error);
    throw error;
  }
};
