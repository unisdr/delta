/**
 * Geographic Impact Analysis Module
 * 
 * This module implements spatial analysis of disaster impacts following international standards:
 * 
 * 1. Sendai Framework for Disaster Risk Reduction 2015-2030
 *    Reference: https://www.undrr.org/publication/sendai-framework-disaster-risk-reduction-2015-2030
 *    - Target C: Economic loss by geographic region
 *    - Target D: Critical infrastructure damage by area
 * 
 * 2. UNDRR Technical Guidance (2017)
 *    Reference: https://www.preventionweb.net/publication/technical-guidance-monitoring-and-reporting-progress
 *    - Section C: Spatial Data Requirements
 *    - Pages 89-92: Geographic aggregation methods
 * 
 * 3. World Bank DaLA Methodology
 *    Reference: https://openknowledge.worldbank.org/handle/10986/2403
 *    - Chapter 5: Geographic Impact Assessment
 *    - Section 5.2: Administrative Level Analysis
 */

import { eq, sql, SQL, and, count, desc, inArray, gte, lte, exists } from "drizzle-orm";
import { dr } from "~/db.server";
import {
    disasterRecordsTable,
    damagesTable,
    lossesTable,
    divisionTable,
    type Division,
    disasterEventTable,
    hazardousEventTable,
    hipHazardTable,
    sectorDisasterRecordsRelationTable,
    sectorTable,
    hipClusterTable,
    hipTypeTable
} from "~/drizzle/schema";
import { getSectorsByParentId } from "./sectors";
import { createAssessmentMetadata } from "~/backend.server/utils/disasterCalculations";
import type { DisasterImpactMetadata } from "~/types/disasterCalculations";

/**
 * Interface for geographic impact query filters
 * Based on UNDRR's spatial data requirements
 */
export interface GeographicImpactFilters {
    sectorId?: string;
    subSectorId?: string;
    hazardTypeId?: string;
    hazardClusterId?: string;
    specificHazardId?: string;
    fromDate?: string;
    toDate?: string;
    disasterEventId?: string;
    /**
     * Assessment type following UNDRR Technical Guidance:
     * - 'rapid': Quick assessment within first 2 weeks
     * - 'detailed': Comprehensive assessment after 2+ weeks
     */
    assessmentType?: 'rapid' | 'detailed';
    /**
     * Confidence level based on World Bank DaLA methodology:
     * - 'low': Limited data availability or rapid assessment
     * - 'medium': Partial data with some field verification
     * - 'high': Complete data with full field verification
     */
    confidenceLevel?: 'low' | 'medium' | 'high';
    geographicLevelId?: string;
}

/**
 * Interface for geographic impact query filters
 * Based on UNDRR's spatial data requirements
 */
interface GeographicFilters {
    /** Start date for impact period */
    startDate?: string | null;
    /** End date for impact period */
    endDate?: string | null;
    /** Specific hazard type filter */
    hazardType?: string | null;
    /** Hazard cluster for grouped analysis */
    hazardCluster?: string | null;
    /** Individual hazard identifier */
    specificHazard?: string | null;
    /** Administrative level for aggregation */
    geographicLevel?: number | null;
    /** Specific event identifier */
    disasterEvent?: string | null;
    /** Assessment type (rapid/detailed) */
    assessmentType?: 'rapid' | 'detailed';
    /** Data confidence level */
    confidenceLevel?: 'low' | 'medium' | 'high';
}

interface DivisionValues {
    totalDamage: number | null;
    totalLoss: number | null;
    sources: Set<string>;
    metadata: DisasterImpactMetadata;
    dataAvailability: 'available' | 'no_data' | 'zero';
}

interface CleanDivisionValues {
    totalDamage: number | null;
    totalLoss: number | null;
    metadata: DisasterImpactMetadata;
    dataAvailability: 'available' | 'no_data' | 'zero';
}

interface GeographicImpactResult {
    success: boolean;
    divisions: Division[];
    values: { [key: string]: CleanDivisionValues };
    error?: string;
}

interface LocationImpact {
    location: string;
    damage: number;
    loss: number;
    disasterIds: string[];
}

interface NormalizedDivision {
    original: string;
    normalized: string;
    simple: string;
    id: number | null;
    level: number | null;
    parentId: number | null;
}

interface MatchResult {
    division: Division;
    confidence: number;
    impacts: LocationImpact[];
}

interface GeoJSONGeometry {
    type: string;
    coordinates: number[] | number[][] | number[][][] | number[][][][];
}

interface GeoJSONFeature {
    type: "Feature";
    geometry: GeoJSONGeometry;
    properties?: Record<string, any>;
}

interface GeoJSONFeatureCollection {
    type: "FeatureCollection";
    features: GeoJSONFeature[];
}

type GeoJSON = GeoJSONGeometry | GeoJSONFeature | GeoJSONFeatureCollection;

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

// Helper function to calculate Levenshtein distance for fuzzy matching
function levenshteinDistance(str1: string, str2: string): number {
    const track = Array(str2.length + 1).fill(null).map(() =>
        Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) track[0][i] = i;
    for (let j = 0; j <= str2.length; j++) track[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
        for (let i = 1; i <= str1.length; i++) {
            const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
            track[j][i] = Math.min(
                track[j][i - 1] + 1, // deletion
                track[j - 1][i] + 1, // insertion
                track[j - 1][i - 1] + indicator // substitution
            );
        }
    }
    return track[str2.length][str1.length];
}

// Helper function to calculate similarity ratio
function calculateSimilarity(str1: string, str2: string): number {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1.0;
    const distance = levenshteinDistance(str1, str2);
    return 1 - (distance / maxLength);
}

// Helper function to prepare division for matching
function prepareDivisionForMatching(division: Division): NormalizedDivision {
    const cacheKey = `${division.id}-${division.name.en}`;

    if (normalizedDivisionsCache.has(cacheKey)) {
        return normalizedDivisionsCache.get(cacheKey)!;
    }

    const divNameFull = normalizeText(division.name.en);
    const divNameSimple = divNameFull
        .replace(/\s*\(.*?\)\s*/g, '')  // Remove anything in parentheses
        .replace(/\s+/g, ' ')           // Clean up spaces
        .trim();

    const normalizedDiv: NormalizedDivision = {
        original: division.name.en,
        normalized: divNameFull,
        simple: divNameSimple,
        id: division.id,
        level: division.level,
        parentId: division.parentId ?? null
    };

    normalizedDivisionsCache.set(cacheKey, normalizedDiv);
    return normalizedDiv;
}

// Helper function to find matches with confidence scores
function findMatchesWithConfidence(locationPart: string, division: NormalizedDivision): number {
    const locationNorm = normalizeText(locationPart);

    // Try exact matches first
    if (division.simple === locationNorm || division.normalized === locationNorm) {
        return 1.0;
    }

    // Calculate similarity scores
    const simpleSimilarity = calculateSimilarity(locationNorm, division.simple);
    const normalizedSimilarity = calculateSimilarity(locationNorm, division.normalized);

    // Get the best similarity score
    const bestSimilarity = Math.max(simpleSimilarity, normalizedSimilarity);

    // Additional checks for partial matches
    const locationWords = locationNorm.split(' ');
    const divisionWords = division.simple.split(' ');

    // Check for word-level matches
    const wordMatchScore = locationWords.reduce((score, word) => {
        if (word.length <= 2) return score;
        if (divisionWords.some(divWord => divWord.includes(word) || word.includes(divWord))) {
            score += 0.2; // Boost score for each matching word
        }
        return score;
    }, 0);

    return Math.min(1.0, bestSimilarity + wordMatchScore);
}

// Main matching function
async function findMatchingDivision(locationName: string, divisions: Division[], locationImpacts: LocationImpact[]): Promise<MatchResult[]> {
    try {
        if (!locationName || !divisions.length) {
            throw new Error('Invalid input parameters');
        }

        const normalizedLocation = normalizeText(locationName);
        console.log("Processing location:", normalizedLocation);

        // Get all potential matches with confidence scores
        const matchesWithScores = divisions.map(division => {
            const normalizedDiv = prepareDivisionForMatching(division);
            const confidence = findMatchesWithConfidence(normalizedLocation, normalizedDiv);
            return {
                division,
                confidence,
                impacts: locationImpacts
            };
        }).filter(match => match.confidence > 0.6);

        // Sort by confidence score
        matchesWithScores.sort((a, b) => b.confidence - a.confidence);

        // Log matching results for debugging
        console.log("Matching results:", matchesWithScores.map(match => ({
            name: match.division.name.en,
            confidence: match.confidence,
            impacts: match.impacts.map(impact => ({
                location: impact.location,
                damage: impact.damage,
                loss: impact.loss
            }))
        })));

        return matchesWithScores;

    } catch (error) {
        console.error('Unexpected error during geographic matching:', error);
        return [];
    }
}

// Helper function to check if words match
function doWordsMatch(word1: string, word2: string): boolean {
    if (word1.length <= 2 || word2.length <= 2) return false;
    return word1.includes(word2) || word2.includes(word1);
}

// Helper function to find matches in word arrays
function findMatchingWords(locationWords: string[], divisionWords: string[]): boolean {
    return locationWords.some(word =>
        divisionWords.some(divWord => doWordsMatch(word, divWord))
    );
}

// Helper function to calculate the area of a ring
function calculateArea(ring: number[][]): number {
    let area = 0;
    for (let i = 0; i < ring.length - 1; i++) {
        area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
    }
    return area / 2;
}

// Helper function to reverse ring coordinates if needed
function ensureRightHandRule(ring: number[][]): number[][] {
    // Area > 0 means counterclockwise, < 0 means clockwise
    const area = calculateArea(ring);

    // For exterior rings (first ring in polygon), we want counterclockwise (positive area)
    // If area is negative, reverse the coordinates
    if (area < 0) {
        return ring.reverse();
    }
    return ring;
}

// Parse PostgreSQL geometry to GeoJSON
function parseGeometry(geojson: any): GeoJSONGeometry | null {
    try {
        // If it's already a GeoJSON object, validate and return it
        if (typeof geojson === 'object' && geojson !== null) {
            // Ensure coordinates are properly structured arrays
            if (geojson.type === 'MultiPolygon') {
                // MultiPolygon structure: [[[[x,y],[x,y]...]]]
                const coordinates = geojson.coordinates.map((polygon: any) => {
                    return polygon.map((ring: any) => {
                        return ring.map((coord: any) => {
                            if (Array.isArray(coord) && coord.length >= 2) {
                                // Ensure coordinates are numbers and in the correct range
                                const [lng, lat] = coord;
                                if (typeof lng === 'number' && typeof lat === 'number' &&
                                    !isNaN(lng) && !isNaN(lat) &&
                                    Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
                                    return [lng, lat];
                                }
                            }
                            throw new Error(`Invalid coordinate: ${JSON.stringify(coord)}`);
                        });
                    });
                });

                return {
                    type: 'MultiPolygon',
                    coordinates
                };
            } else if (geojson.type === 'Polygon') {
                // Polygon structure: [[[x,y],[x,y]...]]
                const coordinates = geojson.coordinates.map((ring: any) => {
                    return ring.map((coord: any) => {
                        if (Array.isArray(coord) && coord.length >= 2) {
                            // Ensure coordinates are numbers and in the correct range
                            const [lng, lat] = coord;
                            if (typeof lng === 'number' && typeof lat === 'number' &&
                                !isNaN(lng) && !isNaN(lat) &&
                                Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
                                return [lng, lat];
                            }
                        }
                        throw new Error(`Invalid coordinate: ${JSON.stringify(coord)}`);
                    });
                });

                return {
                    type: 'Polygon',
                    coordinates
                };
            }
        }

        // If it's a string (from PostgreSQL), parse it
        if (typeof geojson === 'string') {
            try {
                const parsed = JSON.parse(geojson);
                return parseGeometry(parsed);
            } catch (e) {
                console.error('Error parsing geometry string:', e);
                return null;
            }
        }

        console.warn('Unsupported geometry type:', geojson);
        return null;
    } catch (error) {
        console.error('Error parsing geometry:', error);
        return null;
    }
}

// Type guards for GeoJSON types
function isFeature(json: any): json is GeoJSONFeature {
    return json?.type === 'Feature' && json?.geometry !== undefined;
}

function isFeatureCollection(json: any): json is GeoJSONFeatureCollection {
    return json?.type === 'FeatureCollection' && Array.isArray(json?.features);
}

function isGeometry(json: any): json is GeoJSONGeometry {
    return json?.type && ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon'].includes(json.type) && Array.isArray(json?.coordinates);
}

// Helper function to safely convert money values
function safeMoneyToNumber(value: string | number | null): number {
    if (value === null) return 0;
    if (typeof value === 'string') return parseFloat(value) || 0;
    return value;
}

// Helper function to safely parse sector ID
function parseSectorId(sectorId: string | number | undefined): number | undefined {
    if (typeof sectorId === 'undefined') {
        return undefined;
    }
    if (typeof sectorId === 'number') {
        return sectorId;
    }
    const parsed = parseInt(sectorId, 10);
    return isNaN(parsed) ? undefined : parsed;
}

// Gets all subsector IDs for a given sector and its subsectors following international standards.
// This implementation uses the proper hierarchical structure defined in the sector table
// rather than relying on ID patterns, making it suitable for all countries.
// 
// @param sectorId - The ID of the sector to get subsectors for
// @returns Array of sector IDs including the input sector and all its subsectors
const getAllSubsectorIds = async (sectorId: string | undefined): Promise<number[]> => {
    if (!sectorId) return [];

    const parsedId = parseInt(sectorId, 10);
    if (isNaN(parsedId)) return [];

    const subsectors = await getSectorsByParentId(parsedId);
    const subsectorIds = subsectors.map(sector => sector.id);
    return [parsedId, ...subsectorIds];
};

/**
 * Main function to get geographic impact following international standards:
 * 
 * 1. Sendai Framework for Disaster Risk Reduction:
 *    - Target C: Economic loss calculation by geographic area
 *    - Target D: Critical infrastructure damage by region
 * 
 * 2. World Bank DaLA Methodology:
 *    - Separate tracking of damage and losses
 *    - Spatial analysis for impact distribution
 * 
 * 3. UNDRR Technical Guidance:
 *    - Assessment types (rapid vs detailed)
 *    - Confidence levels for data quality
 */
export async function getGeographicImpact(filters: GeographicImpactFilters): Promise<GeographicImpactResult> {
    try {
        // Get sector IDs based on selection
        let sectorIds: number[] = [];
        if (filters.subSectorId) {
            // If subsector is selected, only use that ID
            const parsedSubSectorId = parseInt(filters.subSectorId, 10);
            sectorIds = !isNaN(parsedSubSectorId) ? [parsedSubSectorId] : [];
        } else if (filters.sectorId) {
            // If only parent sector is selected, get all its subsectors
            sectorIds = await getAllSubsectorIds(filters.sectorId);
        }

        if (filters.sectorId && sectorIds.length === 0) {
            return {
                success: false,
                divisions: [],
                values: {},
                error: 'Invalid sector ID'
            };
        }

        // Create assessment metadata with defaults following UNDRR standards
        const metadata = createAssessmentMetadata(
            filters.assessmentType || 'rapid',
            filters.confidenceLevel || 'low'
        );

        // Base conditions for disaster records following DaLA methodology
        const baseConditions: SQL[] = [
            sql`${disasterRecordsTable.approvalStatus} = 'completed'`
        ];

        // Add sector filtering using sectorDisasterRecordsRelationTable
        if (sectorIds.length > 0) {
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

        // Add date range filters if provided
        if (filters.fromDate) {
            baseConditions.push(sql`${disasterRecordsTable.startDate} >= ${filters.fromDate}`);
        }
        if (filters.toDate) {
            baseConditions.push(sql`${disasterRecordsTable.endDate} <= ${filters.toDate}`);
        }

        // Add hazard type filters if provided
        if (filters.hazardTypeId) {
            baseConditions.push(eq(hazardousEventTable.hipTypeId, filters.hazardTypeId));
        }
        if (filters.hazardClusterId) {
            baseConditions.push(eq(hazardousEventTable.hipClusterId, filters.hazardClusterId));
            // Ensure hazard cluster matches its parent type
            if (filters.hazardTypeId) {
                baseConditions.push(
                    inArray(
                        hazardousEventTable.hipClusterId,
                        dr.select({ id: hipClusterTable.id })
                            .from(hipClusterTable)
                            .where(eq(hipClusterTable.typeId, filters.hazardTypeId))
                    )
                );
            }
        }
        if (filters.specificHazardId) {
            baseConditions.push(eq(hazardousEventTable.hipHazardId, filters.specificHazardId));
            // Ensure specific hazard matches its parent cluster
            if (filters.hazardClusterId) {
                baseConditions.push(
                    inArray(
                        hazardousEventTable.hipHazardId,
                        dr.select({ id: hipHazardTable.id })
                            .from(hipHazardTable)
                            .where(eq(hipHazardTable.clusterId, filters.hazardClusterId))
                    )
                );
            }
        }

        // Get divisions with complete fields and apply geographic level filter
        const divisions = await dr
            .select({
                id: divisionTable.id,
                parentId: divisionTable.parentId,
                name: divisionTable.name,
                level: divisionTable.level,
                geojson: divisionTable.geojson,
                geom: divisionTable.geom,
                bbox: divisionTable.bbox,
                spatial_index: divisionTable.spatial_index,
                importId: divisionTable.importId
            })
            .from(divisionTable)
            .where(
                filters.geographicLevelId
                    ? eq(divisionTable.id, parseInt(filters.geographicLevelId))
                    : undefined
            );

        if (divisions.length === 0) {
            return {
                success: false,
                divisions: [],
                values: {},
                error: 'No divisions found'
            };
        }

        // Create a map to store values for each division
        const values: { [key: string]: DivisionValues } = {};

        for (const division of divisions) {
            // Get disaster records that intersect with this division using PostGIS
            const recordsInDivision = await dr
                .select({
                    id: disasterRecordsTable.id
                })
                .from(disasterRecordsTable)
                .leftJoin(disasterEventTable, eq(disasterRecordsTable.disasterEventId, disasterEventTable.id))
                .leftJoin(hazardousEventTable, eq(disasterEventTable.hazardousEventId, hazardousEventTable.id))
                .where(and(
                    ...baseConditions,
                    sql`${disasterRecordsTable.spatialFootprint} IS NOT NULL`,
                    sql`ST_Intersects(
                        ST_SetSRID(ST_GeomFromGeoJSON(${disasterRecordsTable.spatialFootprint}), 4326),
                        ${division.geom}
                    )`
                ));

            if (recordsInDivision.length === 0) {
                values[division.id.toString()] = {
                    totalDamage: 0,
                    totalLoss: 0,
                    sources: new Set(),
                    metadata,
                    dataAvailability: 'no_data'
                };
                continue;
            }

            const recordIds = recordsInDivision.map(r => r.id);

            // Get damages and losses from sectorDisasterRecordsRelationTable
            const impactData = await dr
                .select({
                    totalDamage: sql<string>`COALESCE(SUM(CASE 
                        WHEN ${sectorDisasterRecordsRelationTable.withDamage} = true 
                        THEN COALESCE(${sectorDisasterRecordsRelationTable.damageCost}, 0) + COALESCE(${sectorDisasterRecordsRelationTable.damageRecoveryCost}, 0)
                        ELSE 0 
                    END), 0)`,
                    totalLoss: sql<string>`COALESCE(SUM(CASE 
                        WHEN ${sectorDisasterRecordsRelationTable.withLosses} = true 
                        THEN COALESCE(${sectorDisasterRecordsRelationTable.lossesCost}, 0)
                        ELSE 0 
                    END), 0)`
                })
                .from(sectorDisasterRecordsRelationTable)
                .where(and(
                    inArray(sectorDisasterRecordsRelationTable.disasterRecordId, recordIds),
                    sectorIds.length > 0 ? inArray(sectorDisasterRecordsRelationTable.sectorId, sectorIds) : undefined
                ));

            const totalDamage = parseFloat(impactData[0]?.totalDamage || '0');
            const totalLoss = parseFloat(impactData[0]?.totalLoss || '0');

            values[division.id.toString()] = {
                totalDamage,
                totalLoss,
                sources: new Set(recordIds),
                metadata,
                dataAvailability: totalDamage > 0 || totalLoss > 0 ? 'available' : 'zero'
            };
        }

        // Clean up division values for response
        const cleanDivisionValues: { [key: string]: CleanDivisionValues } = {};
        for (const [key, value] of Object.entries(values)) {
            cleanDivisionValues[key] = {
                totalDamage: value.totalDamage,
                totalLoss: value.totalLoss,
                metadata: value.metadata,
                dataAvailability: value.dataAvailability
            };
        }

        return {
            success: true,
            divisions,
            values: cleanDivisionValues
        };

    } catch (error) {
        console.error('Error in getGeographicImpact:', error);
        return {
            success: false,
            divisions: [],
            values: {},
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}

/**
 * Retrieves disaster records for a geographic division following UNDRR guidelines
 * 
 * Implements spatial filtering based on:
 * 1. Administrative boundaries (UNDRR Technical Guidance Section C.2)
 * 2. Temporal ranges (Sendai Framework Monitoring Period)
 * 3. Hazard classifications (UNDRR Hazard Classification)
 * 
 * @param divisionId - Geographic division identifier
 * @param filters - Analysis filters following UNDRR standards
 * @returns Array of matching disaster record IDs
 */
async function getDisasterRecordsForDivision(
    divisionId: string,
    filters?: GeographicFilters
): Promise<string[]> {
    try {
        console.log("Getting disaster records for division:", divisionId, "filters:", filters);

        // Build conditions array
        const conditions: SQL[] = [eq(disasterRecordsTable.locationDesc, divisionId)];

        // Add date filters if specified
        if (filters?.startDate) {
            conditions.push(gte(disasterRecordsTable.startDate, filters.startDate));
        }
        if (filters?.endDate) {
            conditions.push(lte(disasterRecordsTable.endDate, filters.endDate));
        }

        // Build base query
        const query = dr
            .select({
                id: disasterRecordsTable.id
            })
            .from(disasterRecordsTable);

        // Add joins and hazard conditions if needed
        if (filters?.hazardType || filters?.hazardCluster || filters?.specificHazard) {
            query
                .innerJoin(
                    disasterEventTable,
                    eq(disasterRecordsTable.disasterEventId, disasterEventTable.id)
                )
                .innerJoin(
                    hazardousEventTable,
                    eq(disasterEventTable.hazardousEventId, hazardousEventTable.id)
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
                    hipTypeTable,
                    eq(hipClusterTable.typeId, hipTypeTable.id)
                );

            // Add hazard filters in hierarchical order
            if (filters.hazardType) {
                conditions.push(eq(hipTypeTable.id, filters.hazardType));
            }
            if (filters.hazardCluster) {
                conditions.push(eq(hipClusterTable.id, filters.hazardCluster));
            }
            if (filters.specificHazard) {
                conditions.push(eq(hipHazardTable.id, filters.specificHazard));
            }
        }

        // Apply all conditions
        query.where(and(...conditions));

        // Execute query and map results
        const records = await query;
        return records.map(record => record.id);

    } catch (error) {
        console.error("Error getting disaster records for division:", error);
        return [];
    }
}

/**
 * Aggregates damage data for a geographic area
 * Following World Bank DaLA Chapter 5.2 methodology:
 * - Aggregates both public and private sector damages
 * - Includes direct physical asset damage
 * - Uses standardized calculation methods
 * 
 * @param recordIds - Disaster record IDs to aggregate
 * @returns Total damage and yearly breakdown
 */
async function aggregateDamagesData(recordIds: string[]): Promise<{ total: number, byYear: Map<number, number> }> {
    try {
        console.log("Aggregating damages for records:", recordIds);

        // Get all damages for the given records with their associated disaster record dates
        const damagesWithDates = await dr
            .select({
                value: sql<string>`COALESCE(SUM(${damagesTable.totalRepairReplacement}), 0)`,
                year: sql`EXTRACT(YEAR FROM ${disasterRecordsTable.startDate}::date)`.mapWith(Number)
            })
            .from(damagesTable)
            .innerJoin(
                disasterRecordsTable,
                eq(damagesTable.recordId, disasterRecordsTable.id)
            )
            .where(inArray(damagesTable.recordId, recordIds))
            .groupBy(sql`EXTRACT(YEAR FROM ${disasterRecordsTable.startDate}::date)`);

        // Calculate the total damage
        const totalDamage = damagesWithDates.reduce((total, damage) => total + Number(damage.value || 0), 0);

        // Create a map to store the yearly breakdown
        const byYear: Map<number, number> = new Map();
        for (const damage of damagesWithDates) {
            const year = damage.year || new Date().getFullYear();
            byYear.set(year, Number(damage.value || 0));
        }

        return { total: totalDamage, byYear };
    } catch (error) {
        console.error("Error aggregating damages:", error);
        return { total: 0, byYear: new Map() };
    }
}

/**
 * Aggregates loss data for a geographic area
 * Following Sendai Framework Target C indicators:
 * - Includes economic flow disruptions
 * - Covers both public and private sectors
 * - Uses UNDRR-approved calculation methods
 * 
 * @param recordIds - Disaster record IDs to aggregate
 * @returns Total losses and yearly breakdown
 */
async function aggregateLossesData(recordIds: string[]): Promise<{ total: number, byYear: Map<number, number> }> {
    try {
        console.log("Aggregating losses for records:", recordIds);

        // Get all losses for the given records with their associated disaster record dates
        const lossesWithDates = await dr
            .select({
                value: sql<string>`COALESCE(SUM(${lossesTable.publicCostTotal} + ${lossesTable.privateCostTotal}), 0)`,
                year: sql`EXTRACT(YEAR FROM ${disasterRecordsTable.startDate}::date)`.mapWith(Number)
            })
            .from(lossesTable)
            .innerJoin(
                disasterRecordsTable,
                eq(lossesTable.recordId, disasterRecordsTable.id)
            )
            .where(inArray(lossesTable.recordId, recordIds))
            .groupBy(sql`EXTRACT(YEAR FROM ${disasterRecordsTable.startDate}::date)`);

        // Calculate the total losses
        const totalLoss = lossesWithDates.reduce((total, loss) => total + Number(loss.value || 0), 0);

        // Create a map to store the yearly breakdown
        const byYear: Map<number, number> = new Map();
        for (const loss of lossesWithDates) {
            const year = loss.year || new Date().getFullYear();
            byYear.set(year, Number(loss.value || 0));
        }

        return { total: totalLoss, byYear };
    } catch (error) {
        console.error("Error aggregating losses:", error);
        return { total: 0, byYear: new Map() };
    }
}

/**
 * Fetches comprehensive geographic impact data
 * Implements multiple international standards:
 * 
 * 1. Sendai Framework:
 *    - Target C: Economic loss by region
 *    - Target D: Infrastructure damage by area
 * 
 * 2. World Bank DaLA:
 *    - Geographic damage assessment
 *    - Administrative level analysis
 * 
 * 3. UNDRR Technical Guidance:
 *    - Spatial data requirements
 *    - Geographic aggregation methods
 * 
 * @param divisionId - Geographic division to analyze
 * @param filters - Analysis filters following UNDRR standards
 * @returns Geographic impact data with metadata
 */
export async function fetchGeographicImpactData(
    divisionId: string,
    filters?: GeographicFilters
): Promise<{ totalDamage: number, totalLoss: number, byYear: Map<number, number> }> {
    try {
        console.log("Fetching geographic impact data for division:", divisionId, "filters:", filters);

        // Get disaster records for the division
        const recordIds = await getDisasterRecordsForDivision(divisionId, filters);

        // Aggregate damages and losses
        const { total: totalDamage, byYear: damageByYear } = await aggregateDamagesData(recordIds);
        const { total: totalLoss, byYear: lossByYear } = await aggregateLossesData(recordIds);

        // Merge the yearly breakdowns
        const byYear: Map<number, number> = new Map();
        for (const [year, value] of damageByYear) {
            byYear.set(year, value);
        }
        for (const [year, value] of lossByYear) {
            if (byYear.has(year)) {
                byYear.set(year, byYear.get(year)! + value);
            } else {
                byYear.set(year, value);
            }
        }

        return { totalDamage, totalLoss, byYear };
    } catch (error) {
        console.error("Error fetching geographic impact data:", error);
        return { totalDamage: 0, totalLoss: 0, byYear: new Map() };
    }
}

/**
 * Main function to get geographic impact following international standards
 */
export async function getGeographicImpactGeoJSON(sectorId: string, subSectorId?: string): Promise<GeoJSONFeatureCollection> {
    const result = await getGeographicImpact({ sectorId, subSectorId });

    if (!result.success) {
        return {
            type: "FeatureCollection",
            features: []
        };
    }

    const features: GeoJSONFeature[] = result.divisions.map((division: Division) => ({
        type: 'Feature' as const,
        geometry: (typeof division.geojson === 'string' ? JSON.parse(division.geojson) : division.geojson) as GeoJSONGeometry,
        properties: {
            id: Number(division.id),
            name: division.name as Record<string, string>,
            level: division.level,
            parentId: division.parentId,
            totalDamage: result.values[division.id.toString()]?.totalDamage ?? 0,
            totalLoss: result.values[division.id.toString()]?.totalLoss ?? 0
        }
    }));

    return {
        type: "FeatureCollection",
        features
    };
}

// Memoization cache for normalized divisions
const normalizedDivisionsCache = new Map<string, NormalizedDivision>();
