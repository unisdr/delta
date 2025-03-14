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
import { and, eq, inArray, ilike, SQL, exists, like, or } from "drizzle-orm";
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
  totalDamage: string | null;
  /** Total losses in local currency (changes in economic flows) */
  totalLoss: string | null;
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
  dataAvailability: {
    damage: 'available' | 'zero' | 'no_data';
    loss: 'available' | 'zero' | 'no_data';
  };
}

// Cache for division info
const divisionCache = new Map<string, { id: number, names: Record<string, string>, geometry: any }>();

const getDivisionInfo = async (geographicLevelId: string): Promise<{ id: number, names: Record<string, string>, geometry: any } | null> => {
  // Check cache first
  const cached = divisionCache.get(geographicLevelId);
  if (cached) {
    return cached;
  }

  // If not in cache, fetch from database
  const division = await dr
    .select({
      id: divisionTable.id,
      name: divisionTable.name,
      geom: divisionTable.geom
    })
    .from(divisionTable)
    .where(eq(divisionTable.id, parseInt(geographicLevelId)))
    .limit(1);

  if (!division || division.length === 0) {
    return null;
  }

  const result = {
    id: division[0].id,
    names: division[0].name as Record<string, string>,
    geometry: division[0].geom
  };

  // Cache the result
  divisionCache.set(geographicLevelId, result);
  return result;
};

// Helper function to normalize text for matching (same as in geographicImpact.ts)
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')                // Normalize unicode characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w\s,-]/g, ' ')      // Replace special chars with space
    .replace(/\s+/g, ' ')            // Clean up multiple spaces
    .replace(/\b(region|province|city|municipality)\b/g, '') // Remove common geographic terms
    .trim();
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

/**
 * Gets all subsector IDs for a given sector following international standards.
 * This implementation uses the proper hierarchical structure defined in the sector table
 * rather than relying on ID patterns, making it suitable for all countries.
 * 
 * @param sectorId - The ID of the sector to get subsectors for
 * @returns Array of sector IDs including the input sector and all its subsectors
 */
const getAllSubsectorIds = async (sectorId: string): Promise<string[]> => {
  try {
    const numericSectorId = validateSectorId(sectorId);
    const allSectorIds = [sectorId];
    
    // Recursively get all subsectors at all levels
    const fetchSubsectors = async (parentId: number): Promise<void> => {
      // Get direct children
      const directSubsectors = await dr
        .select({
          id: sectorTable.id
        })
        .from(sectorTable)
        .where(eq(sectorTable.parentId, parentId));
      
      // Add each direct child to the result array
      for (const subsector of directSubsectors) {
        allSectorIds.push(subsector.id.toString());
        // Recursively get children of this subsector
        await fetchSubsectors(subsector.id);
      }
    };
    
    // Start the recursive fetch
    await fetchSubsectors(numericSectorId);
    
    return allSectorIds;
  } catch (error) {
    console.error('Error in getAllSubsectorIds:', error);
    throw error;
  }
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

// Function to get all disaster records for a sector
const getDisasterRecordsForSector = async (
  sectorId: string,
  filters?: Filters
): Promise<string[]> => {
  try {
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
      sql`${disasterRecordsTable.approvalStatus} = 'published'`
    ];

    // Handle geographic level filtering with enhanced matching
    if (filters?.geographicLevel) {
      const divisionInfo = await getDivisionInfo(filters.geographicLevel);
      if (!divisionInfo) {
        // If the geographic level doesn't exist, return no results
        return [];
      }

      // 1. Spatial matching using PostGIS - only if we have spatial data
      if (divisionInfo.geometry) {
        try {
          conditions.push(sql`
            ${disasterRecordsTable.spatialFootprint} IS NOT NULL AND
            jsonb_typeof(${disasterRecordsTable.spatialFootprint}) = 'object' AND
            (${disasterRecordsTable.spatialFootprint}->>'type') IS NOT NULL AND
            ST_IsValid(ST_SetSRID(ST_GeomFromGeoJSON(${disasterRecordsTable.spatialFootprint}), 4326)) AND
            ST_Intersects(
              ST_SetSRID(ST_GeomFromGeoJSON(${disasterRecordsTable.spatialFootprint}), 4326),
              ${divisionInfo.geometry}
            )
          `);
        } catch (error) {
          // Log error but don't fail the entire query
          console.error('Error in spatial filtering:', error);

          // Add a fallback condition that will still filter by division name if possible
          // This ensures we get some results even if spatial operations fail
          if (divisionInfo.names) {
            const normalizedDivisionNames = Object.values(divisionInfo.names)
              .map(name => normalizeText(name || ''))
              .filter(Boolean);

            if (normalizedDivisionNames.length > 0) {
              // Create an array of SQL conditions for each division name
              const likeConditions: SQL<unknown>[] = normalizedDivisionNames.map(name =>
                sql`${disasterRecordsTable.locationDesc} IS NOT NULL AND LOWER(${disasterRecordsTable.locationDesc}) LIKE ${`%${name}%`}`
              );

              // Handle the case where we have a single condition vs multiple conditions
              if (likeConditions.length === 1) {
                conditions.push(likeConditions[0]);
              } else if (likeConditions.length > 1) {
                conditions.push(sql`${disasterRecordsTable.locationDesc} IS NOT NULL AND (${or(...likeConditions)})`);
              }
            }
          }
        }
      }

      // 2. Text matching using normalized names
      const normalized = normalizeText(Object.values(divisionInfo.names)[0]);
      const alternateNames = [
        normalized,
        normalized.replace(/\s*\([^)]*\)/g, ''), // Remove parentheses
        normalized.replace(/region\s*([\w-]+)/i, '$1'), // Remove 'Region'
        'ARMM', // Special case for ARMM
        'BARMM'  // Special case for BARMM
      ].filter(Boolean);

      if (alternateNames.length > 0) {
        const nameConditions: SQL<unknown>[] = alternateNames.map(name =>
          sql`LOWER(${disasterRecordsTable.locationDesc}) LIKE ${`%${name.toLowerCase()}%`}`
        );

        // Handle the case where we have a single condition vs multiple conditions
        if (nameConditions.length === 1) {
          conditions.push(sql`${disasterRecordsTable.locationDesc} IS NOT NULL AND ${nameConditions[0]}`);
        } else if (nameConditions.length > 1) {
          conditions.push(sql`${disasterRecordsTable.locationDesc} IS NOT NULL AND (${or(...nameConditions)})`);
        }
      }
    }

    // Add other filter conditions with proper error handling
    if (filters) {
      if (filters.startDate) {
        try {
          const startDate = new Date(filters.startDate);
          if (!isNaN(startDate.getTime())) {
            conditions.push(sql`
              ${disasterRecordsTable.startDate} IS NOT NULL AND 
              CASE 
                WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' 
                THEN ${disasterRecordsTable.startDate}::date >= ${filters.startDate}::date
                WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}' 
                THEN ${disasterRecordsTable.startDate}::date >= date_trunc('month', ${filters.startDate}::date)
                WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}' 
                THEN ${disasterRecordsTable.startDate}::date >= date_trunc('year', ${filters.startDate}::date)
                ELSE false
              END
            `);
          } else {
            console.error('Invalid start date format:', filters.startDate);
          }
        } catch (error) {
          console.error('Invalid start date:', error);
        }
      }
      if (filters.endDate) {
        try {
          const endDate = new Date(filters.endDate);
          if (!isNaN(endDate.getTime())) {
            conditions.push(sql`
              ${disasterRecordsTable.endDate} IS NOT NULL AND 
              CASE 
                WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' 
                THEN ${disasterRecordsTable.endDate}::date <= ${filters.endDate}::date
                WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{2}' 
                THEN ${disasterRecordsTable.endDate}::date <= (date_trunc('month', ${filters.endDate}::date) + interval '1 month - 1 day')
                WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}' 
                THEN ${disasterRecordsTable.endDate}::date <= (date_trunc('year', ${filters.endDate}::date) + interval '1 year - 1 day')
                ELSE false
              END
            `);
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
          conditions.push(sql`${hazardousEventTable.hipTypeId} = ${filters.hazardType}`);
        } catch (error) {
          console.error('Invalid hazard type ID:', error);
        }
      }
      if (filters.hazardCluster) {
        try {
          conditions.push(sql`${hazardousEventTable.hipClusterId} = ${filters.hazardCluster}`);
        } catch (error) {
          console.error('Invalid hazard cluster ID:', error);
        }
      }
      if (filters.specificHazard) {
        try {
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
            // Check if it's a UUID (for direct ID matching)
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(eventId)) {
              // Direct ID match for UUID format
              conditions.push(eq(disasterEventTable.id, eventId));
            } else {
              // Text search across multiple fields for non-UUID format
              const searchConditions: SQL<unknown>[] = [];
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
      totalDamage: recordIds.length === 0 ? null : damagesResult.total.toString(),
      totalLoss: recordIds.length === 0 ? null : lossesResult.total.toString(),
      eventsOverTime: Object.fromEntries([...eventCounts].map(([year, count]) => [year.toString(), count.toString()])),
      damageOverTime: Object.fromEntries([...damagesResult.byYear].map(([year, amount]) => [year.toString(), amount.toString()])),
      lossOverTime: Object.fromEntries([...lossesResult.byYear].map(([year, amount]) => [year.toString(), amount.toString()])),
      metadata,
      faoAgriculturalImpact,
      dataAvailability: {
        damage: recordIds.length === 0 ? 'no_data' : (damagesResult.total > 0 ? 'available' : (damagesResult.total === 0 ? 'zero' : 'no_data')),
        loss: recordIds.length === 0 ? 'no_data' : (lossesResult.total > 0 ? 'available' : (lossesResult.total === 0 ? 'zero' : 'no_data'))
      }
    };
  } catch (error) {
    console.error("Error in fetchSectorImpactData:", error);
    throw error;
  }
}
