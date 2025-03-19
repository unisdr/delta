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
  sectorTable,
} from "~/drizzle/schema";
import { getSectorsByParentId } from "./sectors";
import { calculateDamages, calculateLosses } from "~/backend.server/utils/disasterCalculations";

/**
 * Gets all subsector IDs for a given sector following international standards.
 * This implementation uses the proper hierarchical structure defined in the sector table.
 * 
 * @param sectorId - The ID of the sector to get subsectors for
 * @returns Array of sector IDs including the input sector and all its subsectors
 */
const getAllSubsectorIds = async (sectorId: string): Promise<number[]> => {
  const numericSectorId = parseInt(sectorId, 10);
  if (isNaN(numericSectorId)) {
    return []; // Return empty array if invalid ID
  }

  // Get immediate subsectors
  const subsectors = await getSectorsByParentId(numericSectorId);

  // Initialize result with the current sector ID
  const result: number[] = [numericSectorId];

  // Recursively get all subsectors at all levels
  if (subsectors.length > 0) {
    // Add immediate subsector IDs
    result.push(...subsectors.map((s: { id: number }) => s.id));

    // For each subsector, recursively get its subsectors
    for (const subsector of subsectors) {
      const childSubsectorIds = await getAllSubsectorIds(subsector.id.toString());
      // Filter out the subsector ID itself as it's already included
      const uniqueChildIds = childSubsectorIds.filter(id => id !== subsector.id);
      result.push(...uniqueChildIds);
    }
  }

  // Remove duplicates and return
  return [...new Set(result)];
};

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
 * - Spatial queries use PostGIS functions with proper error handling
 */
export async function getEffectDetails(filters: FilterParams) {
  let targetSectorIds: number[] = [];
  if (filters.sectorId) {
    try {
      const numericSectorId = parseInt(filters.sectorId, 10);
      if (isNaN(numericSectorId)) {
        targetSectorIds = []; // Return empty array if invalid ID
      } else {
        // Get immediate subsectors
        const subsectors = await getSectorsByParentId(numericSectorId);

        // Initialize result with the current sector ID
        targetSectorIds = [numericSectorId];

        // Recursively get all subsectors at all levels
        if (subsectors.length > 0) {
          // Add immediate subsector IDs
          targetSectorIds.push(...subsectors.map((s: { id: number }) => s.id));

          // For each subsector, recursively get its subsectors
          for (const subsector of subsectors) {
            const childSubsectorIds = await getAllSubsectorIds(subsector.id.toString());
            // Filter out the subsector ID itself as it's already included
            const uniqueChildIds = childSubsectorIds.filter(id => id !== subsector.id);
            targetSectorIds.push(...uniqueChildIds);
          }
        }

        // Remove duplicates
        targetSectorIds = [...new Set(targetSectorIds)];
      }
    } catch (error) {
      console.error('Error processing sector IDs:', error);
      targetSectorIds = [];
    }
  }

  // Base conditions for disaster records
  const baseConditions = [
    sql`${disasterRecordsTable.approvalStatus} ILIKE 'published'`
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

  // Improved geographic level filtering with PostGIS
  if (filters.geographicLevelId) {
    try {
      // First, get the division geometry for the specified geographic level
      const division = await dr
        .select({
          id: divisionTable.id,
          geom: divisionTable.geom
        })
        .from(divisionTable)
        .where(eq(divisionTable.id, Number(filters.geographicLevelId)))
        .limit(1);

      if (division.length > 0) {
        // Use PostGIS for spatial filtering with proper error handling
        baseConditions.push(
          sql`(
            (${disasterRecordsTable.spatialFootprint} IS NOT NULL AND 
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
            ) OR
            (${disasterRecordsTable.spatialFootprint}->>'division_id' = ${filters.geographicLevelId}::text)
          )`
        );
      } else {
        // Fallback to text-based filtering if division not found
        console.warn(`Division with ID ${filters.geographicLevelId} not found. Falling back to text-based filtering.`);
        baseConditions.push(
          sql`${disasterRecordsTable.spatialFootprint}->>'division_id' = ${filters.geographicLevelId}::text`
        );
      }
    } catch (error) {
      // Log error and fall back to text-based filtering
      console.error(`Error in spatial filtering for division ${filters.geographicLevelId}:`, error);
      baseConditions.push(
        sql`${disasterRecordsTable.spatialFootprint}->>'division_id' = ${filters.geographicLevelId}::text`
      );
    }
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
      totalDamageAmount: sql<string>`${calculateDamages(damagesTable)}`.as("totalDamageAmount"),
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
      type: sql<string>`COALESCE(${lossesTable.typeNotAgriculture}, ${lossesTable.typeAgriculture})`.as("type"),
      description: lossesTable.description,
      publicUnit: lossesTable.publicUnit,
      publicUnits: lossesTable.publicUnits,
      publicCostTotal: sql<string>`${calculateLosses(lossesTable)}`.as("publicCostTotal"),
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
