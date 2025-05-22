import { and, desc, eq, exists, inArray, sql, SQL, } from "drizzle-orm";
import { dr } from "~/db.server";
import {
    damagesTable,
    lossesTable,
    disasterRecordsTable,
    hazardousEventTable,
    disasterEventTable,
    hipTypeTable,
    sectorDisasterRecordsRelationTable
} from "~/drizzle/schema";
import { HazardDataPoint, HazardImpactFilters } from "~/types/hazardImpact";
import { getSectorsByParentId } from "./sectors";
import {
    createAssessmentMetadata,
    calculateFaoAgriculturalDamage,
    calculateFaoAgriculturalLoss
} from "~/backend.server/utils/disasterCalculations";
import type {
    DisasterImpactMetadata,
    FaoAgriSubsector,
    FaoAgriculturalDamage,
    FaoAgriculturalLoss
} from "~/types/disasterCalculations";
import { applyGeographicFilters, getDivisionInfo } from "~/backend.server/utils/geographicFilters";
import { parseFlexibleDate, createDateCondition } from "~/backend.server/utils/dateFilters";

const getAgriSubsector = (sectorId: string | undefined): FaoAgriSubsector | null => {
    if (!sectorId) return null;
    const subsectorMap: { [key: string]: FaoAgriSubsector } = {
        'agri_crops': 'crops',
        'agri_livestock': 'livestock',
        'agri_fisheries': 'fisheries',
        'agri_forestry': 'forestry'
    };
    return subsectorMap[sectorId] || null;
};

/**
 * Gets all subsector IDs for a given sector and all its subsectors recursively
 * @param sectorId - The ID of the sector to get subsectors for
 * @returns Array of sector IDs including the input sector and all its subsectors at all levels
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
        result.push(...subsectors.map(s => s.id));

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

export interface HazardImpactResult {
    eventsCount: HazardDataPoint[] | null;
    damages: HazardDataPoint[] | null;
    losses: HazardDataPoint[] | null;
    metadata: DisasterImpactMetadata;
    faoAgriculturalImpact?: {
        damage: FaoAgriculturalDamage;
        loss: FaoAgriculturalLoss;
    };
    dataAvailability?: {
        events: 'available' | 'zero' | 'no_data';
        damages: 'available' | 'zero' | 'no_data';
        losses: 'available' | 'zero' | 'no_data';
    };
}

export async function fetchHazardImpactData(filters: HazardImpactFilters): Promise<HazardImpactResult> {
    const {
        sectorId,
        hazardTypeId,
        hazardClusterId,
        specificHazardId,
        geographicLevelId,
        fromDate,
        toDate,
        disasterEventId,
        _disasterEventId,
        assessmentType = 'rapid',
        confidenceLevel = 'medium'
    } = filters;

    // Create assessment metadata
    const metadata = createAssessmentMetadata(
        assessmentType,
        confidenceLevel
    );

    // Build base conditions array
    let baseConditions: SQL[] = [
        sql`${disasterRecordsTable.approvalStatus} = 'published'`
    ];

    // Get all sector IDs (including subsectors)
    const sectorIds = sectorId ? await getAllSubsectorIds(sectorId) : [];

    // Handle sector filtering using proper hierarchy
    if (sectorId && sectorIds.length > 0) {
        // Add condition for sectorDisasterRecordsRelation
        baseConditions.push(
            exists(
                dr.select()
                    .from(sectorDisasterRecordsRelationTable)
                    .where(and(
                        eq(sectorDisasterRecordsRelationTable.disasterRecordId, disasterRecordsTable.id),
                        inArray(sectorDisasterRecordsRelationTable.sectorId, sectorIds)
                    ))
            )
        );
    }

    // Add date filters if provided
    if (fromDate) {
        const parsedFromDate = parseFlexibleDate(fromDate);
        if (parsedFromDate) {
            baseConditions.push(createDateCondition(disasterRecordsTable.startDate, parsedFromDate, 'gte'));
        } else {
            console.error('Invalid from date format:', fromDate);
        }
    }

    if (toDate) {
        const parsedToDate = parseFlexibleDate(toDate);
        if (parsedToDate) {
            baseConditions.push(createDateCondition(disasterRecordsTable.endDate, parsedToDate, 'lte'));
        } else {
            console.error('Invalid to date format:', toDate);
        }
    }

    // Add hazard type filters if provided
    if (hazardTypeId) {
        baseConditions.push(eq(hazardousEventTable.hipTypeId, hazardTypeId));
    }
    if (hazardClusterId) {
        baseConditions.push(eq(hazardousEventTable.hipClusterId, hazardClusterId));
    }
    if (specificHazardId) {
        baseConditions.push(eq(hazardousEventTable.hipHazardId, specificHazardId));
    }

    // Apply geographic level filter
    if (geographicLevelId) {
        const divisionInfo = await getDivisionInfo(geographicLevelId);
        if (!divisionInfo) {
            // If the geographic level doesn't exist, return empty results
            return {
                eventsCount: [],
                damages: [],
                losses: [],
                metadata,
                faoAgriculturalImpact: undefined
            };
        }

        // Apply geographic filters from utility
        baseConditions = await applyGeographicFilters(divisionInfo, disasterRecordsTable, baseConditions);
    }

    // Add disaster event filter if provided
    if (disasterEventId) {
        try {
            const eventId = _disasterEventId || disasterEventId;
            baseConditions.push(eq(disasterRecordsTable.disasterEventId, eventId));
        } catch (error) {
            console.error("Invalid disaster event ID format:", error);
            return {
                eventsCount: [],
                damages: [],
                losses: [],
                metadata,
                faoAgriculturalImpact: undefined
            };
        }
    }

    // Check if we need FAO agricultural calculations
    const agriSubsector = getAgriSubsector(sectorId);
    let faoAgriculturalImpact;

    if (agriSubsector) {
        const [faoAgriDamage, faoAgriLoss] = await Promise.all([
            calculateFaoAgriculturalDamage(damagesTable, agriSubsector),
            calculateFaoAgriculturalLoss(lossesTable, agriSubsector)
        ]);

        if (faoAgriDamage && faoAgriLoss) {
            faoAgriculturalImpact = {
                damage: faoAgriDamage,
                loss: faoAgriLoss
            };
        }
    }

    // Query for disaster events count by hazard type
    const eventsCount = await dr
        .select({
            hazardId: sql<string>`${hazardousEventTable.hipTypeId}`,
            hazardName: sql<string>`COALESCE(${hipTypeTable.nameEn}, '')`,
            value: sql<number>`COUNT(DISTINCT ${disasterEventTable.id})`,
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
            hipTypeTable,
            eq(hazardousEventTable.hipTypeId, hipTypeTable.id)
        )
        .where(and(...baseConditions))
        .groupBy(hazardousEventTable.hipTypeId, hipTypeTable.nameEn)
        .orderBy(desc(sql`COUNT(DISTINCT ${disasterEventTable.id})`));

    // Calculate total events for percentage
    const total = eventsCount.reduce((sum, item) => sum + Number(item.value), 0);
    console.log("Events Count retrieved:", eventsCount.length);
    console.log("Total events:", total);

    // Add percentage to each item and ensure types match HazardDataPoint
    const eventsCountWithPercentage = eventsCount.map(item => ({
        hazardId: item.hazardId,
        hazardName: String(item.hazardName),
        value: String(item.value),
        percentage: total > 0 ? (Number(item.value) / total) * 100 : 0
    }));

    // Query for damages by hazard type
    const damages = await dr
        .select({
            hazardId: sql<string>`${hazardousEventTable.hipTypeId}`,
            hazardName: sql<string>`COALESCE(${hipTypeTable.nameEn}, '')`,
            value: sql<string>`
                SUM(
                    CASE 
                        WHEN ${sectorDisasterRecordsRelationTable.withDamage} = true AND ${sectorDisasterRecordsRelationTable.damageCost} IS NOT NULL THEN
                            COALESCE(${sectorDisasterRecordsRelationTable.damageCost}, 0)::numeric
                        ELSE
                            COALESCE((
                                SELECT 
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
                )`,
        })
        .from(disasterRecordsTable)
        .innerJoin(
            sectorDisasterRecordsRelationTable,
            and(
                eq(sectorDisasterRecordsRelationTable.disasterRecordId, disasterRecordsTable.id),
                inArray(sectorDisasterRecordsRelationTable.sectorId, sectorIds)
            )
        )
        .leftJoin(
            disasterEventTable,
            eq(disasterRecordsTable.disasterEventId, disasterEventTable.id)
        )
        .leftJoin(
            hazardousEventTable,
            eq(disasterEventTable.hazardousEventId, hazardousEventTable.id)
        )
        .leftJoin(
            hipTypeTable,
            eq(hazardousEventTable.hipTypeId, hipTypeTable.id)
        )
        .where(and(...baseConditions))
        .groupBy(hazardousEventTable.hipTypeId, hipTypeTable.nameEn)
        .orderBy(desc(sql<string>`SUM(
            CASE 
                WHEN ${sectorDisasterRecordsRelationTable.withDamage} = true AND ${sectorDisasterRecordsRelationTable.damageCost} IS NOT NULL THEN
                    COALESCE(${sectorDisasterRecordsRelationTable.damageCost}, 0)::numeric
                ELSE
                    COALESCE((
                        SELECT 
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
        )`));

    // Query for losses by hazard type
    const losses = await dr
        .select({
            hazardId: sql<string>`${hazardousEventTable.hipTypeId}`,
            hazardName: sql<string>`COALESCE(${hipTypeTable.nameEn}, '')`,
            value: sql<string>`
                SUM(
                    CASE 
                        WHEN ${sectorDisasterRecordsRelationTable.withLosses} = true AND ${sectorDisasterRecordsRelationTable.lossesCost} IS NOT NULL THEN
                            COALESCE(${sectorDisasterRecordsRelationTable.lossesCost}, 0)::numeric
                        ELSE
                            COALESCE((
                                SELECT 
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
                                FROM ${lossesTable}
                                WHERE ${lossesTable.recordId} = ${disasterRecordsTable.id}
                                AND ${lossesTable.sectorId} = ${sectorDisasterRecordsRelationTable.sectorId}
                                LIMIT 1
                            ), 0)::numeric
                    END
                )`,
        })
        .from(disasterRecordsTable)
        .innerJoin(
            sectorDisasterRecordsRelationTable,
            and(
                eq(sectorDisasterRecordsRelationTable.disasterRecordId, disasterRecordsTable.id),
                inArray(sectorDisasterRecordsRelationTable.sectorId, sectorIds)
            )
        )
        .leftJoin(
            disasterEventTable,
            eq(disasterRecordsTable.disasterEventId, disasterEventTable.id)
        )
        .leftJoin(
            hazardousEventTable,
            eq(disasterEventTable.hazardousEventId, hazardousEventTable.id)
        )
        .leftJoin(
            hipTypeTable,
            eq(hazardousEventTable.hipTypeId, hipTypeTable.id)
        )
        .where(and(...baseConditions))
        .groupBy(hazardousEventTable.hipTypeId, hipTypeTable.nameEn)
        .orderBy(desc(sql<string>`SUM(
            CASE 
                WHEN ${sectorDisasterRecordsRelationTable.withLosses} = true AND ${sectorDisasterRecordsRelationTable.lossesCost} IS NOT NULL THEN
                    COALESCE(${sectorDisasterRecordsRelationTable.lossesCost}, 0)::numeric
                ELSE
                    COALESCE((
                        SELECT 
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
                        FROM ${lossesTable}
                        WHERE ${lossesTable.recordId} = ${disasterRecordsTable.id}
                        AND ${lossesTable.sectorId} = ${sectorDisasterRecordsRelationTable.sectorId}
                        LIMIT 1
                    ), 0)::numeric
            END
        )`));

    // Calculate total damages and losses for percentage
    const totalDamages = damages.reduce((sum, item) => sum + Number(item.value), 0);
    console.log("Damages result count:", damages.length);
    console.log("Total damages sum:", totalDamages);

    const totalLosses = losses.reduce((sum, item) => sum + Number(item.value), 0);
    console.log("Losses result count:", losses.length);
    console.log("Total losses sum:", totalLosses);

    // Add percentage to damages and losses
    const damagesWithPercentage = damages.map(item => ({
        hazardId: item.hazardId,
        hazardName: String(item.hazardName),
        value: String(item.value),
        percentage: totalDamages > 0 ? (Number(item.value) / totalDamages) * 100 : 0
    }));

    const lossesWithPercentage = losses.map(item => ({
        hazardId: item.hazardId,
        hazardName: String(item.hazardName),
        value: String(item.value),
        percentage: totalLosses > 0 ? (Number(item.value) / totalLosses) * 100 : 0
    }));

    return {
        eventsCount: eventsCountWithPercentage.length > 0 ? eventsCountWithPercentage : [],
        damages: damagesWithPercentage.length > 0 ? damagesWithPercentage : [],
        losses: lossesWithPercentage.length > 0 ? lossesWithPercentage : [],
        metadata,
        faoAgriculturalImpact,
        dataAvailability: {
            events: eventsCountWithPercentage.length > 0 ? (total > 0 ? 'available' : 'zero') : 'no_data',
            damages: damagesWithPercentage.length > 0 ? (totalDamages > 0 ? 'available' : 'zero') : 'no_data',
            losses: lossesWithPercentage.length > 0 ? (totalLosses > 0 ? 'available' : 'zero') : 'no_data',
        }
    };
}
