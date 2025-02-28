import { and, eq, sql } from "drizzle-orm";
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
  const baseConditions = [
    // Only include completed records
    eq(disasterRecordsTable.approvalStatus, "completed"),
  ];

  // Add filter conditions with proper type handling
  if (filters.sectorId) {
    baseConditions.push(eq(sectorDisasterRecordsRelationTable.sectorId, Number(filters.sectorId)));
  }
  if (filters.hazardTypeId) {
    baseConditions.push(eq(hazardousEventTable.hipHazardId, filters.hazardTypeId));
  }
  if (filters.hazardClusterId) {
    baseConditions.push(eq(hazardousEventTable.hipClusterId, filters.hazardClusterId));
  }
  if (filters.specificHazardId) {
    baseConditions.push(eq(hazardousEventTable.hipTypeId, filters.specificHazardId));
  }
  if (filters.geographicLevelId) {
    baseConditions.push(eq(divisionTable.id, Number(filters.geographicLevelId)));
  }

  // Handle dates in UTC for consistency across timezones
  if (filters.fromDate) {
    baseConditions.push(sql`${disasterRecordsTable.startDate}::timestamptz >= ${filters.fromDate}::timestamptz`);
  }
  if (filters.toDate) {
    baseConditions.push(sql`${disasterRecordsTable.endDate}::timestamptz <= ${filters.toDate}::timestamptz`);
  }
  if (filters.disasterEventId) {
    baseConditions.push(eq(disasterRecordsTable.disasterEventId, filters.disasterEventId));
  }

  // Fetch damages data with performance optimized joins
  const damagesData = await dr
    .select({
      id: damagesTable.id,
      type: sql<string>`'damage'`.as("type"),
      assetName: assetTable.name,
      unit: damagesTable.unit,
      totalDamageAmount: damagesTable.totalDamageAmount,
      totalRepairReplacement: damagesTable.totalRepairReplacement,
      totalRecovery: damagesTable.totalRecovery,
    })
    .from(damagesTable)
    .innerJoin(assetTable, eq(damagesTable.assetId, assetTable.id))
    .innerJoin(disasterRecordsTable, eq(damagesTable.recordId, disasterRecordsTable.id))
    .innerJoin(
      sectorDisasterRecordsRelationTable,
      eq(disasterRecordsTable.id, sectorDisasterRecordsRelationTable.disasterRecordId)
    )
    .innerJoin(
      disasterEventTable,
      eq(disasterRecordsTable.disasterEventId, disasterEventTable.id)
    )
    .innerJoin(
      hazardousEventTable,
      eq(disasterEventTable.hazardousEventId, hazardousEventTable.id)
    )
    .innerJoin(
      divisionTable,
      eq(sql`${disasterRecordsTable.spatialFootprint}->>'division_id'`, sql`${divisionTable.id}::text`)
    )
    .where(and(...baseConditions));

  // Fetch losses data with consistent join structure
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
    })
    .from(lossesTable)
    .innerJoin(disasterRecordsTable, eq(lossesTable.recordId, disasterRecordsTable.id))
    .innerJoin(
      sectorDisasterRecordsRelationTable,
      eq(disasterRecordsTable.id, sectorDisasterRecordsRelationTable.disasterRecordId)
    )
    .innerJoin(
      disasterEventTable,
      eq(disasterRecordsTable.disasterEventId, disasterEventTable.id)
    )
    .innerJoin(
      hazardousEventTable,
      eq(disasterEventTable.hazardousEventId, hazardousEventTable.id)
    )
    .innerJoin(
      divisionTable,
      eq(sql`${disasterRecordsTable.spatialFootprint}->>'division_id'`, sql`${divisionTable.id}::text`)
    )
    .where(and(...baseConditions));

  // Fetch disruptions data with consistent join structure
  const disruptionsData = await dr
    .select({
      id: disruptionTable.id,
      type: sql<string>`'disruption'`.as("type"),
      durationDays: disruptionTable.durationDays,
      durationHours: disruptionTable.durationHours,
      usersAffected: disruptionTable.usersAffected,
      peopleAffected: disruptionTable.peopleAffected,
      responseCost: disruptionTable.responseCost,
    })
    .from(disruptionTable)
    .innerJoin(disasterRecordsTable, eq(disruptionTable.recordId, disasterRecordsTable.id))
    .innerJoin(
      sectorDisasterRecordsRelationTable,
      eq(disasterRecordsTable.id, sectorDisasterRecordsRelationTable.disasterRecordId)
    )
    .innerJoin(
      disasterEventTable,
      eq(disasterRecordsTable.disasterEventId, disasterEventTable.id)
    )
    .innerJoin(
      hazardousEventTable,
      eq(disasterEventTable.hazardousEventId, hazardousEventTable.id)
    )
    .innerJoin(
      divisionTable,
      eq(sql`${disasterRecordsTable.spatialFootprint}->>'division_id'`, sql`${divisionTable.id}::text`)
    )
    .where(and(...baseConditions));

  return {
    damages: damagesData,
    losses: lossesData,
    disruptions: disruptionsData,
  };
}
