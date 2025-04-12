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
  sectorDisasterRecordsRelationTable,
  sectorTable
} from "~/drizzle/schema";
import { and, eq, inArray, ilike, SQL, exists, like, or } from "drizzle-orm";
import { getSectorsByParentId } from "./sectors";
import { configCurrencies } from "~/util/config";
import { applyGeographicFilters, getDivisionInfo } from "~/backend.server/utils/geographicFilters";
import { parseFlexibleDate, createDateCondition, extractYearFromDate } from "~/backend.server/utils/dateFilters";

type AssessmentType = 'rapid' | 'detailed';
type ConfidenceLevel = 'low' | 'medium' | 'high';

interface DisasterImpactMetadata {
  assessmentType: AssessmentType;
  confidenceLevel: ConfidenceLevel;
  currency: string;
  assessmentDate: string;
  assessedBy: string;
  notes: string;
}

export const createAssessmentMetadata = (
  assessmentType: AssessmentType = 'rapid',
  confidenceLevel: ConfidenceLevel = 'medium'
): DisasterImpactMetadata => {
  const currencies = configCurrencies();
  return {
    assessmentType,
    confidenceLevel,
    currency: currencies[0] || 'USD', // Use first configured currency or USD as fallback
    assessmentDate: new Date().toISOString(),
    assessedBy: 'DTS Analytics System',
    notes: 'Automatically generated assessment based on database records'
  };
};

/**
 * Validates currency codes against ISO 4217 standard
 * Used to ensure consistent monetary reporting across assessments
 * 
 * @param currency - Currency code to validate
 * @returns true if valid ISO 4217 code
 */
export const validateCurrency = (currency: string): boolean => {
  const iso4217Pattern = /^[A-Z]{3}$/;
  return iso4217Pattern.test(currency);
};

interface Filters {
  startDate?: string | null;
  endDate?: string | null;
  hazardType?: string | null;
  hazardCluster?: string | null;
  specificHazard?: string | null;
  geographicLevel?: string | null;
  disasterEvent?: string | null;
  _disasterEventId?: string | null;
  assessmentType?: 'rapid' | 'detailed';
  confidenceLevel?: 'low' | 'medium' | 'high';
}

interface SectorImpactData {
  eventCount: number;
  totalDamage: string | null;
  totalLoss: string | null;
  eventsOverTime: { [year: string]: string };
  damageOverTime: { [year: string]: string };
  lossOverTime: { [year: string]: string };
  metadata: DisasterImpactMetadata;
  faoAgriculturalImpact?: {
    damage: any;
    loss: any;
  };
  dataAvailability: {
    damage: 'available' | 'zero' | 'no_data';
    loss: 'available' | 'zero' | 'no_data';
  };
}

const getAgriSubsector = (sectorId: string): any | null => {
  const subsectorMap: { [key: string]: any } = {
    'agri_crops': 'crops',
    'agri_livestock': 'livestock',
    'agri_fisheries': 'fisheries',
    'agri_forestry': 'forestry'
  };
  return subsectorMap[sectorId] || null;
};

// Function to get all disaster records for a sector
const getDisasterRecordsForSector = async (
  sectorId: string,
  filters?: Filters
): Promise<string[]> => {
  try {
    console.log("Sector ID:", sectorId);

    // Get all relevant sector IDs (including subsectors if parent sector)
    const sectorIds = await getAllSubsectorIds(sectorId);
    const numericSectorIds = sectorIds;
    console.log("Found Sector IDs:", numericSectorIds);


    // Initialize conditions array
    let conditions: SQL[] = [
      sql`${disasterRecordsTable.approvalStatus} = 'published'`
    ];

    // Handle sector filtering using proper hierarchy
    if (sectorIds.length > 0) {
      conditions.push(
        exists(
          dr.select()
            .from(sectorDisasterRecordsRelationTable)
            .where(and(
              eq(sectorDisasterRecordsRelationTable.disasterRecordId, disasterRecordsTable.id),
              inArray(sectorDisasterRecordsRelationTable.sectorId, numericSectorIds)
            ))
        )
      );
    }

    // Apply geographic level filter
    if (filters?.geographicLevel) {
      try {
        const divisionInfo = await getDivisionInfo(filters.geographicLevel);
        if (divisionInfo) {
          // console.log("Geographic Level:", divisionInfo);
          conditions = await applyGeographicFilters(divisionInfo, disasterRecordsTable, conditions);
        }
      } catch (error) {
        console.error('Error applying geographic filter:', error);
      }
    }

    // Add other filter conditions with proper error handling
    if (filters) {
      if (filters.startDate) {
        try {
          const startDate = parseFlexibleDate(filters.startDate);
          if (startDate) {
            conditions.push(createDateCondition(disasterRecordsTable.startDate, startDate, 'gte'));
          } else {
            console.error('Invalid start date format:', filters.startDate);
          }
        } catch (error) {
          console.error('Invalid start date:', error);
        }
      }
      if (filters.endDate) {
        try {
          const endDate = parseFlexibleDate(filters.endDate);
          if (endDate) {
            conditions.push(createDateCondition(disasterRecordsTable.endDate, endDate, 'lte'));
          } else {
            console.error('Invalid end date format:', filters.endDate);
          }
        } catch (error) {
          console.error('Invalid end date:', error);
        }
      }

      // Handle hazard type hierarchy
      if (filters.hazardType) {
        try {
          console.log("Hazard Type filter applied:", filters.hazardType);
          conditions.push(sql`${hazardousEventTable.hipTypeId} = ${filters.hazardType}`);
        } catch (error) {
          console.error('Invalid hazard type ID:', error);
        }
      }
      if (filters.hazardCluster) {
        try {
          console.log("Hazard Cluster filter applied:", filters.hazardCluster);
          conditions.push(sql`${hazardousEventTable.hipClusterId} = ${filters.hazardCluster}`);
        } catch (error) {
          console.error('Invalid hazard cluster ID:', error);
        }
      }
      if (filters.specificHazard) {
        try {
          console.log("Specific Hazard filter applied:", filters.specificHazard);
          conditions.push(sql`${hazardousEventTable.hipHazardId} = ${filters.specificHazard}`);
        } catch (error) {
          console.error('Invalid specific hazard ID:', error);
        }
      }

      // Improved disaster event filtering logic - using the same approach as in hazardImpact.ts
      if (filters.disasterEvent || filters._disasterEventId) {
        try {
          const eventId = filters._disasterEventId || filters.disasterEvent;
          if (eventId) {
            console.log("Disaster Event filter applied:", eventId);
            // Check if it's a UUID (for direct ID matching)
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(eventId)) {
              // Direct ID match for UUID format
              conditions.push(eq(disasterEventTable.id, eventId));
            } else {
              // Text search across multiple fields for non-UUID format
              const searchConditions: SQL[] = [];
              searchConditions.push(sql`LOWER(${disasterEventTable.nameNational}::text) LIKE ${`%${eventId.toLowerCase()}%`}`);
              searchConditions.push(sql`LOWER(${disasterEventTable.id}::text) LIKE ${`%${eventId.toLowerCase()}%`}`);
              searchConditions.push(sql`
                CASE WHEN ${disasterEventTable.glide} IS NOT NULL 
                THEN LOWER(${disasterEventTable.glide}) LIKE ${`%${eventId.toLowerCase()}%`}
                ELSE FALSE END
              `);
              searchConditions.push(sql`
                CASE WHEN ${disasterEventTable.nationalDisasterId} IS NOT NULL 
                THEN LOWER(${disasterEventTable.nationalDisasterId}) LIKE ${`%${eventId.toLowerCase()}%`}
                ELSE FALSE END
              `);
              searchConditions.push(sql`
                CASE WHEN ${disasterEventTable.otherId1} IS NOT NULL 
                THEN LOWER(${disasterEventTable.otherId1}) LIKE ${`%${eventId.toLowerCase()}%`}
                ELSE FALSE END
              `);

            }
          }
        } catch (error) {
          console.error('Error filtering by disaster event:', error);
        }
      }
    }

    // Execute the query with robust error handling
    try {
      // Build the final query with all conditions
      const query = dr
        .select({
          id: disasterRecordsTable.id
        })
        .from(disasterRecordsTable)
        .leftJoin(
          disasterEventTable,
          eq(disasterRecordsTable.disasterEventId, disasterEventTable.id)
        )
        .leftJoin(
          hazardousEventTable,
          eq(disasterEventTable.hazardousEventId, hazardousEventTable.id)
        )
        .where(conditions.length > 0 ? and(...conditions) : sql`TRUE`);

      // Execute the query and map results
      const results = await query;
      console.log("Query success. Total records fetched:", results.length);
      return results.map(r => r.id.toString());
    } catch (error) {
      console.error('Error executing getDisasterRecordsForSector query:', error);
      // Return empty array instead of throwing to prevent cascading failures
      return [];
    }
  } catch (error) {
    console.error('Error in getDisasterRecordsForSector:', error);
    throw error;
  }
};

/**
 * This implementation uses the proper hierarchical structure defined in the sector table
 * rather than relying on ID patterns, making it suitable for all countries.
 * 
 * @param sectorId - The ID of the sector to get subsectors for
 * @returns Array of sector IDs including the input sector and all its subsectors
 */
const getAllSubsectorIds = async (sectorId: string | number | undefined): Promise<number[]> => {
  if (sectorId === undefined || sectorId === null) return [];

  const rootId = Number(sectorId);
  if (isNaN(rootId)) return [];

  console.log("Starting traversal from sectorId:", rootId);

  const result: number[] = [];
  const seen = new Set<number>();
  const queue: number[] = [rootId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (seen.has(currentId)) continue;
    seen.add(currentId);
    result.push(currentId);

    console.debug("Visiting sectorId:", currentId);

    const children = await getSectorsByParentId(currentId);
    console.debug("Found children for", currentId, ":", children.map(c => c.id));

    for (const child of children) {
      if (!seen.has(child.id)) queue.push(child.id);
    }
  }

  console.log("Traversal complete. Collected sector IDs:", result);
  return result;
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

// Update aggregateDamagesData function
const aggregateDamagesData = async (
  recordIds: string[],
  sectorId: string | undefined
): Promise<{ total: number; byYear: Map<number, number>; faoAgriDamage?: any }> => {
  const sectorIds = sectorId ? await getAllSubsectorIds(sectorId) : [];
  const numericSectorIds = sectorIds;

  // First check sectorDisasterRecordsRelation for overrides
  const sectorOverrides = await dr
    .select({
      recordId: sectorDisasterRecordsRelationTable.disasterRecordId,
      sectorId: sectorDisasterRecordsRelationTable.sectorId,
      damageCost: sectorDisasterRecordsRelationTable.damageCost,
      withDamage: sectorDisasterRecordsRelationTable.withDamage
    })
    .from(sectorDisasterRecordsRelationTable)
    .where(
      and(
        inArray(sectorDisasterRecordsRelationTable.disasterRecordId, recordIds),
        numericSectorIds.length > 0 
          ? inArray(sectorDisasterRecordsRelationTable.sectorId, numericSectorIds)
          : undefined
      )
    );

  // Get detailed damages for records without sector overrides
  const detailedDamages = await dr
    .select({
      recordId: damagesTable.recordId,
      sectorId: damagesTable.sectorId,
      totalRepairReplacement: damagesTable.totalRepairReplacement,
      totalRepairReplacementOverride: damagesTable.totalRepairReplacementOverride,
      pdDamageAmount: damagesTable.pdDamageAmount,
      pdRepairCostUnit: damagesTable.pdRepairCostUnit,
      tdDamageAmount: damagesTable.tdDamageAmount,
      tdReplacementCostUnit: damagesTable.tdReplacementCostUnit
    })
    .from(damagesTable)
    .where(
      and(
        inArray(damagesTable.recordId, recordIds),
        numericSectorIds.length > 0 
          ? inArray(damagesTable.sectorId, numericSectorIds)
          : undefined
      )
    );

  let total = 0;
  const byYear = new Map<number, number>();

  // Process each record
  for (const recordId of recordIds) {
    let recordDamageAmount = 0;
    
    // Check sector override first
    const sectorOverride = sectorOverrides.find(
      so => so.recordId === recordId && numericSectorIds.includes(so.sectorId)
    );

    if (sectorOverride?.withDamage && sectorOverride?.damageCost !== null) {
      // Use sector override value
      recordDamageAmount = Number(sectorOverride.damageCost) || 0;
    } else {
      // If no sector override, check detailed damages
      const damage = detailedDamages.find(
        d => d.recordId === recordId && numericSectorIds.includes(d.sectorId)
      );

      if (damage) {
        // Match HazardImpact.ts logic exactly
        if (damage.totalRepairReplacementOverride) {
          recordDamageAmount = Number(damage.totalRepairReplacement) || 0;
        } else {
          // Only include PD repair and TD replacement costs
          recordDamageAmount = 
            (Number(damage.pdDamageAmount) || 0) * (Number(damage.pdRepairCostUnit) || 0) +
            (Number(damage.tdDamageAmount) || 0) * (Number(damage.tdReplacementCostUnit) || 0);
        }
      }
    }

    if (recordDamageAmount > 0) {
      total += recordDamageAmount;

      // Get year and update yearly breakdown
      const record = await dr
        .select({
          year: extractYearFromDate(disasterRecordsTable.startDate).as("year")
        })
        .from(disasterRecordsTable)
        .where(eq(disasterRecordsTable.id, recordId))
        .limit(1);

      if (record && record[0]?.year) {
        const year = Number(record[0].year);
        byYear.set(year, (byYear.get(year) || 0) + recordDamageAmount);
      }
    }
  }

  return { total, byYear };
};

// Update aggregateLossesData function
const aggregateLossesData = async (
  recordIds: string[],
  sectorId: string | undefined
): Promise<{ total: number; byYear: Map<number, number>; faoAgriLoss?: any }> => {
  const sectorIds = sectorId ? await getAllSubsectorIds(sectorId) : [];
  const numericSectorIds = sectorIds;

  // First check sectorDisasterRecordsRelation for overrides
  const sectorOverrides = await dr
    .select({
      recordId: sectorDisasterRecordsRelationTable.disasterRecordId,
      sectorId: sectorDisasterRecordsRelationTable.sectorId,
      lossesCost: sectorDisasterRecordsRelationTable.lossesCost,
      withLosses: sectorDisasterRecordsRelationTable.withLosses
    })
    .from(sectorDisasterRecordsRelationTable)
    .where(
      and(
        inArray(sectorDisasterRecordsRelationTable.disasterRecordId, recordIds),
        numericSectorIds.length > 0 
          ? inArray(sectorDisasterRecordsRelationTable.sectorId, numericSectorIds)
          : undefined
      )
    );

  // Get detailed losses for records without sector overrides
  const detailedLosses = await dr
    .select({
      recordId: lossesTable.recordId,
      sectorId: lossesTable.sectorId,
      publicCostTotal: lossesTable.publicCostTotal,
      publicCostTotalOverride: lossesTable.publicCostTotalOverride,
      publicUnits: lossesTable.publicUnits,
      publicCostUnit: lossesTable.publicCostUnit,
      privateCostTotal: lossesTable.privateCostTotal,
      privateCostTotalOverride: lossesTable.privateCostTotalOverride,
      privateUnits: lossesTable.privateUnits,
      privateCostUnit: lossesTable.privateCostUnit
    })
    .from(lossesTable)
    .where(
      and(
        inArray(lossesTable.recordId, recordIds),
        numericSectorIds.length > 0 
          ? inArray(lossesTable.sectorId, numericSectorIds)
          : undefined
      )
    );

  let total = 0;
  const byYear = new Map<number, number>();

  // Process each record
  for (const recordId of recordIds) {
    let recordLossAmount = 0;

    // Check sector override first
    const sectorOverride = sectorOverrides.find(
      so => so.recordId === recordId && numericSectorIds.includes(so.sectorId)
    );

    if (sectorOverride?.withLosses && sectorOverride?.lossesCost !== null) {
      // Use sector override value
      recordLossAmount = Number(sectorOverride.lossesCost) || 0;
    } else {
      // If no sector override, check detailed losses
      const loss = detailedLosses.find(
        l => l.recordId === recordId && numericSectorIds.includes(l.sectorId)
      );

      if (loss) {
        // Calculate from public and private costs
        if (loss.publicCostTotalOverride) {
          recordLossAmount += Number(loss.publicCostTotal) || 0;
        } else {
          recordLossAmount += (Number(loss.publicUnits) || 0) * (Number(loss.publicCostUnit) || 0);
        }

        if (loss.privateCostTotalOverride) {
          recordLossAmount += Number(loss.privateCostTotal) || 0;
        } else {
          recordLossAmount += (Number(loss.privateUnits) || 0) * (Number(loss.privateCostUnit) || 0);
        }
      }
    }

    if (recordLossAmount > 0) {
      total += recordLossAmount;

      // Get year and update yearly breakdown
      const record = await dr
        .select({
          year: extractYearFromDate(disasterRecordsTable.startDate).as("year")
        })
        .from(disasterRecordsTable)
        .where(eq(disasterRecordsTable.id, recordId))
        .limit(1);

      if (record && record[0]?.year) {
        const year = Number(record[0].year);
        byYear.set(year, (byYear.get(year) || 0) + recordLossAmount);
      }
    }
  }

  return { total, byYear };
};

// Function to get event counts by year
const getEventCountsByYear = async (recordIds: string[]): Promise<Map<number, number>> => {
  if (recordIds.length === 0) return new Map();
  console.log("Getting event counts by year for records:", recordIds);
  console.log("Calculating events by year for", recordIds.length, "records.");

  // Get events that span years by considering both start and end dates
  const eventYearSpans = await dr
    .select({
      eventId: disasterEventTable.id,
      startYear: extractYearFromDate(disasterEventTable.startDate).as("startYear"),
      endYear: extractYearFromDate(disasterEventTable.endDate).as("endYear")
    })
    .from(disasterRecordsTable)
    .innerJoin(disasterEventTable, eq(disasterRecordsTable.disasterEventId, disasterEventTable.id))
    .where(inArray(disasterRecordsTable.id, recordIds))
    .groupBy(disasterEventTable.id);

  // Process events and count them for each year they span
  const yearCounts = new Map<number, number>();
  for (const event of eventYearSpans) {
    const startYear = event.startYear;
    const endYear = event.endYear || event.startYear; // fallback to startYear if no end date

    // Count event for each year in its duration
    for (let year = startYear; year <= endYear; year++) {
      yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
    }
  }
  console.log("Event count by year:", [...yearCounts.entries()]);


  return yearCounts;
};

/**
 * Fetches comprehensive sector impact data following multiple international standards:
 * @param sectorId - ID of the sector to analyze
 * @param filters - Optional filters for data selection
 * @returns Comprehensive sector impact data with metadata
 */
export async function fetchSectorImpactData(
  sectorId: string,
  filters?: Filters
): Promise<SectorImpactData> {
  try {
    console.log("[Sector Impact] Fetching impact data for sector:", sectorId);
    console.log("Filters provided:", filters);

    const recordIds = await getDisasterRecordsForSector(sectorId, filters);
    console.log("Record IDs retrieved:", recordIds.length);

    // If no records found, return null values
    if (recordIds.length === 0) {
      return {
        eventCount: 0,
        totalDamage: null,
        totalLoss: null,
        eventsOverTime: {},
        damageOverTime: {},
        lossOverTime: {},
        metadata: createAssessmentMetadata(
          filters?.assessmentType || 'detailed',
          filters?.confidenceLevel || 'medium'
        ),
        dataAvailability: {
          damage: 'no_data',
          loss: 'no_data'
        }
      };
    }

    const [damagesResult, lossesResult, eventCounts] = await Promise.all([
      aggregateDamagesData(recordIds, sectorId),
      aggregateLossesData(recordIds, sectorId),
      getEventCountsByYear(recordIds)
    ]);
    console.log("Final damage & loss summary:", {
      totalDamage: damagesResult.total,
      totalLoss: lossesResult.total
    });

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
      totalDamage: recordIds.length === 0 ? null : damagesResult.total.toString(),
      totalLoss: recordIds.length === 0 ? null : lossesResult.total.toString(),
      eventsOverTime: Object.fromEntries([...eventCounts].map(([year, count]) => [year.toString(), count.toString()])),
      damageOverTime: Object.fromEntries(
        [...new Set([...eventCounts.keys(), ...damagesResult.byYear.keys()])].map(year =>
          [year.toString(), (damagesResult.byYear.get(year) || 0).toString()]
        )
      ),
      lossOverTime: Object.fromEntries(
        [...new Set([...eventCounts.keys(), ...lossesResult.byYear.keys()])].map(year =>
          [year.toString(), (lossesResult.byYear.get(year) || 0).toString()]
        )
      ),
      metadata,
      faoAgriculturalImpact,
      dataAvailability: {
        damage: recordIds.length === 0 ? 'no_data' : (damagesResult.total > 0 ? 'available' : (damagesResult.total === 0 ? 'zero' : 'no_data')),
        loss: recordIds.length === 0 ? 'no_data' : (lossesResult.total > 0 ? 'available' : (lossesResult.total === 0 ? 'zero' : 'no_data'))
      }
    };
  } catch (error) {
    console.error("Error in fetchSectorImpactData for sector:", sectorId, error);
    throw error;
  }
}
