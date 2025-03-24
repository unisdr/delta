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
import { configCurrencies } from "~/util/config";

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

      // Build an OR condition for both spatial and text matching
      const geoConditions = [];

      // 1. Spatial matching using PostGIS - primary method
      if (divisionInfo.geometry) {
        try {
          geoConditions.push(sql`
            ${disasterRecordsTable.spatialFootprint} IS NOT NULL AND
            ST_Intersects(
              ST_SetSRID(ST_GeomFromGeoJSON(${disasterRecordsTable.spatialFootprint}), 4326),
              ${divisionInfo.geometry}
            )
          `);
        } catch (error) {
          console.error('Error in spatial filtering:', error);
        }
      }

      // 2. Text matching using normalized names - fallback method
      if (divisionInfo.names) {
        const normalizedNames = Object.values(divisionInfo.names)
          .filter(Boolean)
          .map(name => name.toLowerCase());

        if (normalizedNames.length > 0) {
          geoConditions.push(sql`
            ${disasterRecordsTable.locationDesc} IS NOT NULL AND
            (${or(...normalizedNames.map(name =>
              sql`LOWER(${disasterRecordsTable.locationDesc}) LIKE ${`%${name}%`}`
            ))})
          `);
        }
      }

      // Add the combined OR condition if we have any matches
      if (geoConditions.length > 0) {
        conditions.push(sql`(${or(...geoConditions)})`);
      } else {
        // If we have no valid conditions, return no results
        return [];
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
): Promise<{ total: number; byYear: Map<number, number>; faoAgriDamage?: any }> => {
  const sectorIds = await getAllSubsectorIds(sectorId);
  const numericSectorIds = sectorIds.map(id => parseInt(id));

  // First check sectorDisasterRecordsRelation for overrides
  const sectorOverrides = await dr
    .select({
      recordId: sectorDisasterRecordsRelationTable.disasterRecordId,
      sectorId: sectorDisasterRecordsRelationTable.sectorId,
      damageCost: sectorDisasterRecordsRelationTable.damageCost,
      withDamage: sectorDisasterRecordsRelationTable.withDamage
      // damageRecoveryCost: sectorDisasterRecordsRelationTable.damageRecoveryCost
    })
    .from(sectorDisasterRecordsRelationTable)
    .where(
      and(
        inArray(sectorDisasterRecordsRelationTable.disasterRecordId, recordIds),
        inArray(sectorDisasterRecordsRelationTable.sectorId, numericSectorIds)
      )
    );

  // Get detailed damages for records without sector overrides
  const detailedDamages = await dr
    .select({
      recordId: damagesTable.recordId,
      sectorId: damagesTable.sectorId,
      totalRepairReplacement: damagesTable.totalRepairReplacement,
      totalRepairReplacementOverride: damagesTable.totalRepairReplacementOverride,
      totalRecovery: damagesTable.totalRecovery,
      totalRecoveryOverride: damagesTable.totalRecoveryOverride,
      pdDamageAmount: damagesTable.pdDamageAmount,
      pdRepairCostUnit: damagesTable.pdRepairCostUnit,
      pdRepairCostTotal: damagesTable.pdRepairCostTotal,
      pdRepairCostTotalOverride: damagesTable.pdRepairCostTotalOverride,
      pdRecoveryCostUnit: damagesTable.pdRecoveryCostUnit,
      pdRecoveryCostTotal: damagesTable.pdRecoveryCostTotal,
      pdRecoveryCostTotalOverride: damagesTable.pdRecoveryCostTotalOverride,
      tdDamageAmount: damagesTable.tdDamageAmount,
      tdReplacementCostUnit: damagesTable.tdReplacementCostUnit,
      tdReplacementCostTotal: damagesTable.tdReplacementCostTotal,
      tdReplacementCostTotalOverride: damagesTable.tdReplacementCostTotalOverride,
      tdRecoveryCostUnit: damagesTable.tdRecoveryCostUnit,
      tdRecoveryCostTotal: damagesTable.tdRecoveryCostTotal,
      tdRecoveryCostTotalOverride: damagesTable.tdRecoveryCostTotalOverride
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

  // Process each record
  for (const recordId of recordIds) {
    for (const sectorId of numericSectorIds) {
      // Check sector override first
      const sectorOverride = sectorOverrides.find(
        so => so.recordId === recordId && so.sectorId === sectorId
      );

      if (sectorOverride?.withDamage) {
        // Use sector override values if they exist
        const damageAmount =
          (Number(sectorOverride.damageCost) || 0);
        // (Number(sectorOverride.damageRecoveryCost) || 0);

        if (damageAmount > 0) {
          total += damageAmount;

          // Get year and update yearly breakdown
          const record = await dr
            .select({
              year: sql<number>`EXTRACT(YEAR FROM to_timestamp(${disasterRecordsTable.startDate}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))::integer`.as("year")
            })
            .from(disasterRecordsTable)
            .where(eq(disasterRecordsTable.id, recordId))
            .limit(1);

          if (record && record[0]?.year) {
            const year = Number(record[0].year);
            byYear.set(year, (byYear.get(year) || 0) + damageAmount);
          }
          continue;
        }
      }

      // If no sector override, check detailed damages
      const damage = detailedDamages.find(
        d => d.recordId === recordId && d.sectorId === sectorId
      );

      if (damage) {
        let damageAmount = 0;

        // Check total overrides first
        if (damage.totalRepairReplacementOverride) {
          damageAmount += Number(damage.totalRepairReplacement) || 0;
        } else {
          // Calculate from PD and TD details
          // PD Repair Cost
          if (damage.pdRepairCostTotalOverride) {
            damageAmount += Number(damage.pdRepairCostTotal) || 0;
          } else {
            damageAmount += (Number(damage.pdDamageAmount) || 0) * (Number(damage.pdRepairCostUnit) || 0);
          }

          // PD Recovery Cost
          if (damage.pdRecoveryCostTotalOverride) {
            damageAmount += Number(damage.pdRecoveryCostTotal) || 0;
          } else {
            damageAmount += (Number(damage.pdDamageAmount) || 0) * (Number(damage.pdRecoveryCostUnit) || 0);
          }

          // TD Replacement Cost
          if (damage.tdReplacementCostTotalOverride) {
            damageAmount += Number(damage.tdReplacementCostTotal) || 0;
          } else {
            damageAmount += (Number(damage.tdDamageAmount) || 0) * (Number(damage.tdReplacementCostUnit) || 0);
          }

          // TD Recovery Cost
          if (damage.tdRecoveryCostTotalOverride) {
            damageAmount += Number(damage.tdRecoveryCostTotal) || 0;
          } else {
            damageAmount += (Number(damage.tdDamageAmount) || 0) * (Number(damage.tdRecoveryCostUnit) || 0);
          }
        }

        // Add recovery costs if total override exists
        if (damage.totalRecoveryOverride) {
          damageAmount += Number(damage.totalRecovery) || 0;
        }

        if (damageAmount > 0) {
          total += damageAmount;

          // Get year and update yearly breakdown
          const record = await dr
            .select({
              year: sql<number>`EXTRACT(YEAR FROM to_timestamp(${disasterRecordsTable.startDate}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))::integer`.as("year")
            })
            .from(disasterRecordsTable)
            .where(eq(disasterRecordsTable.id, recordId))
            .limit(1);

          if (record && record[0]?.year) {
            const year = Number(record[0].year);
            byYear.set(year, (byYear.get(year) || 0) + damageAmount);
          }
        }
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
  const sectorIds = sectorId ? await getAllSubsectorIds(sectorId) : undefined;
  const numericSectorIds = sectorIds?.map(id => parseInt(id));

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
        numericSectorIds ? inArray(sectorDisasterRecordsRelationTable.sectorId, numericSectorIds) : undefined
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
        numericSectorIds ? inArray(lossesTable.sectorId, numericSectorIds) : undefined
      )
    );

  let total = 0;
  const byYear = new Map<number, number>();

  // Process each record
  for (const recordId of recordIds) {
    for (const sectorId of numericSectorIds || []) {
      // Check sector override first
      const sectorOverride = sectorOverrides.find(
        so => so.recordId === recordId && so.sectorId === sectorId
      );

      if (sectorOverride?.withLosses) {
        // Use sector override value if it exists
        const lossAmount = Number(sectorOverride.lossesCost) || 0;

        if (lossAmount > 0) {
          total += lossAmount;

          // Get year and update yearly breakdown
          const record = await dr
            .select({
              year: sql<number>`EXTRACT(YEAR FROM to_timestamp(${disasterRecordsTable.startDate}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))::integer`.as("year")
            })
            .from(disasterRecordsTable)
            .where(eq(disasterRecordsTable.id, recordId))
            .limit(1);

          if (record && record[0]?.year) {
            const year = Number(record[0].year);
            byYear.set(year, (byYear.get(year) || 0) + lossAmount);
          }
          continue;
        }
      }

      // If no sector override, check detailed losses
      const loss = detailedLosses.find(
        l => l.recordId === recordId && l.sectorId === sectorId
      );

      if (loss) {
        let lossAmount = 0;

        // Public losses
        if (loss.publicCostTotalOverride) {
          lossAmount += Number(loss.publicCostTotal) || 0;
        } else if (loss.publicUnits && loss.publicCostUnit) {
          lossAmount += (Number(loss.publicUnits) || 0) * (Number(loss.publicCostUnit) || 0);
        }

        // Private losses
        if (loss.privateCostTotalOverride) {
          lossAmount += Number(loss.privateCostTotal) || 0;
        } else if (loss.privateUnits && loss.privateCostUnit) {
          lossAmount += (Number(loss.privateUnits) || 0) * (Number(loss.privateCostUnit) || 0);
        }

        if (lossAmount > 0) {
          total += lossAmount;

          // Get year and update yearly breakdown
          const record = await dr
            .select({
              year: sql<number>`EXTRACT(YEAR FROM to_timestamp(${disasterRecordsTable.startDate}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))::integer`.as("year")
            })
            .from(disasterRecordsTable)
            .where(eq(disasterRecordsTable.id, recordId))
            .limit(1);

          if (record && record[0]?.year) {
            const year = Number(record[0].year);
            byYear.set(year, (byYear.get(year) || 0) + lossAmount);
          }
        }
      }
    }
  }

  return { total, byYear };
};

// Function to get event counts by year
const getEventCountsByYear = async (recordIds: string[]): Promise<Map<number, number>> => {
  if (recordIds.length === 0) return new Map();

  // Get events that span years by considering both start and end dates
  const eventYearSpans = await dr
    .select({
      eventId: disasterEventTable.id,
      startYear: sql<number>`EXTRACT(YEAR FROM to_timestamp(${disasterEventTable.startDate}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))::integer`,
      endYear: sql<number>`EXTRACT(YEAR FROM to_timestamp(${disasterEventTable.endDate}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))::integer`
    })
    .from(disasterRecordsTable)
    .innerJoin(disasterEventTable, eq(disasterRecordsTable.disasterEventId, disasterEventTable.id))
    .where(inArray(disasterRecordsTable.id, recordIds))
    .groupBy(disasterEventTable.id,
      sql<number>`EXTRACT(YEAR FROM to_timestamp(${disasterEventTable.startDate}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))::integer`,
      sql<number>`EXTRACT(YEAR FROM to_timestamp(${disasterEventTable.endDate}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))::integer`);

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
