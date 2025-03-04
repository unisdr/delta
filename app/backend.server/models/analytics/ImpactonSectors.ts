/**
 * ImpactonSectors.ts
 * 
 * This module implements sector-based disaster impact calculations following international standards:
 * 
 * 1. Sendai Framework for Disaster Risk Reduction 2015-2030
 *    Reference: https://www.undrr.org/publication/sendai-framework-disaster-risk-reduction-2015-2030
 *    - Target C: Reduce direct disaster economic loss
 *    - Indicators C-2 and C-3: Direct agricultural loss and economic loss to all other damaged or destroyed productive assets
 * 
 * 2. UNDRR Technical Guidance (2017)
 *    Reference: https://www.preventionweb.net/publication/technical-guidance-monitoring-and-reporting-progress
 *    - Section B: Methodology for Economic Loss Assessment
 *    - Pages 43-45: Sectoral damage calculation methods
 * 
 * 3. World Bank Damage and Loss Assessment (DaLA) Methodology
 *    Reference: https://openknowledge.worldbank.org/handle/10986/2403
 *    - Chapter 3: Damage calculation as replacement cost
 *    - Chapter 4: Loss calculation including flow disruptions
 */

import { dr } from "~/db.server";
import { sql } from "drizzle-orm";
import {
  damagesTable,
  lossesTable,
  disasterRecordsTable,
  disasterEventTable,
  hazardousEventTable,
  hipHazardTable,
  hipClusterTable,
  divisionTable,
  sectorDisasterRecordsRelationTable,
  sectorTable
} from "~/drizzle/schema";
import { and, eq, inArray, ilike, SQL, exists, like } from "drizzle-orm";
import { getSectorsByParentId } from "./sectors";
import {
  calculateDamages,
  calculateLosses,
  createAssessmentMetadata,
  calculateFaoAgriculturalDamage,
  calculateFaoAgriculturalLoss
} from "~/backend.server/utils/disasterCalculations";
import type {
  DisasterImpactMetadata,
  FaoAgriculturalDamage,
  FaoAgriculturalLoss,
  FaoAgriSubsector
} from "~/types/disasterCalculations";

// Types
/*
interface TimeSeriesData {
  year: number;
  count: number;
  amount: number;
}*/

interface Filters {
  startDate?: string | null;
  endDate?: string | null;
  hazardType?: string | null;
  hazardCluster?: string | null;
  specificHazard?: string | null;
  geographicLevel?: string | null;
  disasterEvent?: string | null;
  _disasterEventId?: string | null;
  /** 
   * Assessment type following UNDRR Technical Guidance:
   * - 'rapid': Quick assessment within first 2 weeks
   * - 'detailed': Comprehensive assessment after 2+ weeks
   */
  assessmentType?: 'rapid' | 'detailed';
  /** 
   * Confidence level based on World Bank DaLA methodology:
   * - 'low': Limited data availability or rapid assessment
   * - 'medium': Partial data with some field verification
   * - 'high': Complete data with full field verification
   */
  confidenceLevel?: 'low' | 'medium' | 'high';
}

interface SectorImpactData {
  /** Total number of disaster events affecting the sector */
  eventCount: number;
  /** Total damage in local currency (replacement cost of destroyed assets) */
  totalDamage: string;
  /** Total losses in local currency (changes in economic flows) */
  totalLoss: string;
  /** Time series of event counts by year */
  eventsOverTime: { [year: string]: string };
  /** Time series of damages by year */
  damageOverTime: { [year: string]: string };
  /** Time series of losses by year */
  lossOverTime: { [year: string]: string };
  /** Assessment metadata following international standards */
  metadata: DisasterImpactMetadata;
  /** FAO-specific agricultural impact data if applicable */
  faoAgriculturalImpact?: {
    damage: FaoAgriculturalDamage;
    loss: FaoAgriculturalLoss;
  };
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

// Helper function to get all subsector IDs for a sector
const getAllSubsectorIds = async (sectorId: string): Promise<string[]> => {
  const numericSectorId = validateSectorId(sectorId);

  // Check if this is a parent sector (2 digits)
  if (sectorId.length === 2) {
    // Get all subsectors that start with the parent sector ID
    const pattern = `${sectorId}%`;
    const subsectors = await dr
      .select({ id: sectorTable.id })
      .from(sectorTable)
      .where(like(sql<string>`CAST(${sectorTable.id} AS TEXT)`, pattern));

    return subsectors.map(s => s.id.toString());
  }

  // If not a parent sector, return just the sector ID
  return [sectorId];
};

// Function to get all disaster records for a sector
const getDisasterRecordsForSector = async (
  sectorId: string,
  filters?: Filters
): Promise<string[]> => {
  // Get all relevant sector IDs (including subsectors if parent sector)
  const sectorIds = await getAllSubsectorIds(sectorId);
  const numericSectorIds = sectorIds.map(id => parseInt(id));

  // Build the where conditions
  const conditions: SQL<unknown>[] = [
    exists(
      dr.select()
        .from(sectorDisasterRecordsRelationTable)
        .where(and(
          eq(sectorDisasterRecordsRelationTable.disasterRecordId, disasterRecordsTable.id),
          inArray(sectorDisasterRecordsRelationTable.sectorId, numericSectorIds)
        ))
    ),
    sql<boolean>`LOWER(${disasterRecordsTable.approvalStatus}) = 'completed'`
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
      conditions.push(sql`${hazardousEventTable.hipTypeId} = ${filters.hazardType}`);
    }
    if (filters.hazardCluster) {
      conditions.push(sql`${hazardousEventTable.hipClusterId} = ${filters.hazardCluster}`);
    }
    if (filters.specificHazard) {
      conditions.push(sql`${hazardousEventTable.hipHazardId} = ${filters.specificHazard}`);
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
      hazardousEventTable,
      eq(disasterEventTable.hazardousEventId, hazardousEventTable.id)
    )
    .where(and(...conditions));

  return records.map(record => record.id);
};

const getAgriSubsector = (sectorId: string): FaoAgriSubsector | null => {
  const subsectorMap: { [key: string]: FaoAgriSubsector } = {
    'agri_crops': 'crops',
    'agri_livestock': 'livestock',
    'agri_fisheries': 'fisheries',
    'agri_forestry': 'forestry'
  };
  return subsectorMap[sectorId] || null;
};

// Update aggregateDamagesData function
const aggregateDamagesData = async (
  recordIds: string[],
  sectorId: string
): Promise<{ total: number; byYear: Map<number, number>; faoAgriDamage?: FaoAgriculturalDamage }> => {
  const sectorIds = await getAllSubsectorIds(sectorId);
  const numericSectorIds = sectorIds.map(id => parseInt(id));

  // Get damages for all relevant sectors
  const damages = await dr
    .select({
      totalRepairReplacement: damagesTable.totalRepairReplacement,
      totalRecovery: damagesTable.totalRecovery,
      recordId: damagesTable.recordId,
      sectorId: damagesTable.sectorId
    })
    .from(damagesTable)
    .where(
      and(
        inArray(damagesTable.recordId, recordIds),
        inArray(damagesTable.sectorId, numericSectorIds)
      )
    );

  // Calculate totals and yearly breakdown
  let total = 0;
  const byYear = new Map<number, number>();

  for (const damage of damages) {
    const damageAmount =
      (Number(damage.totalRepairReplacement) || 0) +
      (Number(damage.totalRecovery) || 0);

    total += damageAmount;

    // Get year from record and add to yearly breakdown
    const record = await dr
      .select({
        year: sql<number>`EXTRACT(YEAR FROM to_timestamp(${disasterRecordsTable.startDate}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))::integer`.as("year")
      })
      .from(disasterRecordsTable)
      .where(eq(disasterRecordsTable.id, damage.recordId))
      .limit(1);

    if (record && record[0]?.year) {
      const year = Number(record[0].year);
      byYear.set(year, (byYear.get(year) || 0) + damageAmount);
    }
  }

  return { total, byYear };
};

// Update aggregateLossesData function
const aggregateLossesData = async (
  recordIds: string[],
  sectorId: string
): Promise<{ total: number; byYear: Map<number, number>; faoAgriLoss?: FaoAgriculturalLoss }> => {
  const sectorIds = await getAllSubsectorIds(sectorId);
  const numericSectorIds = sectorIds.map(id => parseInt(id));

  // Get losses for all relevant sectors
  const losses = await dr
    .select({
      publicCostTotal: lossesTable.publicCostTotal,
      privateCostTotal: lossesTable.privateCostTotal,
      recordId: lossesTable.recordId,
      sectorId: lossesTable.sectorId
    })
    .from(lossesTable)
    .where(
      and(
        inArray(lossesTable.recordId, recordIds),
        inArray(lossesTable.sectorId, numericSectorIds)
      )
    );

  // Calculate totals and yearly breakdown
  let total = 0;
  const byYear = new Map<number, number>();

  for (const loss of losses) {
    const lossAmount =
      (Number(loss.publicCostTotal) || 0) +
      (Number(loss.privateCostTotal) || 0);

    total += lossAmount;

    // Get year from record and add to yearly breakdown
    const record = await dr
      .select({
        year: sql<number>`EXTRACT(YEAR FROM to_timestamp(${disasterRecordsTable.startDate}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))::integer`.as("year")
      })
      .from(disasterRecordsTable)
      .where(eq(disasterRecordsTable.id, loss.recordId))
      .limit(1);

    if (record && record[0]?.year) {
      const year = Number(record[0].year);
      byYear.set(year, (byYear.get(year) || 0) + lossAmount);
    }
  }

  return { total, byYear };
};

// Function to get event counts by year
const getEventCountsByYear = async (recordIds: string[]): Promise<Map<number, number>> => {
  if (recordIds.length === 0) return new Map();

  const eventCounts = await dr
    .select({
      year: sql<number>`EXTRACT(YEAR FROM to_timestamp(${disasterRecordsTable.startDate}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))::integer`.as("year"),
      count: sql<number>`COUNT(*)`.as("count")
    })
    .from(disasterRecordsTable)
    .where(inArray(disasterRecordsTable.id, recordIds))
    .groupBy(sql`EXTRACT(YEAR FROM to_timestamp(${disasterRecordsTable.startDate}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))::integer`);

  return new Map(eventCounts.map(row => [row.year, row.count]));
};

/**
 * Fetches comprehensive sector impact data following multiple international standards:
 * 
 * 1. Sendai Framework for Disaster Risk Reduction:
 *    - Target C: Economic loss calculation
 *    - Target D: Critical infrastructure damage
 *    - Target B: Affected people in sector
 * 
 * 2. World Bank DaLA Methodology:
 *    - Separate tracking of damage and losses
 *    - Time-series analysis for recovery monitoring
 * 
 * 3. UNDRR Technical Guidance:
 *    - Assessment types (rapid vs detailed)
 *    - Confidence levels for data quality
 * 
 * @param sectorId - ID of the sector to analyze
 * @param filters - Optional filters for data selection
 * @returns Comprehensive sector impact data with metadata
 */
export async function fetchSectorImpactData(
  sectorId: string,
  filters?: Filters
): Promise<SectorImpactData> {
  try {
    const recordIds = await getDisasterRecordsForSector(sectorId, filters);
    const [damagesResult, lossesResult, eventCounts] = await Promise.all([
      aggregateDamagesData(recordIds, sectorId),
      aggregateLossesData(recordIds, sectorId),
      getEventCountsByYear(recordIds)
    ]);

    // Create assessment metadata
    const metadata = createAssessmentMetadata(
      filters?.assessmentType || 'detailed',
      filters?.confidenceLevel || 'medium'
    );

    // Only include FAO data if both damage and loss calculations are available
    const faoAgriculturalImpact = damagesResult.faoAgriDamage && lossesResult.faoAgriLoss
      ? {
        damage: damagesResult.faoAgriDamage,
        loss: lossesResult.faoAgriLoss
      }
      : undefined;

    return {
      eventCount: recordIds.length,
      totalDamage: damagesResult.total.toString(),
      totalLoss: lossesResult.total.toString(),
      eventsOverTime: Object.fromEntries([...eventCounts].map(([year, count]) => [year.toString(), count.toString()])),
      damageOverTime: Object.fromEntries([...damagesResult.byYear].map(([year, amount]) => [year.toString(), amount.toString()])),
      lossOverTime: Object.fromEntries([...lossesResult.byYear].map(([year, amount]) => [year.toString(), amount.toString()])),
      metadata,
      faoAgriculturalImpact
    };
  } catch (error) {
    console.error("Error in fetchSectorImpactData:", error);
    throw error;
  }
}
