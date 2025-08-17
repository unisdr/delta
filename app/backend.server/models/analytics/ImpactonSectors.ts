import { dr } from "~/db.server";
import { sql } from "drizzle-orm";
import {
  damagesTable,
  lossesTable,
  disasterRecordsTable,
  disasterEventTable,
  hazardousEventTable,
  sectorDisasterRecordsRelationTable,
} from "~/drizzle/schema";
import { and, eq, inArray, SQL, exists } from "drizzle-orm";
import { getSectorsByParentId } from "./sectors";
import { applyGeographicFilters, getDivisionInfo } from "~/backend.server/utils/geographicFilters";
import { parseFlexibleDate, createDateCondition, extractYearFromDate } from "~/backend.server/utils/dateFilters";
import createLogger from "~/utils/logger.server";


// Create logger for this backend module
const logger = createLogger("backend.server/models/analytics/ImpactOnSectors");

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

export const createAssessmentMetadata = async (
  assessmentType: AssessmentType = 'rapid',
  confidenceLevel: ConfidenceLevel = 'medium',
  currency: string = 'USD'
): Promise<DisasterImpactMetadata> => {

  return {
    assessmentType,
    confidenceLevel,
    currency: currency,
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
  const isValid = iso4217Pattern.test(currency);

  if (!isValid) {
    logger.warn("Invalid currency code provided", { currency });
  }

  return isValid;
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

// Function to get all disaster records for a sector with tenant isolation
const getDisasterRecordsForSector = async (
  countryAccountsId: string,
  sectorId: string,
  filters?: Filters
): Promise<string[]> => {
  try {
    // Get all relevant sector IDs (including subsectors if parent sector)
    const sectorIds = await getAllSubsectorIds(sectorId);
    const numericSectorIds = sectorIds;

    // Initialize conditions array with tenant isolation
    let conditions: SQL[] = [
      sql`${disasterRecordsTable.approvalStatus} = 'published'`,
      sql`${disasterRecordsTable.countryAccountsId} = ${countryAccountsId}`
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
          logger.debug("Applying geographic filter", {
            geographicLevel: filters.geographicLevel,
            divisionInfo
          });
          conditions = await applyGeographicFilters(divisionInfo, disasterRecordsTable, conditions);
        }
      } catch (error) {
        logger.error('Error applying geographic filter', {
          geographicLevel: filters.geographicLevel,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Add other filter conditions with proper error handling
    if (filters) {
      if (filters.startDate) {
        try {
          const startDate = parseFlexibleDate(filters.startDate);
          if (startDate) {
            conditions.push(createDateCondition(disasterRecordsTable.startDate, startDate, 'gte'));
            logger.debug("Applied start date filter", { startDate: filters.startDate });
          } else {
            logger.error('Invalid start date format', { startDate: filters.startDate });
          }
        } catch (error) {
          logger.error('Invalid start date', {
            startDate: filters.startDate,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      if (filters.endDate) {
        try {
          const endDate = parseFlexibleDate(filters.endDate);
          if (endDate) {
            conditions.push(createDateCondition(disasterRecordsTable.endDate, endDate, 'lte'));
            logger.debug("Applied end date filter", { endDate: filters.endDate });
          } else {
            logger.error('Invalid end date format', { endDate: filters.endDate });
          }
        } catch (error) {
          logger.error('Invalid end date', {
            endDate: filters.endDate,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Handle hazard type hierarchy
      if (filters.hazardType) {
        try {
          logger.debug("Applying hazard type filter", { hazardType: filters.hazardType });
          conditions.push(sql`${hazardousEventTable.hipTypeId} = ${filters.hazardType}`);
        } catch (error) {
          logger.error('Invalid hazard type ID', {
            hazardType: filters.hazardType,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      if (filters.hazardCluster) {
        try {
          logger.debug("Applying hazard cluster filter", { hazardCluster: filters.hazardCluster });
          conditions.push(sql`${hazardousEventTable.hipClusterId} = ${filters.hazardCluster}`);
        } catch (error) {
          logger.error('Invalid hazard cluster ID', {
            hazardCluster: filters.hazardCluster,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      if (filters.specificHazard) {
        try {
          logger.debug("Applying specific hazard filter", { specificHazard: filters.specificHazard });
          conditions.push(sql`${hazardousEventTable.hipHazardId} = ${filters.specificHazard}`);
        } catch (error) {
          logger.error('Invalid specific hazard ID', {
            specificHazard: filters.specificHazard,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      if (filters.disasterEvent || filters._disasterEventId) {
        try {
          const eventId = filters._disasterEventId || filters.disasterEvent;
          if (eventId) {
            logger.debug("Applying disaster event filter", { eventId });
            // Check if it's a UUID (for direct ID matching)
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(eventId)) {
              // Direct ID match for UUID format
              conditions.push(eq(disasterEventTable.id, eventId));
              logger.debug("Using UUID direct match for disaster event", { eventId });
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
              logger.debug("Using text search for disaster event", {
                eventId,
                searchFieldsCount: searchConditions.length
              });
            }
          }
        } catch (error) {
          logger.error('Error filtering by disaster event', {
            disasterEvent: filters.disasterEvent,
            _disasterEventId: filters._disasterEventId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
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
      logger.error('Error executing getDisasterRecordsForSector query', {
        sectorId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      // Return empty array instead of throwing to prevent cascading failures
      return [];
    }
  } catch (error) {
    logger.error('Error in getDisasterRecordsForSector', {
      sectorId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
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
const getAllSubsectorIds = async (sectorId: string | undefined): Promise<string[]> => {
  if (sectorId === undefined || sectorId === null) return [];

  const rootId = sectorId;
  logger.debug("Starting sector hierarchy traversal", { rootId });

  const result: string[] = [];
  const seen = new Set<string>();
  const queue: string[] = [rootId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (seen.has(currentId)) continue;
    seen.add(currentId);
    result.push(currentId);

    logger.debug("Processing sector in hierarchy", { currentId });

    const children = await getSectorsByParentId(currentId);
    logger.debug("Found subsectors", {
      parentId: currentId,
      childrenCount: children.length,
      childrenIds: children.map(c => c.id)
    });

    for (const child of children) {
      if (!seen.has(child.id)) queue.push(child.id);
    }
  }

  return result;
};

// Update aggregateDamagesData function
const aggregateDamagesData = async (
  recordIds: string[],
  sectorId: string | undefined
): Promise<{ total: number; byYear: Map<number, number>; faoAgriDamage?: any }> => {
  logger.debug("Starting damage data aggregation", {
    recordCount: recordIds.length,
    sectorId
  });

  const sectorIds = sectorId ? await getAllSubsectorIds(sectorId) : [];

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
        sectorIds.length > 0
          ? inArray(sectorDisasterRecordsRelationTable.sectorId, sectorIds)
          : undefined
      )
    );

  logger.debug("Found sector override records", {
    overrideCount: sectorOverrides.length
  });

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
        sectorIds.length > 0
          ? inArray(damagesTable.sectorId, sectorIds)
          : undefined
      )
    );

  logger.debug("Found detailed damage records", {
    detailedDamageCount: detailedDamages.length
  });

  let total = 0;
  const byYear = new Map<number, number>();

  // Process each record
  for (const recordId of recordIds) {
    let recordDamageAmount = 0;

    // Check sector overrides for all matching subsectors
    const matchingOverrides = sectorOverrides.filter(
      so => so.recordId === recordId && sectorIds.includes(so.sectorId)
    );

    // Sum up all sector override damages
    for (const override of matchingOverrides) {
      if (override?.withDamage && override?.damageCost !== null) {
        const overrideDamage = Number(override.damageCost) || 0;
        recordDamageAmount += overrideDamage;

        logger.debug("Using sector override for damage", {
          recordId,
          sectorId: override.sectorId,
          overrideAmount: overrideDamage
        });
      }
    }

    // If no overrides with damage found, check detailed damages for all matching subsectors
    if (recordDamageAmount === 0) {
      const matchingDamages = detailedDamages.filter(
        d => d.recordId === recordId && sectorIds.includes(d.sectorId)
      );

      // Sum up all detailed damages
      for (const damage of matchingDamages) {
        let damageAmount = 0;


        if (damage.totalRepairReplacementOverride) {
          damageAmount = Number(damage.totalRepairReplacement) || 0;
        } else {
          // Only include PD repair and TD replacement costs
          damageAmount =
            (Number(damage.pdDamageAmount) || 0) * (Number(damage.pdRepairCostUnit) || 0) +
            (Number(damage.tdDamageAmount) || 0) * (Number(damage.tdReplacementCostUnit) || 0);
        }

        recordDamageAmount += damageAmount;

        logger.debug("Calculated damage from detailed records", {
          recordId,
          sectorId: damage.sectorId,
          calculatedAmount: damageAmount,
          usedOverride: damage.totalRepairReplacementOverride
        });
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

  logger.info("Completed damage data aggregation", {
    totalDamage: total,
    yearsWithData: byYear.size,
    recordsProcessed: recordIds.length
  });

  return { total, byYear };
};

// Update aggregateLossesData function
const aggregateLossesData = async (
  recordIds: string[],
  sectorId: string | undefined
): Promise<{ total: number; byYear: Map<number, number>; faoAgriLoss?: any }> => {
  logger.debug("Starting loss data aggregation", {
    recordCount: recordIds.length,
    sectorId
  });

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

  logger.debug("Found sector override records for losses", {
    overrideCount: sectorOverrides.length
  });

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

  logger.debug("Found detailed loss records", {
    detailedLossCount: detailedLosses.length
  });

  let total = 0;
  const byYear = new Map<number, number>();

  // Process each record
  for (const recordId of recordIds) {
    let recordLossAmount = 0;

    // Check sector overrides for all matching subsectors
    const matchingOverrides = sectorOverrides.filter(
      so => so.recordId === recordId && numericSectorIds.includes(so.sectorId)
    );

    // Sum up all sector override losses
    for (const override of matchingOverrides) {
      if (override?.withLosses && override?.lossesCost !== null) {
        const overrideLoss = Number(override.lossesCost) || 0;
        recordLossAmount += overrideLoss;

        logger.debug("Using sector override for loss", {
          recordId,
          sectorId: override.sectorId,
          overrideAmount: overrideLoss
        });
      }
    }

    // If no overrides with losses found, check detailed losses for all matching subsectors
    if (recordLossAmount === 0) {
      const matchingLosses = detailedLosses.filter(
        l => l.recordId === recordId && numericSectorIds.includes(l.sectorId)
      );

      // Sum up all detailed losses
      for (const loss of matchingLosses) {
        let lossAmount = 0;

        // Calculate from public and private costs
        if (loss.publicCostTotalOverride) {
          lossAmount += Number(loss.publicCostTotal) || 0;
        } else {
          lossAmount += (Number(loss.publicUnits) || 0) * (Number(loss.publicCostUnit) || 0);
        }

        if (loss.privateCostTotalOverride) {
          lossAmount += Number(loss.privateCostTotal) || 0;
        } else {
          lossAmount += (Number(loss.privateUnits) || 0) * (Number(loss.privateCostUnit) || 0);
        }

        recordLossAmount += lossAmount;

        logger.debug("Calculated loss from detailed records", {
          recordId,
          sectorId: loss.sectorId,
          calculatedAmount: lossAmount,
          usedPublicOverride: loss.publicCostTotalOverride,
          usedPrivateOverride: loss.privateCostTotalOverride
        });
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

  logger.info("Completed loss data aggregation", {
    totalLoss: total,
    yearsWithData: byYear.size,
    recordsProcessed: recordIds.length
  });

  return { total, byYear };
};

// Function to get event counts by year
const getEventCountsByYear = async (recordIds: string[]): Promise<Map<number, number>> => {
  if (recordIds.length === 0) return new Map();

  logger.debug("Getting event counts by year", { recordCount: recordIds.length });

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

  logger.debug("Event count calculation completed", {
    uniqueEvents: eventYearSpans.length,
    yearsWithEvents: yearCounts.size,
    yearCounts: [...yearCounts.entries()]
  });

  return yearCounts;
};

/**
 * Fetches comprehensive sector impact data following multiple international standards:
 * @param countryAccountsId - Tenant context for filtering by country account
 * @param sectorId - ID of the sector to analyze
 * @param filters - Optional filters for data selection
 * @returns Comprehensive sector impact data with metadata
 */
export async function fetchSectorImpactData(
  countryAccountsId: string,
  sectorId: string,
  filters?: Filters,
  currency?: string,
): Promise<SectorImpactData> {
  try {
    const recordIds = await getDisasterRecordsForSector(countryAccountsId, sectorId, filters);

    // If no records found, return null values
    if (recordIds.length === 0) {
      return {
        eventCount: 0,
        totalDamage: null,
        totalLoss: null,
        eventsOverTime: {},
        damageOverTime: {},
        lossOverTime: {},
        metadata: await createAssessmentMetadata(
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

    logger.info("Completed sector impact analysis", {
      sectorId,
      eventCount: recordIds.length,
      totalDamage: damagesResult.total,
      totalLoss: lossesResult.total,
      yearsWithDamageData: damagesResult.byYear.size,
      yearsWithLossData: lossesResult.byYear.size,
      yearsWithEvents: eventCounts.size
    });

    // Create assessment metadata
    const metadata = await createAssessmentMetadata(
      filters?.assessmentType || 'detailed',
      filters?.confidenceLevel || 'medium',
      currency
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
    logger.error("Error in fetchSectorImpactData", {
      sectorId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      filters
    });
    throw error;
  }
}