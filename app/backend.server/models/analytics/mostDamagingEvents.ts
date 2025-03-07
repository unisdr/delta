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
  divisionTable,
  damagesTable,
  lossesTable
} from "~/drizzle/schema";
import { calculateDamages, calculateLosses, createAssessmentMetadata } from "~/backend.server/utils/disasterCalculations";
import LRUCache from "lru-cache";
import { getSectorsByParentId } from "./sectors";

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

// Initialize LRU cache with a max of 100 items and 15 minute TTL
const resultsCache = new LRUCache<string, PaginatedResult>({
  max: 100,
  ttl: 1000 * 60 * 15 // 15 minutes
});

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

// Helper function to get division info
const getDivisionInfo = async (geographicLevelId: string): Promise<{ name: string, normalized: string } | null> => {
  const division = await db
    .select({
      name: divisionTable.name
    })
    .from(divisionTable)
    .where(eq(divisionTable.id, parseInt(geographicLevelId)))
    .limit(1);

  if (!division || division.length === 0) {
    return null;
  }

  const divisionName = String(division[0].name);
  return {
    name: divisionName,
    normalized: normalizeText(divisionName)
  };
};

interface FilterConditions {
  conditions: SQL<unknown>[];
  sectorIds?: string[];
}

async function buildFilterConditions(params: MostDamagingEventsParams): Promise<FilterConditions> {
  const conditions: SQL<unknown>[] = [
    sql`${disasterRecordsTable.approvalStatus} = ${"published"}`
  ];

  let sectorIds: string[] | undefined;

  if (params.sectorId) {
    const numericSectorId = parseInt(params.sectorId, 10);
    if (!isNaN(numericSectorId)) {
      // Get all subsectors for the given sector ID
      const subsectors = await getSectorsByParentId(numericSectorId);
      const allSectorIds = subsectors.length > 0
        ? [numericSectorId, ...subsectors.map(s => s.id)]
        : [numericSectorId];

      // Convert numeric IDs to strings for return value
      sectorIds = allSectorIds.map(id => id.toString());

      conditions.push(
        exists(
          db.select()
            .from(sectorDisasterRecordsRelationTable)
            .where(and(
              eq(sectorDisasterRecordsRelationTable.disasterRecordId, disasterRecordsTable.id),
              inArray(sectorDisasterRecordsRelationTable.sectorId, allSectorIds)
            ))
        )
      );
    }
  }

  if (params.hazardTypeId) {
    conditions.push(eq(hazardousEventTable.hipTypeId, params.hazardTypeId));
  }

  if (params.hazardClusterId) {
    conditions.push(eq(hazardousEventTable.hipClusterId, params.hazardClusterId));
  }

  if (params.specificHazardId) {
    conditions.push(eq(hazardousEventTable.hipHazardId, params.specificHazardId));
  }

  // Improved geographic level filtering with robust error handling
  if (params.geographicLevelId) {
    try {
      // First, get the division info for name-based matching
      const divisionInfo = await getDivisionInfo(params.geographicLevelId);

      // Only proceed if we found a valid division
      if (divisionInfo) {
        // Query the division table to get the division geometry
        const division = await db
          .select({
            id: divisionTable.id,
            name: divisionTable.name,
            geom: divisionTable.geom
          })
          .from(divisionTable)
          .where(eq(divisionTable.id, parseInt(params.geographicLevelId, 10)))
          .limit(1);

        if (division.length > 0) {
          // Create an array of conditions for geographic filtering
          const geoConditions: SQL<unknown>[] = [];

          // Text-based fallback conditions that don't rely on spatial data
          geoConditions.push(
            // Match by location description (text-based fallback)
            ilike(disasterRecordsTable.locationDesc, `%${divisionInfo.name}%`)
          );

          // JSON-based conditions with null checking
          geoConditions.push(
            sql`(
              ${disasterRecordsTable.spatialFootprint} IS NOT NULL AND
              jsonb_typeof(${disasterRecordsTable.spatialFootprint}) = 'object' AND
              ${disasterRecordsTable.spatialFootprint}->>'division_id' = ${params.geographicLevelId}
            )`
          );

          geoConditions.push(
            sql`(
              ${disasterRecordsTable.spatialFootprint} IS NOT NULL AND
              jsonb_typeof(${disasterRecordsTable.spatialFootprint}) = 'object' AND
              ${disasterRecordsTable.spatialFootprint}->>'regions' IS NOT NULL AND
              ${disasterRecordsTable.spatialFootprint}->>'regions' ILIKE ${`%${divisionInfo.name}%`}
            )`
          );

          // Add spatial intersection condition with proper validation
          if (division[0].geom) {
            geoConditions.push(
              sql`(
                ${disasterRecordsTable.spatialFootprint} IS NOT NULL AND
                jsonb_typeof(${disasterRecordsTable.spatialFootprint}) = 'object' AND
                (${disasterRecordsTable.spatialFootprint}->>'type' IS NOT NULL) AND
                ST_IsValid(
                  ST_SetSRID(
                    ST_GeomFromGeoJSON(${disasterRecordsTable.spatialFootprint}), 
                    4326
                  )
                ) AND
                ST_Intersects(
                  ST_SetSRID(
                    ST_GeomFromGeoJSON(${disasterRecordsTable.spatialFootprint}), 
                    4326
                  ),
                  ${division[0].geom}
                )
              )`
            );
          }

          // Create a single OR condition combining all valid conditions
          conditions.push(sql`(${or(...geoConditions)})`);
          console.log(`Applied geographic filtering for division ${params.geographicLevelId} (${divisionInfo.name})`);
        } else {
          console.warn(`Division with ID ${params.geographicLevelId} not found in database. Skipping geographic filtering.`);
        }
      } else {
        console.warn(`Could not retrieve division info for ID ${params.geographicLevelId}. Skipping geographic filtering.`);
      }
    } catch (error) {
      // Log error but don't fail the entire query
      console.error(`Error in geographic filtering for division ${params.geographicLevelId}:`, error);

      // Add a simple fallback condition if possible
      if (params.geographicLevelId) {
        conditions.push(
          sql`(
            ${disasterRecordsTable.locationDesc} ILIKE ${`%${params.geographicLevelId}%`} OR
            (
              ${disasterRecordsTable.spatialFootprint} IS NOT NULL AND
              ${disasterRecordsTable.spatialFootprint}->>'division_id' = ${params.geographicLevelId}
            )
          )`
        );
      }
    }
  }

  if (params.fromDate) {
    const dateStr = params.fromDate.split('T')[0]; // Get just the date part
    conditions.push(sql`${disasterRecordsTable.startDate}::date >= ${dateStr}::date`);
  }

  if (params.toDate) {
    const dateStr = params.toDate.split('T')[0]; // Get just the date part
    conditions.push(sql`${disasterRecordsTable.endDate}::date <= ${dateStr}::date`);
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

    // Generate cache key from params
    const cacheKey = JSON.stringify(params);
    const cached = resultsCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Build filter conditions with improved geographic filtering
    const { conditions, sectorIds } = await buildFilterConditions(params);

    // Optimize the count query by separating it from the main query
    // This prevents unnecessary computations when counting total records
    const countQuery = db
      .select({
        count: sql<number>`COUNT(DISTINCT ${disasterEventTable.id})`
      })
      .from(disasterEventTable)
      .innerJoin(
        disasterRecordsTable,
        eq(disasterEventTable.id, disasterRecordsTable.disasterEventId)
      )
      .leftJoin(
        hazardousEventTable,
        eq(disasterEventTable.hazardousEventId, hazardousEventTable.id)
      )
      .where(and(...conditions));

    // Execute count query to get total records
    const countResult = await countQuery;
    const total = Number(countResult[0]?.count || 0);
    const totalPages = Math.ceil(total / pageSize);

    // If no results, return empty response with proper metadata
    if (total === 0) {
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
        // Use COALESCE to handle null values safely
        totalDamages: sql<number>`COALESCE(SUM(COALESCE(${damagesTable.totalRepairReplacement}, 0) + COALESCE(${damagesTable.totalRecovery}, 0)), 0)`,
        totalLosses: sql<number>`COALESCE(SUM(COALESCE(${lossesTable.publicCostTotal}, 0) + COALESCE(${lossesTable.privateCostTotal}, 0)), 0)`
      })
      .from(disasterEventTable)
      .innerJoin(
        disasterRecordsTable,
        eq(disasterEventTable.id, disasterRecordsTable.disasterEventId)
      )
      .leftJoin(
        hazardousEventTable,
        eq(disasterEventTable.hazardousEventId, hazardousEventTable.id)
      )
      .leftJoin(
        damagesTable,
        and(
          eq(disasterRecordsTable.id, damagesTable.recordId),
          sectorIds ? inArray(damagesTable.sectorId, sectorIds.map(id => parseInt(id, 10))) : undefined
        )
      )
      .leftJoin(
        lossesTable,
        and(
          eq(disasterRecordsTable.id, lossesTable.recordId),
          sectorIds ? inArray(lossesTable.sectorId, sectorIds.map(id => parseInt(id, 10))) : undefined
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
          ? desc(sql`COALESCE(SUM(COALESCE(${damagesTable.totalRepairReplacement}, 0) + COALESCE(${damagesTable.totalRecovery}, 0)), 0)`)
          : sql`COALESCE(SUM(COALESCE(${damagesTable.totalRepairReplacement}, 0) + COALESCE(${damagesTable.totalRecovery}, 0)), 0)`
      );
    } else if (sortBy === 'losses') {
      sortedQuery = query.orderBy(
        sortDirection === 'desc'
          ? desc(sql`COALESCE(SUM(COALESCE(${lossesTable.publicCostTotal}, 0) + COALESCE(${lossesTable.privateCostTotal}, 0)), 0)`)
          : sql`COALESCE(SUM(COALESCE(${lossesTable.publicCostTotal}, 0) + COALESCE(${lossesTable.privateCostTotal}, 0)), 0)`
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
    } catch (error) {
      console.error('Error executing most damaging events query:', error);
      // Fallback to a simpler query if the complex one fails
      const fallbackQuery = db
        .select({
          eventId: disasterEventTable.id,
          eventName: disasterEventTable.nameNational,
          createdAt: disasterEventTable.createdAt
        })
        .from(disasterEventTable)
        .innerJoin(
          disasterRecordsTable,
          eq(disasterEventTable.id, disasterRecordsTable.disasterEventId)
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

    // Cache the results
    resultsCache.set(cacheKey, paginatedResult);

    return paginatedResult;
  } catch (error) {
    console.error('Error in getMostDamagingEvents:', error);

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
