import { and, eq, sql, inArray, exists } from "drizzle-orm";
import { dr } from "~/db.server";
import {
  damagesTable,
  lossesTable,
  disruptionTable,
  disasterRecordsTable,
  sectorDisasterRecordsRelationTable,
  measureTable,
  unitTable,
  assetTable,
  disasterEventTable,
  hazardousEventTable,
  divisionTable,
} from "~/drizzle/schema";
import { getSectorsByParentId } from "./sectors";

/**
 * Interface defining the filter parameters for effect details queries
 * @interface FilterParams
 */
interface FilterParams {
  sectorId: string | null;
  subSectorId: string | null;
  hazardTypeId: string | null;
  hazardClusterId: string | null;
  specificHazardId: string | null;
  geographicLevelId: string | null;
  fromDate: string | null;
  toDate: string | null;
  disasterEventId: string | null;
}

/**
 * Retrieves detailed effect data including damages, losses, and disruptions based on provided filters
 * 
 * @param {FilterParams} filters - Object containing filter criteria
 * @returns {Promise<{damages: any[], losses: any[], disruptions: any[]}>} Object containing arrays of filtered data
 * 
 * Performance considerations:
 * - Indexes should exist on: sectorId, hazardTypeId, disasterEventId, startDate, endDate
 * - Joins are optimized to use indexed columns
 * - Date comparisons use UTC for consistency
 */
export async function getEffectDetails(filters: FilterParams) {
  let targetSectorIds: number[] = [];
  if (filters.sectorId) {
    const numericSectorId = Number(filters.sectorId);
    if (!isNaN(numericSectorId)) {
      const subsectors = await getSectorsByParentId(numericSectorId);
      if (subsectors.length === 0) {
        // This is a subsector - filter for exact match
        targetSectorIds = [numericSectorId];
      } else {
        // This is a main sector - include all subsectors
        targetSectorIds = [numericSectorId, ...subsectors.map(s => s.id)];
      }
    }
  }

  // Base conditions for disaster records
  const baseConditions = [
    // Only include completed records
    eq(disasterRecordsTable.approvalStatus, "completed"),
  ];

  // Add sector filter to disaster records if we have target sectors
  if (targetSectorIds.length > 0) {
    baseConditions.push(
      exists(
        dr.select()
          .from(sectorDisasterRecordsRelationTable)
          .where(and(
            eq(sectorDisasterRecordsRelationTable.disasterRecordId, disasterRecordsTable.id),
            inArray(sectorDisasterRecordsRelationTable.sectorId, targetSectorIds)
          ))
      )
    );
  }

  // Handle hazard type filtering
  if (filters.hazardTypeId) {
    baseConditions.push(eq(hazardousEventTable.hipTypeId, filters.hazardTypeId));
  }
  if (filters.hazardClusterId) {
    baseConditions.push(eq(hazardousEventTable.hipClusterId, filters.hazardClusterId));
  }
  if (filters.specificHazardId) {
    baseConditions.push(eq(hazardousEventTable.hipTypeId, filters.specificHazardId));
  }
  if (filters.geographicLevelId) {
    baseConditions.push(
      sql`${disasterRecordsTable.spatialFootprint}->>'division_id' = ${filters.geographicLevelId}::text`
    );
  }

  // Handle dates in UTC for consistency across timezones
  if (filters.fromDate) {
    baseConditions.push(sql`${disasterRecordsTable.startDate}::date >= ${filters.fromDate}::date`);
  }
  if (filters.toDate) {
    baseConditions.push(sql`${disasterRecordsTable.endDate}::date <= ${filters.toDate}::date`);
  }
  if (filters.disasterEventId) {
    baseConditions.push(eq(disasterRecordsTable.disasterEventId, filters.disasterEventId));
  }

  // Fetch damages data with optimized joins and sector filtering
  const damagesData = await dr
    .select({
      id: damagesTable.id,
      type: sql<string>`'damage'`.as("type"),
      assetName: assetTable.name,
      totalDamageAmount: damagesTable.totalDamageAmount,
      totalRepairReplacement: damagesTable.totalRepairReplacement,
      totalRecovery: damagesTable.totalRecovery,
      sectorId: damagesTable.sectorId,
      attachments: damagesTable.attachments,
      spatialFootprint: damagesTable.spatialFootprint
    })
    .from(damagesTable)
    .innerJoin(assetTable, eq(damagesTable.assetId, assetTable.id))
    .innerJoin(disasterRecordsTable, eq(damagesTable.recordId, disasterRecordsTable.id))
    .innerJoin(
      disasterEventTable,
      eq(disasterRecordsTable.disasterEventId, disasterEventTable.id)
    )
    .innerJoin(
      hazardousEventTable,
      eq(disasterEventTable.hazardousEventId, hazardousEventTable.id)
    )
    .where(and(
      ...baseConditions,
      // Add sector filter directly to damages table
      targetSectorIds.length > 0 ? inArray(damagesTable.sectorId, targetSectorIds) : undefined
    ))
    .groupBy(damagesTable.id, assetTable.name);

  // Fetch losses data with optimized joins and sector filtering
  const lossesData = await dr
    .select({
      id: lossesTable.id,
      type: lossesTable.type,
      description: lossesTable.description,
      publicUnit: lossesTable.publicUnit,
      publicUnits: lossesTable.publicUnits,
      publicCostTotal: lossesTable.publicCostTotal,
      privateUnit: lossesTable.privateUnit,
      privateUnits: lossesTable.privateUnits,
      privateCostTotal: lossesTable.privateCostTotal,
      sectorId: lossesTable.sectorId,
      attachments: lossesTable.attachments,
      spatialFootprint: lossesTable.spatialFootprint
    })
    .from(lossesTable)
    .innerJoin(disasterRecordsTable, eq(lossesTable.recordId, disasterRecordsTable.id))
    .innerJoin(
      disasterEventTable,
      eq(disasterRecordsTable.disasterEventId, disasterEventTable.id)
    )
    .innerJoin(
      hazardousEventTable,
      eq(disasterEventTable.hazardousEventId, hazardousEventTable.id)
    )
    .where(and(
      ...baseConditions,
      // Add sector filter directly to losses table
      targetSectorIds.length > 0 ? inArray(lossesTable.sectorId, targetSectorIds) : undefined
    ))
    .groupBy(lossesTable.id);

  // Fetch disruptions data with optimized joins and sector filtering
  const disruptionsData = await dr
    .select({
      id: disruptionTable.id,
      type: sql<string>`'disruption'`.as("type"),
      durationDays: disruptionTable.durationDays,
      durationHours: disruptionTable.durationHours,
      usersAffected: disruptionTable.usersAffected,
      responseCost: disruptionTable.responseCost,
      comment: disruptionTable.comment,
      sectorId: disruptionTable.sectorId,
      attachments: disruptionTable.attachments,
      spatialFootprint: disruptionTable.spatialFootprint
    })
    .from(disruptionTable)
    .innerJoin(disasterRecordsTable, eq(disruptionTable.recordId, disasterRecordsTable.id))
    .innerJoin(
      disasterEventTable,
      eq(disasterRecordsTable.disasterEventId, disasterEventTable.id)
    )
    .innerJoin(
      hazardousEventTable,
      eq(disasterEventTable.hazardousEventId, hazardousEventTable.id)
    )
    .where(and(
      ...baseConditions,
      // Add sector filter directly to disruptions table
      targetSectorIds.length > 0 ? inArray(disruptionTable.sectorId, targetSectorIds) : undefined
    ))
    .groupBy(disruptionTable.id);

  return {
    damages: damagesData,
    losses: lossesData,
    disruptions: disruptionsData,
  };
}
