/**
 * Most Damaging Events Analysis Module
 * 
 * This module implements analysis of high-impact disaster events following:
 * 1. Sendai Framework Priority 1: Understanding disaster risk
 * 2. UNDRR Technical Guidance on loss database requirements
 * 3. World Bank DaLA methodology for impact ranking
 */

import { SQL, sql, eq, and, inArray, desc, ilike } from "drizzle-orm";
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

function buildFilterConditions(params: MostDamagingEventsParams): SQL[] {
  const conditions: SQL[] = [
    ilike(disasterRecordsTable.approvalStatus, 'approved')
  ];

  if (params.sectorId) {
    conditions.push(
      sql`${sectorDisasterRecordsRelationTable.sectorId} = ${params.sectorId}::bigint`
    );
  }

  if (params.hazardTypeId) {
    conditions.push(eq(hazardousEventTable.hipHazardId, params.hazardTypeId));
  }

  if (params.hazardClusterId) {
    conditions.push(eq(hazardousEventTable.hipClusterId, params.hazardClusterId));
  }

  if (params.specificHazardId) {
    conditions.push(eq(hazardousEventTable.hipTypeId, params.specificHazardId));
  }

  if (params.geographicLevelId) {
    conditions.push(sql`${disasterRecordsTable.spatialFootprint}->>'division_id' = ${params.geographicLevelId}`);
  }

  if (params.fromDate) {
    conditions.push(sql`${disasterRecordsTable.startDate} >= ${params.fromDate}`);
  }

  if (params.toDate) {
    conditions.push(sql`${disasterRecordsTable.endDate} <= ${params.toDate}`);
  }

  if (params.disasterEventId) {
    conditions.push(eq(disasterEventTable.id, params.disasterEventId));
  }

  return conditions;
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

    const conditions = buildFilterConditions(params);

    // Create base query using proper table relations
    const query = db
      .select({
        eventId: disasterEventTable.id,
        eventName: disasterEventTable.nameNational,
        createdAt: disasterEventTable.createdAt,
        totalDamages: sql<number>`COALESCE(SUM(
          COALESCE(${damagesTable.totalRepairReplacement}, 0) +
          COALESCE(${damagesTable.totalRecovery}, 0)
        ), 0)`,
        totalLosses: sql<number>`COALESCE(SUM(
          COALESCE(${lossesTable.publicCostTotal}, 0) +
          COALESCE(${lossesTable.privateCostTotal}, 0)
        ), 0)`,
        total: sql<number>`COUNT(*) OVER()`
      })
      .from(disasterEventTable)
      .innerJoin(
        disasterRecordsTable,
        eq(disasterEventTable.id, disasterRecordsTable.disasterEventId)
      )
      .leftJoin(
        sectorDisasterRecordsRelationTable,
        eq(disasterRecordsTable.id, sectorDisasterRecordsRelationTable.disasterRecordId)
      )
      .leftJoin(
        hazardousEventTable,
        eq(disasterEventTable.id, hazardousEventTable.id)
      )
      .leftJoin(
        damagesTable,
        eq(disasterRecordsTable.id, damagesTable.recordId)
      )
      .leftJoin(
        lossesTable,
        eq(disasterRecordsTable.id, lossesTable.recordId)
      )
      .where(and(...conditions))
      .groupBy(disasterEventTable.id, disasterEventTable.nameNational, disasterEventTable.createdAt)
      .orderBy(
        sortBy === 'damages'
          ? sql`COALESCE(SUM(
              COALESCE(${damagesTable.totalRepairReplacement}, 0) +
              COALESCE(${damagesTable.totalRecovery}, 0)
            ), 0)${sortDirection === 'desc' ? sql` DESC` : sql` ASC`}`
          : sortBy === 'losses'
            ? sql`COALESCE(SUM(
              COALESCE(${lossesTable.publicCostTotal}, 0) +
              COALESCE(${lossesTable.privateCostTotal}, 0)
            ), 0)${sortDirection === 'desc' ? sql` DESC` : sql` ASC`}`
            : sortBy === 'eventName'
              ? sortDirection === 'desc'
                ? desc(disasterEventTable.nameNational)
                : disasterEventTable.nameNational
              : sortDirection === 'desc'
                ? desc(disasterEventTable.createdAt)
                : disasterEventTable.createdAt
      )
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const results = await query;

    // Handle empty results
    if (!results || !results.length) {
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

    const total = Number(results[0].total);
    const totalPages = Math.ceil(total / pageSize);

    // Map results to expected format
    const events = results.map(row => ({
      eventId: String(row.eventId),
      eventName: String(row.eventName),
      createdAt: new Date(row.createdAt),
      totalDamages: Number(row.totalDamages),
      totalLosses: Number(row.totalLosses)
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
    throw error;
  }
}
