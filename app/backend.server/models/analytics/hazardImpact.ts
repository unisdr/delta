import { and, desc, eq, exists, inArray, sql, or } from "drizzle-orm";
import { dr } from "~/db.server";
import {
    damagesTable,
    lossesTable,
    disasterRecordsTable,
    hazardousEventTable,
    disasterEventTable,
    hipTypeTable,
    sectorDisasterRecordsRelationTable,
    divisionTable
} from "~/drizzle/schema";
import { HazardDataPoint, HazardImpactFilters } from "~/types/hazardImpact";
import { getSectorsByParentId } from "./sectors";
import {
    calculateDamages,
    calculateLosses,
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
 * Gets all subsector IDs for a given sector and its subsectors
 * @param sectorId - The ID of the sector to get subsectors for
 * @returns Array of sector IDs including the input sector and all its subsectors
 */
const getAllSubsectorIds = async (sectorId: string): Promise<number[]> => {
    const numericSectorId = parseInt(sectorId, 10);
    if (isNaN(numericSectorId)) {
        return []; // Return empty array if invalid ID
    }
    const subsectors = await getSectorsByParentId(numericSectorId);
    return subsectors.length > 0
        ? [numericSectorId, ...subsectors.map(s => s.id)]
        : [numericSectorId];
};

// Cache for division info
const divisionCache = new Map<string, { id: number, names: Record<string, string>, geometry: any }>();

const getDivisionInfo = async (geographicLevelId: string): Promise<{ id: number, names: Record<string, string>, geometry: any } | null> => {
    // Check cache first
    const cached = divisionCache.get(geographicLevelId);
    if (cached) {
        return cached;
    }

    // If not in cache, fetch from database
    const division = await dr
        .select({
            id: divisionTable.id,
            name: divisionTable.name,
            geom: divisionTable.geom
        })
        .from(divisionTable)
        .where(eq(divisionTable.id, parseInt(geographicLevelId)))
        .limit(1);

    if (!division || division.length === 0) {
        return null;
    }

    const result = {
        id: division[0].id,
        names: division[0].name as Record<string, string>,
        geometry: division[0].geom
    };

    // Cache the result
    divisionCache.set(geographicLevelId, result);
    return result;
};

// Helper function to normalize text for matching
function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFKD')                // Normalize unicode characters
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[^\w\s,-]/g, ' ')      // Replace special chars with space
        .replace(/\s+/g, ' ')            // Clean up multiple spaces
        .replace(/\b(region|province|city|municipality)\b/g, '') // Remove common geographic terms
        .trim();
}

export interface HazardImpactResult {
    eventsCount: HazardDataPoint[];
    damages: HazardDataPoint[];
    losses: HazardDataPoint[];
    metadata: DisasterImpactMetadata;
    faoAgriculturalImpact?: {
        damage: FaoAgriculturalDamage;
        loss: FaoAgriculturalLoss;
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

    // Base conditions including approval status
    const baseConditions = [
        sql`${disasterRecordsTable.approvalStatus} ILIKE 'published'`
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
    if (fromDate && toDate) {
        baseConditions.push(sql`${disasterRecordsTable.startDate} >= ${fromDate}`);
        baseConditions.push(sql`${disasterRecordsTable.endDate} <= ${toDate}`);
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

    // Add geographic level filter if provided
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

        // 1. Spatial matching using PostGIS - only if we have spatial data
        if (divisionInfo.geometry) {
            try {
                // Add robust spatial condition with proper validation of GeoJSON format
                baseConditions.push(sql`
                    ${disasterRecordsTable.spatialFootprint} IS NOT NULL AND
                    jsonb_typeof(${disasterRecordsTable.spatialFootprint}) = 'object' AND
                    (${disasterRecordsTable.spatialFootprint}->>'type') IS NOT NULL AND
                    ST_Intersects(
                        CASE 
                            WHEN ST_IsValid(ST_SetSRID(ST_GeomFromGeoJSON(${disasterRecordsTable.spatialFootprint}), 4326)) 
                            THEN ST_SetSRID(ST_GeomFromGeoJSON(${disasterRecordsTable.spatialFootprint}), 4326)
                            ELSE NULL 
                        END,
                        ${divisionInfo.geometry}
                    )
                `);
            } catch (error) {
                // Log error but don't fail the entire query
                console.error('Error in spatial filtering for hazard impact:', error);

                // We don't add any spatial condition if there's an error
                // The text-based location matching below will serve as fallback
            }
        }

        // 2. Text matching using normalized names
        const normalized = normalizeText(Object.values(divisionInfo.names)[0]);
        const alternateNames = [
            normalized,
            normalized.replace(/\s*\([^)]*\)/g, ''), // Remove parentheses
            normalized.replace(/region\s*([\w-]+)/i, '$1'), // Remove 'Region'
            'ARMM', // Special case for ARMM
            'BARMM'  // Special case for BARMM
        ].filter(Boolean);

        baseConditions.push(sql`
            ${disasterRecordsTable.locationDesc} IS NOT NULL AND
            (${or(...alternateNames.map(name =>
            sql`LOWER(${disasterRecordsTable.locationDesc}) LIKE ${`%${name.toLowerCase()}%`}`
        ))})
        `);
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
            hipTypeTable,
            eq(hazardousEventTable.hipTypeId, hipTypeTable.id)
        )
        .where(and(...baseConditions))
        .groupBy(hazardousEventTable.hipTypeId, hipTypeTable.nameEn)
        .orderBy(desc(sql`COUNT(${disasterRecordsTable.id})`))
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

    // Query for damages by hazard type
    const damages = await dr
        .select({
            hazardId: sql<string>`${hazardousEventTable.hipTypeId}`,
            hazardName: sql<string>`COALESCE(${hipTypeTable.nameEn}, '')`,
            value: sql<string>`SUM(COALESCE(${sectorDisasterRecordsRelationTable.damageCost}, 0)::numeric + COALESCE(${sectorDisasterRecordsRelationTable.damageRecoveryCost}, 0)::numeric)`,
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
        .orderBy(desc(sql<string>`SUM(COALESCE(${sectorDisasterRecordsRelationTable.damageCost}, 0)::numeric + COALESCE(${sectorDisasterRecordsRelationTable.damageRecoveryCost}, 0)::numeric)`))
        .limit(10);

    // Query for losses by hazard type
    const losses = await dr
        .select({
            hazardId: sql<string>`${hazardousEventTable.hipTypeId}`,
            hazardName: sql<string>`COALESCE(${hipTypeTable.nameEn}, '')`,
            value: sql<string>`SUM(COALESCE(${sectorDisasterRecordsRelationTable.lossesCost}, 0)::numeric)`,
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
        .orderBy(desc(sql<string>`SUM(COALESCE(${sectorDisasterRecordsRelationTable.lossesCost}, 0)::numeric)`))
        .limit(10);

    // Calculate total damages and losses for percentage
    const totalDamages = damages.reduce((sum, item) => sum + Number(item.value), 0);
    const totalLosses = losses.reduce((sum, item) => sum + Number(item.value), 0);

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
        eventsCount: eventsCountWithPercentage,
        damages: damagesWithPercentage,
        losses: lossesWithPercentage,
        metadata,
        faoAgriculturalImpact
    };
}
