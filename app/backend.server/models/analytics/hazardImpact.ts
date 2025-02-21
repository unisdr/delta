import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { dr } from "~/db.server";
import {
    damagesTable,
    lossesTable,
    disasterRecordsTable,
    hazardousEventTable,
    hipClassTable,
    hipClusterTable,
    hipHazardTable,
} from "~/drizzle/schema";
import { HazardDataPoint, HazardImpactFilters } from "~/types/hazardImpact";
import { getSectorsByParentId } from "./sectors";

export async function fetchHazardImpactData(filters: HazardImpactFilters) {
    const {
        sectorId,
        hazardTypeId,
        hazardClusterId,
        specificHazardId,
        geographicLevelId,
        fromDate,
        toDate
    } = filters;

    // Base conditions including approval status
    const baseConditions = [
        // Temporarily removed approval status check
    ];

    // Handle sector filtering using proper hierarchy
    if (sectorId) {
        const numericSectorId = parseInt(sectorId, 10);
        if (!isNaN(numericSectorId)) {
            // Get all subsectors if this is a parent sector
            const subsectors = await getSectorsByParentId(numericSectorId);
            const sectorIds = subsectors.length > 0
                ? [numericSectorId, ...subsectors.map(s => s.id)]
                : [numericSectorId];

            baseConditions.push(inArray(disasterRecordsTable.sectorId, sectorIds));
        }
    }

    // Add date filters if provided
    if (fromDate && toDate) {
        baseConditions.push(sql`${disasterRecordsTable.startDate} >= ${fromDate}`);
        baseConditions.push(sql`${disasterRecordsTable.endDate} <= ${toDate}`);
    }

    // Add hazard type filters if provided
    if (hazardTypeId) {
        baseConditions.push(eq(hipClassTable.id, hazardTypeId));
    }
    if (hazardClusterId) {
        baseConditions.push(eq(hipClusterTable.id, hazardClusterId));
    }
    if (specificHazardId) {
        baseConditions.push(eq(hipHazardTable.id, specificHazardId));
    }

    // Add geographic level filter if provided
    if (geographicLevelId) {
        baseConditions.push(sql`${disasterRecordsTable.locationDesc} LIKE ${`%${geographicLevelId}%`}`);
    }

    // Query for disaster events count by hazard type
    const eventsCount = await dr
        .select({
            hazardId: hipClassTable.id,
            hazardName: hipClassTable.nameEn,
            value: count(disasterRecordsTable.id),
        })
        .from(disasterRecordsTable)
        .innerJoin(
            hazardousEventTable,
            eq(disasterRecordsTable.disasterEventId, hazardousEventTable.id)
        )
        .innerJoin(
            hipHazardTable,
            eq(hazardousEventTable.hipHazardId, hipHazardTable.id)
        )
        .innerJoin(
            hipClusterTable,
            eq(hipHazardTable.clusterId, hipClusterTable.id)
        )
        .innerJoin(
            hipClassTable,
            eq(hipClusterTable.classId, hipClassTable.id)
        )
        .where(and(...baseConditions))
        .groupBy(hipClassTable.id, hipClassTable.nameEn)
        .orderBy(desc(count(disasterRecordsTable.id)))
        .limit(10);

    // Query for damages by hazard type
    const damages = await dr
        .select({
            hazardId: hipClassTable.id,
            hazardName: hipClassTable.nameEn,
            value: sql`COALESCE(SUM(
                COALESCE(${damagesTable.publicRepairCostTotalOverride}, 
                    ${damagesTable.publicRepairCostUnit} * ${damagesTable.publicRepairUnits}) +
                COALESCE(${damagesTable.privateRepairCostTotalOverride},
                    ${damagesTable.privateRepairCostUnit} * ${damagesTable.privateRepairUnits})
            ), 0)`,
        })
        .from(disasterRecordsTable)
        .innerJoin(
            hazardousEventTable,
            eq(disasterRecordsTable.disasterEventId, hazardousEventTable.id)
        )
        .innerJoin(
            hipHazardTable,
            eq(hazardousEventTable.hipHazardId, hipHazardTable.id)
        )
        .innerJoin(
            hipClusterTable,
            eq(hipHazardTable.clusterId, hipClusterTable.id)
        )
        .innerJoin(
            hipClassTable,
            eq(hipClusterTable.classId, hipClassTable.id)
        )
        .leftJoin(
            damagesTable,
            eq(damagesTable.recordId, disasterRecordsTable.id)
        )
        .where(and(...baseConditions))
        .groupBy(hipClassTable.id, hipClassTable.nameEn)
        .orderBy(desc(sql`COALESCE(SUM(
            COALESCE(${damagesTable.publicRepairCostTotalOverride},
                ${damagesTable.publicRepairCostUnit} * ${damagesTable.publicRepairUnits}) +
            COALESCE(${damagesTable.privateRepairCostTotalOverride},
                ${damagesTable.privateRepairCostUnit} * ${damagesTable.privateRepairUnits})
        ), 0)`))
        .limit(10);

    // Query for losses by hazard type
    const losses = await dr
        .select({
            hazardId: hipClassTable.id,
            hazardName: hipClassTable.nameEn,
            value: sql`COALESCE(SUM(
                COALESCE(${lossesTable.publicCostTotalOverride}, 0) +
                COALESCE(${lossesTable.privateCostTotalOverride}, 0)
            ), 0)`,
        })
        .from(disasterRecordsTable)
        .innerJoin(
            hazardousEventTable,
            eq(disasterRecordsTable.disasterEventId, hazardousEventTable.id)
        )
        .innerJoin(
            hipHazardTable,
            eq(hazardousEventTable.hipHazardId, hipHazardTable.id)
        )
        .innerJoin(
            hipClusterTable,
            eq(hipHazardTable.clusterId, hipClusterTable.id)
        )
        .innerJoin(
            hipClassTable,
            eq(hipClusterTable.classId, hipClassTable.id)
        )
        .leftJoin(
            lossesTable,
            eq(lossesTable.recordId, disasterRecordsTable.id)
        )
        .where(and(...baseConditions))
        .groupBy(hipClassTable.id, hipClassTable.nameEn)
        .orderBy(desc(sql`COALESCE(SUM(
            COALESCE(${lossesTable.publicCostTotalOverride}, 0) +
            COALESCE(${lossesTable.privateCostTotalOverride}, 0)
        ), 0)`))
        .limit(10);

    // Calculate percentages
    const calculatePercentages = (data: { hazardId: string; hazardName: string; value: unknown }[]): HazardDataPoint[] => {
        const total = data.reduce((sum, item) => sum + Number(item.value), 0);
        return data.map(item => ({
            hazardId: item.hazardId,
            hazardName: item.hazardName,
            value: item.value as number | string,
            percentage: total > 0 ? (Number(item.value) / total) * 100 : 0
        }));
    };

    return {
        eventsCount: calculatePercentages(eventsCount),
        damages: calculatePercentages(damages),
        losses: calculatePercentages(losses)
    };
}
