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
    eq(disasterRecordsTable.approvalStatus, 'completed')
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

  if (params.geographicLevelId) {
    const divisionInfo = await getDivisionInfo(params.geographicLevelId);
    if (divisionInfo) {
      // Query the division table to get the division details
      const division = await db.select()
        .from(divisionTable)
        .where(eq(divisionTable.id, sql`${params.geographicLevelId}::bigint`))
        .limit(1);

      if (division.length > 0) {
        // Base conditions that are always valid
        const baseConditions: SQL<unknown>[] = [
          // Match by location description
          ilike(disasterRecordsTable.locationDesc, `%${divisionInfo.name}%`),
          // Match by spatial footprint division_id
          sql`${disasterRecordsTable.spatialFootprint}->>'division_id' = ${params.geographicLevelId}`,
          // Match by spatial footprint regions array
          sql`${disasterRecordsTable.spatialFootprint}->>'regions' ILIKE ${`%${divisionInfo.name}%`}`
        ];

        // Add geometry intersection if available
        if (division[0].geom) {
          baseConditions.push(sql`ST_Intersects(
            ST_SetSRID(ST_GeomFromGeoJSON(${disasterRecordsTable.spatialFootprint}->>'geometry'), 4326),
            ${division[0].geom}
          )`);
        }

        // Create a single OR condition combining all valid conditions
        const orCondition = sql`(${or(...baseConditions)})`;
        conditions.push(orCondition);
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

    const { conditions, sectorIds } = await buildFilterConditions(params);

    // Create base query using proper table relations
    const query = db
      .select({
        eventId: disasterEventTable.id,
        eventName: disasterEventTable.nameNational,
        createdAt: disasterEventTable.createdAt,
        totalDamages: sql<number>`COALESCE(${damagesTable.totalRepairReplacement}, 0) + COALESCE(${damagesTable.totalRecovery}, 0)`,
        totalLosses: sql<number>`COALESCE(${lossesTable.publicCostTotal}, 0) + COALESCE(${lossesTable.privateCostTotal}, 0)`,
        total: sql<number>`COUNT(*) OVER()`
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
        disasterEventTable.createdAt,
        damagesTable.totalRepairReplacement,
        damagesTable.totalRecovery,
        lossesTable.publicCostTotal,
        lossesTable.privateCostTotal
      )
      .orderBy(
        sortBy === 'damages'
          ? sql`(COALESCE(${damagesTable.totalRepairReplacement}, 0) + COALESCE(${damagesTable.totalRecovery}, 0))${sortDirection === 'desc' ? sql` DESC` : sql` ASC`}`
          : sortBy === 'losses'
            ? sql`(COALESCE(${lossesTable.publicCostTotal}, 0) + COALESCE(${lossesTable.privateCostTotal}, 0))${sortDirection === 'desc' ? sql` DESC` : sql` ASC`}`
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
