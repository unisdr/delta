import { dr } from "~/db.server";
import { sql } from "drizzle-orm";
import {
  damagesTable,
  lossesTable,
  disasterRecordsTable,
  disasterEventTable,
  hazardEventTable,
  hipHazardTable,
  hipClusterTable,
  divisionTable,
} from "~/drizzle/schema";
import { and, eq, inArray, or, ilike, SQL } from "drizzle-orm";
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

// Cache for division names
const divisionCache = new Map<string, { name: string, normalized: string }>();

// Helper function to normalize text for matching
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

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

// Helper function to get division info with caching
const getDivisionInfo = async (geographicLevelId: string): Promise<{ name: string, normalized: string } | null> => {
  // Check cache first
  const cached = divisionCache.get(geographicLevelId);
  if (cached) {
    return cached;
  }

  // If not in cache, fetch from database
  const division = await dr
    .select({
      name: divisionTable.name
    })
    .from(divisionTable)
    .where(eq(divisionTable.id, parseInt(geographicLevelId)))
    .limit(1);

  if (!division || division.length === 0) {
    return null;
  }

  // Safely convert the name to string
  const divisionName = String(division[0].name);

  const result = {
    name: divisionName,
    normalized: normalizeText(divisionName)
  };

  // Cache the result
  divisionCache.set(geographicLevelId, result);
  return result;
};

// Function to get all disaster records for a sector
const getDisasterRecordsForSector = async (
  sectorId: string,
  filters?: {
    startDate?: string | null;
    endDate?: string | null;
    hazardType?: string | null;
    hazardCluster?: string | null;
    specificHazard?: string | null;
    geographicLevel?: string | null;
    disasterEvent?: string | null;
  }
): Promise<string[]> => {
  const numericSectorId = validateSectorId(sectorId);

  // Get all subsectors if this is a parent sector
  const subsectors = await getSectorsByParentId(numericSectorId);
  const sectorIds = subsectors.length > 0
    ? [numericSectorId, ...subsectors.map(s => s.id)]
    : [numericSectorId];

  // Build the where conditions
  const conditions: SQL<unknown>[] = [
    inArray(disasterRecordsTable.sectorId, sectorIds),
    sql<boolean>`LOWER(${disasterRecordsTable.approvalStatus}) = 'approved'`
  ];

  // Handle geographic level filtering first if present
  if (filters?.geographicLevel) {
    const divisionInfo = await getDivisionInfo(filters.geographicLevel);
    if (divisionInfo) {
      const locationFilter = ilike(disasterRecordsTable.locationDesc, `%${divisionInfo.name}%`);
      const spatialFilter = sql<boolean>`${disasterRecordsTable.spatialFootprint}->>'regions' ILIKE ${`%${divisionInfo.name}%`}`;
      conditions.push(sql<boolean>`(${locationFilter} OR ${spatialFilter})`);
    }
  }

  // Add other filter conditions
  if (filters) {
    if (filters.startDate) {
      conditions.push(sql`${disasterRecordsTable.startDate} >= ${filters.startDate}`);
    }
    if (filters.endDate) {
      conditions.push(sql`${disasterRecordsTable.startDate} <= ${filters.endDate}`);
    }
    if (filters.hazardType) {
      conditions.push(sql`${hipHazardTable.clusterId} = ${filters.hazardType}`);
    }
    if (filters.hazardCluster) {
      conditions.push(sql`${hipClusterTable.id} = ${filters.hazardCluster}`);
    }
    if (filters.specificHazard) {
      conditions.push(sql`${hipHazardTable.id} = ${filters.specificHazard}`);
    }
    if (filters.disasterEvent) {
      // Ensure the disaster event ID is a valid UUID
      try {
        conditions.push(eq(disasterRecordsTable.disasterEventId, filters._disasterEventId || filters.disasterEvent));
      } catch (error) {
        console.error("Invalid disaster event ID format:", error);
        // Return empty array if ID format is invalid
        return [];
      }
    }
  }

  const records = await dr
    .select({ id: disasterRecordsTable.id })
    .from(disasterRecordsTable)
    .leftJoin(
      disasterEventTable,
      eq(disasterRecordsTable.disasterEventId, disasterEventTable.id)
    )
    .leftJoin(
      hazardEventTable,
      eq(disasterEventTable.hazardEventId, hazardEventTable.id)
    )
    .leftJoin(
      hipHazardTable,
      eq(hazardEventTable.hazardId, hipHazardTable.id)
    )
    .leftJoin(
      hipClusterTable,
      eq(hipHazardTable.clusterId, hipClusterTable.id)
    )
    .where(and(...conditions));

  return records.map(record => record.id);
};

// Function to aggregate damages data
const aggregateDamagesData = async (recordIds: string[]): Promise<{ total: number, byYear: Map<number, number> }> => {
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
const aggregateLossesData = async (recordIds: string[]): Promise<{ total: number, byYear: Map<number, number> }> => {
  if (recordIds.length === 0) return { total: 0, byYear: new Map<number, number>() };

  const lossesData = await dr
    .select({
      year: sql<number>`EXTRACT(YEAR FROM to_timestamp(${disasterRecordsTable.startDate}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))`.as("year"),
      total: sql<number>`
        SUM(
          COALESCE(${lossesTable.publicCostTotalOverride}, 0) +
          COALESCE(${lossesTable.privateCostTotalOverride}, 0)
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
const getEventCountsByYear = async (recordIds: string[]): Promise<Map<number, number>> => {
  if (recordIds.length === 0) return new Map();

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
export const fetchSectorImpactData = async (
  sectorId: string,
  filters?: {
    startDate?: string | null;
    endDate?: string | null;
    hazardType?: string | null;
    hazardCluster?: string | null;
    specificHazard?: string | null;
    geographicLevel?: string | null;
    disasterEvent?: string | null;
  }
): Promise<SectorImpactData> => {
  try {
    // Get all relevant disaster records
    const recordIds = await getDisasterRecordsForSector(sectorId, filters);

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

    // Convert Maps to objects with string values
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
