import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { dr } from "~/db.server";
import {
    damagesTable,
    lossesTable,
    disasterRecordsTable,
    hazardousEventTable,
    disasterEventTable,
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
        toDate,
        disasterEventId,
        _disasterEventId
    } = filters;

    // Base conditions including approval status
    const baseConditions = [
        sql`${disasterRecordsTable.approvalStatus} ILIKE 'approved'`
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

    // Add disaster event filter if provided
    if (disasterEventId) {
        // Ensure the disaster event ID is a valid UUID
        try {
            const eventId = _disasterEventId || disasterEventId;
            baseConditions.push(eq(disasterRecordsTable.disasterEventId, eventId));
        } catch (error) {
            console.error("Invalid disaster event ID format:", error);
            // Return empty data if ID format is invalid
            return {
                eventsCount: [],
                damages: [],
                losses: []
            };
        }
    }

    // Query for disaster events count by hazard type
    const eventsCount = await dr
        .select({
            hazardId: sql<string>`${hipClassTable.id}`, // Ensure non-null integer
            hazardName: sql<string>`COALESCE(${hipClassTable.nameEn}, '')`, // Ensure non-null string
            value: sql<number>`COUNT(${disasterRecordsTable.id})`,
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
        .leftJoin(
            hipHazardTable,
            eq(hazardousEventTable.hipHazardId, hipHazardTable.id)
        )
        .leftJoin(
            hipClusterTable,
            eq(hipHazardTable.clusterId, hipClusterTable.id)
        )
        .leftJoin(
            hipClassTable,
            eq(hipClusterTable.classId, hipClassTable.id)
        )
        .where(and(...baseConditions))
        .groupBy(hipClassTable.id, hipClassTable.nameEn)
        .orderBy(desc(sql<number>`COUNT(${disasterRecordsTable.id})`))
        .limit(10);

    // Calculate total events for percentage
    const total = eventsCount.reduce((sum, item) => sum + Number(item.value), 0);

    // Add percentage to each item and ensure types match HazardDataPoint
    const eventsCountWithPercentage = eventsCount.map(item => ({
        hazardId: item.hazardId,
        hazardName: String(item.hazardName),
        value: String(item.value),
        percentage: total > 0 ? (Number(item.value) / total) * 100 : 0
    }));

    // Query for damages by hazard type with the same join structure
    const damages = await dr
        .select({
            hazardId: sql<string>`${hipClassTable.id}`,
            hazardName: sql<string>`COALESCE(${hipClassTable.nameEn}, '')`,
            value: sql`COALESCE(SUM(
                COALESCE(${damagesTable.publicRepairCostTotalOverride}, 
                    COALESCE(${damagesTable.publicRepairCostUnit} * ${damagesTable.publicRepairUnits}, 0), 0) +
                COALESCE(${damagesTable.privateRepairCostTotalOverride},
                    COALESCE(${damagesTable.privateRepairCostUnit} * ${damagesTable.privateRepairUnits}, 0), 0)
            ), 0)`,
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
        .leftJoin(
            hipHazardTable,
            eq(hazardousEventTable.hipHazardId, hipHazardTable.id)
        )
        .leftJoin(
            hipClusterTable,
            eq(hipHazardTable.clusterId, hipClusterTable.id)
        )
        .leftJoin(
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
                COALESCE(${damagesTable.publicRepairCostUnit} * ${damagesTable.publicRepairUnits}, 0), 0) +
            COALESCE(${damagesTable.privateRepairCostTotalOverride},
                COALESCE(${damagesTable.privateRepairCostUnit} * ${damagesTable.privateRepairUnits}, 0), 0)
        ), 0)`))
        .limit(10);

    // Query for losses by hazard type with the same join structure
    const losses = await dr
        .select({
            hazardId: sql<string>`${hipClassTable.id}`,
            hazardName: sql<string>`COALESCE(${hipClassTable.nameEn}, '')`,
            value: sql`COALESCE(SUM(
                COALESCE(${lossesTable.publicCostTotalOverride}, 0) +
                COALESCE(${lossesTable.privateCostTotalOverride}, 0)
            ), 0)`,
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
        .leftJoin(
            hipHazardTable,
            eq(hazardousEventTable.hipHazardId, hipHazardTable.id)
        )
        .leftJoin(
            hipClusterTable,
            eq(hipHazardTable.clusterId, hipClusterTable.id)
        )
        .leftJoin(
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
    const calculatePercentages = (data: { hazardId: string | null; hazardName: string | null; value: unknown }[]): HazardDataPoint[] => {
        const total = data.reduce((sum, item) => sum + Number(item.value), 0);
        return data.map(item => ({
            hazardId: item.hazardId || "",
            hazardName: String(item.hazardName || ''),
            value: String(item.value || 0),
            percentage: total > 0 ? (Number(item.value) / total) * 100 : 0
        }));
    };

    return {
        eventsCount: eventsCountWithPercentage,
        damages: calculatePercentages(damages),
        losses: calculatePercentages(losses)
    };
}
