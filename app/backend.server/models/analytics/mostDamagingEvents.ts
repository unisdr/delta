/**
 * Most Damaging Events Analysis Module
 * 
 * This module implements analysis of high-impact disaster events following:
 * 1. Sendai Framework Priority 1: Understanding disaster risk
 * 2. UNDRR Technical Guidance on loss database requirements
 * 3. World Bank DaLA methodology for impact ranking
 */

import { SQL, sql, eq, and, inArray, desc, ilike, exists, or } from "drizzle-orm";
import { dr as db } from "~/db.server";
import {
  disasterRecordsTable,
  sectorDisasterRecordsRelationTable,
  disasterEventTable,
  hazardousEventTable,
  damagesTable,
  lossesTable,
  hipTypeTable,
  hipClusterTable,
  divisionTable,
  hipHazardTable,
  sectorTable
} from "~/drizzle/schema";
import { calculateDamages, calculateLosses, createAssessmentMetadata } from "~/backend.server/utils/disasterCalculations";
import { applyHazardFilters } from "~/backend.server/utils/hazardFilters";
import { applyGeographicFilters, getDivisionInfo } from "~/backend.server/utils/geographicFilters";
import { getSectorsByParentId } from "./sectors";
import { parseFlexibleDate, createDateCondition } from "~/backend.server/utils/dateFilters";

/**
 * Gets all subsector IDs for a given sector
 * @param sectorId - The ID of the sector to get subsectors for
 * @returns Array of sector IDs including the input sector and all its subsectors
 */
const getAllSubsectorIds = async (sectorId: string): Promise<number[]> => {
  const result = await db
    .select({
      id: sectorTable.id,
      level: sectorTable.level
    })
    .from(sectorTable)
    .where(
      or(
        eq(sectorTable.id, Number(sectorId)),
        and(
          sql`${sectorTable.id}::text LIKE ${sectorId}::text || '%'`,
          sql`LENGTH(${sectorTable.id}::text) > LENGTH(${sectorId}::text)`
        )
      )
    );

  return result.map(r => r.id);
};

/**
 * Helper function to normalize text for matching
 * 
 * @param text - The text to normalize
 * @returns Normalized text
 */
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

async function buildFilterConditions(params: MostDamagingEventsParams): Promise<{ conditions: SQL<unknown>[]; sectorIds?: string[] }> {
  let conditions: SQL[] = [
    sql`${disasterRecordsTable.approvalStatus} = 'published'`
  ];

  let sectorIds: string[] | undefined;

  if (params.sectorId) {
    try {
      // Get the sector IDs based on the level
      const allSectorIds = await getAllSubsectorIds(params.sectorId);

      // Convert numeric IDs to strings for return value
      sectorIds = allSectorIds.map(id => id.toString());

      console.log('Most Damaging Events - Sector IDs:', sectorIds);

      // Convert string IDs back to numbers for the SQL query
      const numericSectorIds = allSectorIds.map(id => Number(id));

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
      console.error('Error in sector handling:', error);
    }
  }

  // Initialize base query with required joins for hazard filtering
  let queryBuilder = db
    .select()
    .from(disasterRecordsTable);

  console.log(" [PASSING FILTERS]: MostDamagingEventsParams");
  console.table(params);

  // Apply hazard filters using the utility function
  await applyHazardFilters(
    {
      hazardTypeId: params.hazardTypeId,
      hazardClusterId: params.hazardClusterId,
      specificHazardId: params.specificHazardId,
    },
    db,
    conditions,
    sql,
    eq,
    inArray,
    hipTypeTable,
    hipClusterTable,
    hipHazardTable,
    hazardousEventTable,
    disasterEventTable,
    disasterRecordsTable,
    queryBuilder,
    and
  );

  // Extract hazard ID values for debug
  // console.log('HazardType:', params.hazardTypeId);
  // console.log('HazardCluster:', params.hazardClusterId);
  // console.log('SpecificHazard:', params.specificHazardId);

  // Check actual hazard values in query
  const debugHazards = await db
    .select({
      id: disasterRecordsTable.id,
      hip_type: hazardousEventTable.hipTypeId,
      hip_cluster: hazardousEventTable.hipClusterId,
      hip_hazard: hazardousEventTable.hipHazardId,
    })
    .from(disasterRecordsTable)
    .innerJoin(disasterEventTable, eq(disasterRecordsTable.disasterEventId, disasterEventTable.id))
    .innerJoin(hazardousEventTable, eq(disasterEventTable.hazardousEventId, hazardousEventTable.id))
    .where(and(...conditions));

  // console.log(' Matching record hazard fields:', debugHazards);

  // Apply geographic level filter
  if (params.geographicLevelId) {
    try {
      const divisionInfo = await getDivisionInfo(params.geographicLevelId);
      if (divisionInfo) {
        // Apply geographic filters from utility
        conditions = await applyGeographicFilters(divisionInfo, disasterRecordsTable, conditions);
      } else {
        console.warn(`Division with ID ${params.geographicLevelId} not found. No geographic filtering will be applied.`);
      }
    } catch (error) {
      console.error(`Error in geographic filtering for division ${params.geographicLevelId}:`, error);
    }
  }

  // Handle dates in UTC for consistency across timezones
  if (params.fromDate) {
    const parsedFromDate = parseFlexibleDate(params.fromDate.split('T')[0]);
    if (parsedFromDate) {
      conditions.push(createDateCondition(disasterRecordsTable.startDate, parsedFromDate, 'gte'));
    } else {
      console.error('Invalid fromDate format:', params.fromDate);
    }
  }

  if (params.toDate) {
    const parsedToDate = parseFlexibleDate(params.toDate.split('T')[0]);
    if (parsedToDate) {
      conditions.push(createDateCondition(disasterRecordsTable.endDate, parsedToDate, 'lte'));
    } else {
      console.error('Invalid toDate format:', params.toDate);
    }
  }


  if (params.disasterEventId) {
    conditions.push(eq(disasterEventTable.id, params.disasterEventId));
  }

  return { conditions, sectorIds };
}

export async function getMostDamagingEvents(params: MostDamagingEventsParams): Promise<PaginatedResult> {
  try {
    // Default values for pagination
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const sortBy = params.sortBy || 'damages';
    const sortDirection = params.sortDirection || 'desc';

    console.log(' [MostDamagingEvents] Running with params:');
    console.table(params);

    // Generate cache key from params
    const cacheKey = JSON.stringify(params);
    // const cached = resultsCache.get(cacheKey);
    // if (cached) {
    //   return cached;
    // }

    // Build filter conditions with improved geographic filtering
    const { conditions, sectorIds } = await buildFilterConditions(params);
    console.log(' [Filters Applied] SQL Conditions count:', conditions.length);

    // Base query builder with required joins for hazard filtering
    let baseQuery = db
      .select()
      .from(disasterRecordsTable)
      .innerJoin(
        disasterEventTable,
        eq(disasterRecordsTable.disasterEventId, disasterEventTable.id)
      )
      .innerJoin(
        hazardousEventTable,
        eq(disasterEventTable.hazardousEventId, hazardousEventTable.id)
      );

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
    console.log(` [Count] Found ${total} event(s) across ${totalPages} page(s).`);

    // If no results, return empty response with proper metadata
    if (total === 0) {
      console.warn(' No results found for the current filter combination.');
      const metadata = createAssessmentMetadata(
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
            ? inArray(sectorDisasterRecordsRelationTable.sectorId, sectorIds.map(id => Number(id)))
            : sql`1=1` // No sector filter if no sectorIds
        )
      )
      // .leftJoin(
      //   damagesTable,
      //   eq(damagesTable.recordId, disasterRecordsTable.id)
      // )
      // .leftJoin(
      //   lossesTable,
      //   eq(lossesTable.recordId, disasterRecordsTable.id)
      // )
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
      console.log(` [Results] Successfully fetched ${results.length} row(s).`);
    } catch (error) {
      console.error(' [Query Error] Falling back to basic query:', error);
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

    console.log(' [Results] Events:', events);


    const metadata = createAssessmentMetadata(
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
    console.log('[Completed] Result returned.');

    return paginatedResult;
  } catch (error) {
    console.error(' [Fatal Error] getMostDamagingEvents failed:', error);

    // Return a graceful error response instead of throwing
    const metadata = createAssessmentMetadata(
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
