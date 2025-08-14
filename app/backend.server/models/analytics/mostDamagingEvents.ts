
/**
 * Most Damaging Events Analysis Module
 * 
 * This module implements analysis of high-impact disaster events following:
 * 1. Sendai Framework Priority 1: Understanding disaster risk
 * 2. UNDRR Technical Guidance on loss database requirements
 * 3. World Bank DaLA methodology for impact ranking
 */

import { SQL, sql, eq, and, inArray, desc, exists, or } from "drizzle-orm";
import { dr as db } from "~/db.server";
import createLogger from "~/utils/logger.server";

// Initialize logger for this module
const logger = createLogger("backend.server/models/analytics/mostDamagingEvents");
import {
  disasterRecordsTable,
  sectorDisasterRecordsRelationTable,
  disasterEventTable,
  hazardousEventTable,
  damagesTable,
  lossesTable,
  hipTypeTable,
  hipClusterTable,
  hipHazardTable,
  sectorTable
} from "~/drizzle/schema";
import { createAssessmentMetadata } from "~/backend.server/utils/disasterCalculations";
import { applyHazardFilters } from "~/backend.server/utils/hazardFilters";
import { applyGeographicFilters, getDivisionInfo } from "~/backend.server/utils/geographicFilters";
import { parseFlexibleDate, createDateCondition } from "~/backend.server/utils/dateFilters";

/**
 * Gets all subsector IDs for a given sector
 * @param sectorId - The ID of the sector to get subsectors for
 * @returns Array of sector IDs including the input sector and all its subsectors
 */
const getAllSubsectorIds = async (sectorId: string): Promise<string[]> => {
  const result = await db
    .select({
      id: sectorTable.id,
      level: sectorTable.level
    })
    .from(sectorTable)
    .where(
      or(
        eq(sectorTable.id, sectorId),
        and(
          sql`${sectorTable.id}::text LIKE ${sectorId}::text || '%'`,
          sql`LENGTH(${sectorTable.id}::text) > LENGTH(${sectorId}::text)`
        )
      )
    );

  return result.map(r => r.id);
};

async function buildFilterConditions(countryAccountsId: string, params: MostDamagingEventsParams): Promise<{ conditions: SQL<unknown>[]; sectorIds?: string[] }> {
  let conditions: SQL[] = [
    // Apply tenant isolation filter
    eq(disasterRecordsTable.countryAccountsId, countryAccountsId),
    sql`${disasterRecordsTable.approvalStatus} = 'published'`
  ];

  // Log tenant isolation filter application
  logger.debug("Applied tenant isolation filter", {
    tenantId: countryAccountsId,
    filterType: "countryAccountsId"
  });

  let sectorIds: string[] | undefined;

  if (params.sectorId) {
    try {
      // Get the sector IDs based on the level
      const allSectorIds = await getAllSubsectorIds(params.sectorId);

      // Convert numeric IDs to strings for return value
      sectorIds = allSectorIds.map(id => id.toString());

      logger.debug("Processing sector IDs for filtering", {
        sectorId: params.sectorId,
        sectorIdsCount: sectorIds.length,
        sectorIdsSample: sectorIds.slice(0, 5) // Log first 5 IDs to avoid huge logs
      });

      const numericSectorIds = allSectorIds.map(id => id);

      conditions.push(
        exists(
          db.select()
            .from(sectorDisasterRecordsRelationTable)
            .where(
              and(
                eq(sectorDisasterRecordsRelationTable.disasterRecordId, disasterRecordsTable.id),
                inArray(sectorDisasterRecordsRelationTable.sectorId, numericSectorIds)
              )
            )
        )
      );
    } catch (error) {
      logger.error("Error in sector handling", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        sectorId: params.sectorId
      });
    }
  }

  // Initialize base query with required joins for hazard filtering
  let queryBuilder = db
    .select()
    .from(disasterRecordsTable);

  logger.info("Processing most damaging events request", {
    filters: {
      sectorId: params.sectorId,
      subSectorId: params.subSectorId,
      hazardTypeId: params.hazardTypeId,
      hazardClusterId: params.hazardClusterId,
      specificHazardId: params.specificHazardId,
      geographicLevelId: params.geographicLevelId,
      fromDate: params.fromDate,
      toDate: params.toDate,
      disasterEventId: params.disasterEventId,
      page: params.page,
      pageSize: params.pageSize,
      sortBy: params.sortBy,
      sortDirection: params.sortDirection,
      assessmentType: params.assessmentType,
      confidenceLevel: params.confidenceLevel
    }
  });

  // Apply hazard filters using the utility function
  await applyHazardFilters(
    {
      hazardTypeId: params.hazardTypeId,
      hazardClusterId: params.hazardClusterId,
      specificHazardId: params.specificHazardId,
    },
    db,
    conditions,
    eq,
    hipTypeTable,
    hipClusterTable,
    hipHazardTable,
    hazardousEventTable,
    disasterEventTable,
    disasterRecordsTable,
    queryBuilder,
  );

  // Apply geographic level filter
  if (params.geographicLevelId) {
    try {
      const divisionInfo = await getDivisionInfo(params.geographicLevelId);
      if (divisionInfo) {
        // Apply geographic filters from utility
        conditions = await applyGeographicFilters(divisionInfo, disasterRecordsTable, conditions);
      } else {
        logger.warn("Division not found, skipping geographic filtering", {
          divisionId: params.geographicLevelId
        });
      }
    } catch (error) {
      logger.error("Error in geographic filtering", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        divisionId: params.geographicLevelId
      });
    }
  }

  // Handle dates in UTC for consistency across timezones
  if (params.fromDate) {
    const parsedFromDate = parseFlexibleDate(params.fromDate.split('T')[0]);
    if (parsedFromDate) {
      conditions.push(createDateCondition(disasterRecordsTable.startDate, parsedFromDate, 'gte'));
    } else {
      logger.warn("Invalid fromDate format", {
        fromDate: params.fromDate,
        error: "Could not parse date"
      });
    }
  }

  if (params.toDate) {
    const parsedToDate = parseFlexibleDate(params.toDate.split('T')[0]);
    if (parsedToDate) {
      conditions.push(createDateCondition(disasterRecordsTable.endDate, parsedToDate, 'lte'));
    } else {
      logger.warn("Invalid toDate format", {
        toDate: params.toDate,
        error: "Could not parse date"
      });
    }
  }


  if (params.disasterEventId) {
    conditions.push(eq(disasterEventTable.id, params.disasterEventId));
  }

  return { conditions, sectorIds };
}

export async function getMostDamagingEvents(countryAccountsId: string, params: MostDamagingEventsParams): Promise<PaginatedResult> {
  const startTime = Date.now();

  try {
    // Default values for pagination
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const sortBy = params.sortBy || 'damages';
    const sortDirection = params.sortDirection || 'desc';

    logger.info("Starting most damaging events analysis", {
      page: page,
      pageSize: pageSize,
      sortBy: sortBy,
      sortDirection: sortDirection,
      hasSectorFilter: !!params.sectorId,
      hasDateRange: !!(params.fromDate || params.toDate),
      tenantId: countryAccountsId
    });

    // Build filter conditions with improved geographic filtering
    const { conditions, sectorIds } = await buildFilterConditions(countryAccountsId, params);
    logger.debug("Applied filter conditions", {
      conditionCount: conditions.length,
      hasGeographicFilter: !!params.geographicLevelId,
      hasHazardFilter: !!(params.hazardTypeId || params.hazardClusterId || params.specificHazardId)
    });

    // Optimize the count query by separating it from the main query
    // This prevents unnecessary computations when counting total records
    const countQuery = db
      .select({
        count: sql<number>`COUNT(DISTINCT ${disasterEventTable.id})`
      })
      .from(disasterRecordsTable)
      .innerJoin(
        disasterEventTable,
        eq(disasterRecordsTable.disasterEventId, disasterEventTable.id)
      )
      .innerJoin(
        hazardousEventTable,
        eq(disasterEventTable.hazardousEventId, hazardousEventTable.id)
      )
      .where(and(...conditions));

    // Execute count query to get total records
    const countResult = await countQuery;
    const total = Number(countResult[0]?.count || 0);
    const totalPages = Math.ceil(total / pageSize);
    logger.info("Query result count", {
      totalEvents: total,
      totalPages: totalPages,
      pageSize: pageSize,
      currentPage: page
    });

    // If no results, return empty response with proper metadata
    if (total === 0) {
      logger.warn("No results found for filter combination", {
        filters: {
          sectorId: params.sectorId,
          hazardTypeId: params.hazardTypeId,
          dateRange: `${params.fromDate} to ${params.toDate}`,
          geographicLevelId: params.geographicLevelId
        }
      });
      const metadata = await createAssessmentMetadata(
        params.assessmentType || 'rapid',
        params.confidenceLevel || 'medium'
      );

      return {
        events: [],
        pagination: {
          total: 0,
          page,
          pageSize,
          totalPages: 0
        },
        metadata: {
          assessmentType: metadata.assessmentType,
          confidenceLevel: metadata.confidenceLevel,
          currency: metadata.currency,
          assessmentDate: metadata.assessmentDate,
          assessedBy: metadata.assessedBy,
          notes: metadata.notes || ''
        }
      };
    }

    // Create optimized main query with proper sorting and pagination
    const query = db
      .select({
        eventId: disasterEventTable.id,
        eventName: disasterEventTable.nameNational,
        createdAt: disasterEventTable.createdAt,
        totalDamages: sql<number>`
      COALESCE(SUM(
        CASE 
          WHEN ${sectorDisasterRecordsRelationTable.withDamage} = true AND ${sectorDisasterRecordsRelationTable.damageCost} IS NOT NULL THEN
            COALESCE(${sectorDisasterRecordsRelationTable.damageCost}, 0)::numeric
          ELSE
            COALESCE(
              (SELECT 
                CASE 
                  WHEN ${damagesTable.totalRepairReplacementOverride} = true THEN
                    COALESCE(${damagesTable.totalRepairReplacement}, 0)::numeric
                  ELSE
                    COALESCE(${damagesTable.pdDamageAmount}, 0)::numeric * COALESCE(${damagesTable.pdRepairCostUnit}, 0)::numeric +
                    COALESCE(${damagesTable.tdDamageAmount}, 0)::numeric * COALESCE(${damagesTable.tdReplacementCostUnit}, 0)::numeric
                END
              FROM ${damagesTable}
              WHERE ${damagesTable.recordId} = ${disasterRecordsTable.id}
              AND ${damagesTable.sectorId} = ${sectorDisasterRecordsRelationTable.sectorId}
              LIMIT 1
              ), 0)::numeric
        END
      ), 0)`,
        totalLosses: sql<number>`COALESCE(SUM(
            CASE 
              WHEN ${sectorDisasterRecordsRelationTable.withLosses} = true AND ${sectorDisasterRecordsRelationTable.lossesCost} IS NOT NULL THEN
                COALESCE(${sectorDisasterRecordsRelationTable.lossesCost}, 0)::numeric
              ELSE
                COALESCE(
                  (SELECT 
                    CASE 
                      WHEN ${lossesTable.publicCostTotalOverride} = true THEN
                        COALESCE(${lossesTable.publicCostTotal}, 0)::numeric
                      ELSE
                        COALESCE(${lossesTable.publicUnits}, 0)::numeric * COALESCE(${lossesTable.publicCostUnit}, 0)::numeric
                      END +
                      CASE 
                        WHEN ${lossesTable.privateCostTotalOverride} = true THEN
                          COALESCE(${lossesTable.privateCostTotal}, 0)::numeric
                        ELSE
                          COALESCE(${lossesTable.privateUnits}, 0)::numeric * COALESCE(${lossesTable.privateCostUnit}, 0)::numeric
                        END
                    END
                  FROM ${lossesTable}
                  WHERE ${lossesTable.recordId} = ${disasterRecordsTable.id}
                  AND ${lossesTable.sectorId} = ${sectorDisasterRecordsRelationTable.sectorId}
                  LIMIT 1
                  ), 0)::numeric
            END
        ), 0)`
      })
      .from(disasterRecordsTable)
      .innerJoin(
        disasterEventTable,
        eq(disasterRecordsTable.disasterEventId, disasterEventTable.id)
      )
      .innerJoin(
        hazardousEventTable,
        eq(disasterEventTable.hazardousEventId, hazardousEventTable.id)
      )
      .leftJoin(
        sectorDisasterRecordsRelationTable,
        and(
          eq(sectorDisasterRecordsRelationTable.disasterRecordId, disasterRecordsTable.id),
          sectorIds && sectorIds.length > 0
            ? inArray(sectorDisasterRecordsRelationTable.sectorId, sectorIds)
            : sql`1=1` // No sector filter if no sectorIds
        )
      )
      .where(and(...conditions))
      .groupBy(
        disasterEventTable.id,
        disasterEventTable.nameNational,
        disasterEventTable.createdAt
      );

    // Apply sorting with proper index usage
    let sortedQuery;
    if (sortBy === 'damages') {
      sortedQuery = query.orderBy(
        sortDirection === 'desc'
          ? desc(sql`COALESCE(SUM(COALESCE(${sectorDisasterRecordsRelationTable.damageCost}, 0)), 0)`)
          : sql`COALESCE(SUM(COALESCE(${sectorDisasterRecordsRelationTable.damageCost}, 0)), 0)`
      );
    } else if (sortBy === 'losses') {
      sortedQuery = query.orderBy(
        sortDirection === 'desc'
          ? desc(sql`COALESCE(SUM(COALESCE(${sectorDisasterRecordsRelationTable.lossesCost}, 0)), 0)`)
          : sql`COALESCE(SUM(COALESCE(${sectorDisasterRecordsRelationTable.lossesCost}, 0)), 0)`
      );
    } else if (sortBy === 'eventName') {
      sortedQuery = query.orderBy(
        sortDirection === 'desc'
          ? desc(disasterEventTable.nameNational)
          : disasterEventTable.nameNational
      );
    } else {
      // Default to createdAt
      sortedQuery = query.orderBy(
        sortDirection === 'desc'
          ? desc(disasterEventTable.createdAt)
          : disasterEventTable.createdAt
      );
    }

    // Apply pagination
    const paginatedQuery = sortedQuery
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    // Execute the query with proper error handling
    let results: any[] = [];
    try {
      results = await paginatedQuery;
      logger.debug("Successfully fetched results", {
        resultCount: results.length,
        page: page,
        pageSize: pageSize
      });
    } catch (error) {
      logger.error("Error in main query, falling back to basic query", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        query: "simplified fallback query"
      });
      // Fallback to a simpler query if the complex one fails
      const fallbackQuery = db
        .select({
          eventId: disasterEventTable.id,
          eventName: disasterEventTable.nameNational,
          createdAt: disasterEventTable.createdAt
        })
        .from(disasterRecordsTable)
        .innerJoin(
          disasterEventTable,
          eq(disasterRecordsTable.disasterEventId, disasterEventTable.id)
        )
        .innerJoin(
          hazardousEventTable,
          eq(disasterEventTable.hazardousEventId, hazardousEventTable.id)
        )
        .where(and(...conditions))
        .groupBy(
          disasterEventTable.id,
          disasterEventTable.nameNational,
          disasterEventTable.createdAt
        )
        .orderBy(desc(disasterEventTable.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      results = await fallbackQuery;

      // Add zero values for damages and losses
      results = results.map(row => ({
        ...row,
        totalDamages: 0,
        totalLosses: 0
      }));
    }

    // Map results to expected format with proper type handling
    const events = results.map(row => ({
      eventId: String(row.eventId),
      eventName: String(row.eventName || ''),
      createdAt: new Date(row.createdAt),
      totalDamages: Number(row.totalDamages || 0),
      totalLosses: Number(row.totalLosses || 0)
    }));

    logger.debug("Processed events data", {
      eventCount: events.length,
      sampleEvents: events.slice(0, 3).map(e => ({
        eventId: e.eventId,
        name: e.eventName,
        damages: e.totalDamages,
        losses: e.totalLosses
      }))
    });


    const metadata = await createAssessmentMetadata(
      params.assessmentType || 'rapid',
      params.confidenceLevel || 'medium'
    );

    const paginatedResult: PaginatedResult = {
      events,
      pagination: {
        total,
        page,
        pageSize,
        totalPages
      },
      metadata: {
        assessmentType: metadata.assessmentType,
        confidenceLevel: metadata.confidenceLevel,
        currency: metadata.currency,
        assessmentDate: metadata.assessmentDate,
        assessedBy: metadata.assessedBy,
        notes: metadata.notes || ''
      }
    };

    // resultsCache.set(cacheKey, paginatedResult);
    const executionTime = Date.now() - startTime;
    logger.info("Successfully completed most damaging events analysis", {
      totalResults: total,
      returnedResults: events.length,
      executionTime: `${executionTime}ms`,
      executionTimeMs: executionTime
    });

    return paginatedResult;
  } catch (error) {
    const executionTime = Date.now() - startTime;
    logger.error("Fatal error in getMostDamagingEvents", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      executionTime: `${executionTime}ms`,
      executionTimeMs: executionTime,
      params: {
        sectorId: params.sectorId,
        hazardTypeId: params.hazardTypeId,
        page: params.page,
        pageSize: params.pageSize,
        sortBy: params.sortBy,
        sortDirection: params.sortDirection
      }
    });

    // Return a graceful error response instead of throwing
    const metadata = await createAssessmentMetadata(
      params.assessmentType || 'rapid',
      params.confidenceLevel || 'medium'
    );

    return {
      events: [],
      pagination: {
        total: 0,
        page: params.page || 1,
        pageSize: params.pageSize || 20,
        totalPages: 0
      },
      metadata: {
        assessmentType: metadata.assessmentType,
        confidenceLevel: metadata.confidenceLevel,
        currency: metadata.currency,
        assessmentDate: metadata.assessmentDate,
        assessedBy: metadata.assessedBy,
        notes: `Error retrieving data: ${(error as Error).message}`
      }
    };
  }
}

export type SortColumn = 'damages' | 'losses' | 'eventName' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface MostDamagingEventsParams {
  sectorId: string | null;
  subSectorId: string | null;
  hazardTypeId: string | null;
  hazardClusterId: string | null;
  specificHazardId: string | null;
  geographicLevelId: string | null;
  fromDate: string | null;
  toDate: string | null;
  disasterEventId: string | null;
  page: number;
  pageSize: number;
  sortBy: SortColumn;
  sortDirection: SortDirection;
  assessmentType?: 'rapid' | 'detailed';
  confidenceLevel?: 'low' | 'medium' | 'high';
}

interface QueryResult {
  eventId: string;
  eventName: string;
  createdAt: Date;
  totalDamages: number;
  totalLosses: number;
  total: number;
}

interface PaginatedResult {
  events: Array<Omit<QueryResult, 'total'>>;
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  metadata: {
    assessmentType: string;
    confidenceLevel: string;
    currency: string;
    assessmentDate: string;
    assessedBy: string;
    notes: string;
  };
}
