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

import { eq, sql, SQL, and, count, desc, inArray, gte, lte, exists, or } from "drizzle-orm";
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
    /** Disaster event identifier */
    _disasterEventId?: string | null;
    /** Assessment type (rapid/detailed) */
    assessmentType?: 'rapid' | 'detailed';
    /** Data confidence level */
    confidenceLevel?: 'low' | 'medium' | 'high';
    /** Sector ID for filtering */
    sectorId?: string;
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
    return json?.type && ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon', 'GeometryCollection'].includes(json.type) && Array.isArray(json?.coordinates);
}

// Helper function to safely convert money values
function safeMoneyToNumber(value: string | number | null): number {
    try {
        if (value === null || value === undefined) return 0;

        // Handle string values (most common from SQL queries)
        if (typeof value === 'string') {
            // Remove any currency symbols or commas
            const cleanValue = value.replace(/[$,]/g, '').trim();
            if (!cleanValue) return 0;

            const parsed = parseFloat(cleanValue);
            return isNaN(parsed) ? 0 : parsed;
        }

        // Handle numeric values
        return typeof value === 'number' ? value : 0;
    } catch (error) {
        console.error("Error converting money value:", error);
        return 0;
    }
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
const getAllSubsectorIds = async (sectorId: string | number): Promise<number[]> => {
    const seen = new Set<number>();
    const toVisit = [parseInt(sectorId.toString(), 10)];

    while (toVisit.length > 0) {
        const currentId = toVisit.pop()!;
        if (seen.has(currentId)) continue;
        seen.add(currentId);

        const children = await getSectorsByParentId(currentId);
        for (const child of children) {
            if (!seen.has(child.id)) {
                toVisit.push(child.id);
            }
        }
    }

    return Array.from(seen);
};

/**
 * Validates if a value is a properly formatted GeoJSON object
 * Following OGC GeoJSON standard requirements
 */
function isValidGeoJSON(value: any): boolean {
    try {
        if (!value || typeof value !== 'object') return false;

        // If it's already parsed JSON, check for required properties
        if (typeof value === 'object') {
            // Check for required GeoJSON properties
            return (
                (value.type === 'Feature' && value.geometry) ||
                (value.type === 'FeatureCollection' && Array.isArray(value.features)) ||
                (['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon', 'GeometryCollection'].includes(value.type))
            );
        }
        return false;
    } catch (error) {
        console.error("Error validating GeoJSON:", error);
        return false;
    }
}

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
            sectorIds = await getAllSubsectorIds(parsedSubSectorId);
            console.log('Expanded sector IDs from subSector:', sectorIds);
            // sectorIds = !isNaN(parsedSubSectorId) ? [parsedSubSectorId] : [];
            // console.log('Using specific subsector ID:', parsedSubSectorId);
        } else if (filters.sectorId) {
            // If only parent sector is selected, get all its subsectors
            sectorIds = await getAllSubsectorIds(filters.sectorId);
            console.log('Retrieved all subsector IDs for sector', filters.sectorId, ':', sectorIds);
        }

        if (filters.sectorId && sectorIds.length === 0) {
            return {
                success: false,
                divisions: [],
                values: {},
                error: 'Invalid sector ID'
            };
        }

        // Create assessment metadata with all required fields
        const metadata = createAssessmentMetadata(
            filters.assessmentType || 'rapid',
            filters.confidenceLevel || 'low'
        );

        // Base conditions for disaster records following DaLA methodology
        const baseConditions: Array<SQL<unknown>> = [
            sql<string>`${disasterRecordsTable.approvalStatus} = 'published'`
        ];

        // Add sector filtering using sectorDisasterRecordsRelationTable
        if (sectorIds.length > 0) {
            // console.log('Adding sector filter for IDs:', sectorIds);
            const sectorCondition = exists(
                dr.select()
                    .from(sectorDisasterRecordsRelationTable)
                    .where(and(
                        eq(sectorDisasterRecordsRelationTable.disasterRecordId, disasterRecordsTable.id),
                        inArray(sectorDisasterRecordsRelationTable.sectorId, sectorIds)
                    ))
            );
            baseConditions.push(sectorCondition);
            console.log(`✔ Sector filter applied for ${sectorIds.length} IDs`);
        }

        // Add date range filters if provided
        if (filters.fromDate) {
            baseConditions.push(gte(disasterRecordsTable.startDate, filters.fromDate));
        }
        if (filters.toDate) {
            baseConditions.push(lte(disasterRecordsTable.endDate, filters.toDate));
        }

        // Add disaster event filter if provided
        if (filters.disasterEventId) {
            try {
                const eventId = filters.disasterEventId;
                if (eventId) {
                    // Check if it's a UUID (for direct ID matching)
                    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                    if (uuidRegex.test(eventId)) {
                        // Direct ID match for UUID format
                        baseConditions.push(eq(disasterEventTable.id, eventId));
                    } else {
                        // Text search across multiple fields for non-UUID format
                        const searchConditions: SQL<unknown>[] = [];
                        searchConditions.push(sql`LOWER(${disasterEventTable.nameNational}::text) LIKE ${`%${eventId.toLowerCase()}%`}`);
                        searchConditions.push(sql`LOWER(${disasterEventTable.id}::text) LIKE ${`%${eventId.toLowerCase()}%`}`);
                        searchConditions.push(sql`
                            CASE WHEN ${disasterEventTable.glide} IS NOT NULL 
                            THEN LOWER(${disasterEventTable.glide}) LIKE ${`%${eventId.toLowerCase()}%`}
                            ELSE FALSE END
                        `);
                        searchConditions.push(sql`
                            CASE WHEN ${disasterEventTable.nationalDisasterId} IS NOT NULL 
                            THEN LOWER(${disasterEventTable.nationalDisasterId}) LIKE ${`%${eventId.toLowerCase()}%`}
                            ELSE FALSE END
                        `);
                        searchConditions.push(sql`
                            CASE WHEN ${disasterEventTable.otherId1} IS NOT NULL 
                            THEN LOWER(${disasterEventTable.otherId1}) LIKE ${`%${eventId.toLowerCase()}%`}
                            ELSE FALSE END
                        `);

                        baseConditions.push(...searchConditions);
                    }
                }
            } catch (error) {
                console.error('Error filtering by disaster event:', error);
            }
        }

        // Hazard filtering with improved hierarchical structure handling
        if (filters.hazardTypeId) {
            console.log("🧪 Processing hazardTypeId:", filters.hazardTypeId);
            try {
                // Ensure hazardTypeId is a valid string before using in query
                if (typeof filters.hazardTypeId === 'string' && filters.hazardTypeId.trim()) {
                    // Check if the hazard type exists before adding condition
                    const typeExists = await dr
                        .select({ exists: sql`COUNT(*) > 0` })
                        .from(hipTypeTable)
                        .where(eq(hipTypeTable.id, filters.hazardTypeId))
                        .then(result => result[0]?.exists || false);

                    if (typeExists) {
                        baseConditions.push(sql<string>`${hazardousEventTable.hipTypeId} = ${filters.hazardTypeId}`);
                        console.log(`✔ Applied hazardTypeId filter: ${filters.hazardTypeId}`);
                    } else {
                        console.log(`⚠️ Skipped hazardTypeId: ${filters.hazardTypeId} (not found in hipTypeTable)`);
                    }
                } else {
                    console.warn(`❌ Invalid hazard type ID format: ${filters.hazardTypeId}`);
                }
            } catch (error) {
                console.error('Error filtering by hazard type:', error);
            }
        }

        if (filters.hazardClusterId) {
            try {
                // Ensure hazardClusterId is a valid string before using in query
                if (typeof filters.hazardClusterId === 'string' && filters.hazardClusterId.trim()) {
                    // First, check if the cluster exists
                    const clusterQuery = dr
                        .select({
                            exists: sql`COUNT(*) > 0`,
                            typeId: hipClusterTable.typeId
                        })
                        .from(hipClusterTable)
                        .where(eq(hipClusterTable.id, filters.hazardClusterId))
                        .limit(1);

                    const clusterResult = await clusterQuery;
                    const clusterExists = clusterResult[0]?.exists || false;

                    if (clusterExists) {
                        // Add condition for the cluster ID
                        baseConditions.push(sql<string>`${hazardousEventTable.hipClusterId} = ${filters.hazardClusterId}`);

                        // If hazardTypeId is also provided, ensure the cluster belongs to that type
                        if (filters.hazardTypeId) {
                            const clusterTypeId = clusterResult[0]?.typeId;

                            if (clusterTypeId !== filters.hazardTypeId) {
                                console.warn(`Hazard cluster ${filters.hazardClusterId} does not belong to type ${filters.hazardTypeId}`);
                                // Add a condition to ensure proper hierarchy is maintained
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
                    } else {
                        console.warn(`Hazard cluster ID not found: ${filters.hazardClusterId}`);
                    }
                } else {
                    console.warn(`Invalid hazard cluster ID format: ${filters.hazardClusterId}`);
                }
            } catch (error) {
                console.error('Error filtering by hazard cluster:', error);
            }
        }

        if (filters.specificHazardId) {
            try {
                // Ensure specificHazardId is a valid string before using in query
                if (typeof filters.specificHazardId === 'string' && filters.specificHazardId.trim()) {
                    // First, check if the hazard exists and get its cluster ID
                    const hazardQuery = dr
                        .select({
                            exists: sql`COUNT(*) > 0`,
                            clusterId: hipHazardTable.clusterId
                        })
                        .from(hipHazardTable)
                        .where(eq(hipHazardTable.id, filters.specificHazardId))
                        .limit(1);

                    const hazardResult = await hazardQuery;
                    const hazardExists = hazardResult[0]?.exists || false;

                    if (hazardExists) {
                        // Add condition for the specific hazard ID
                        baseConditions.push(sql<string>`${hazardousEventTable.hipHazardId} = ${filters.specificHazardId}`);

                        // If hazardClusterId is also provided, ensure the hazard belongs to that cluster
                        if (filters.hazardClusterId) {
                            const hazardClusterId = hazardResult[0]?.clusterId;

                            if (hazardClusterId !== filters.hazardClusterId) {
                                console.warn(`Specific hazard ${filters.specificHazardId} does not belong to cluster ${filters.hazardClusterId}`);
                                // Add a condition to ensure proper hierarchy is maintained
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

                        // If hazardTypeId is provided but hazardClusterId is not, ensure the hazard's cluster belongs to that type
                        if (filters.hazardTypeId && !filters.hazardClusterId) {
                            baseConditions.push(
                                inArray(
                                    hazardousEventTable.hipClusterId,
                                    dr.select({ id: hipClusterTable.id })
                                        .from(hipClusterTable)
                                        .where(eq(hipClusterTable.typeId, filters.hazardTypeId))
                                )
                            );
                        }
                    } else {
                        console.warn(`Specific hazard ID not found: ${filters.specificHazardId}`);
                    }
                } else {
                    console.warn(`Invalid specific hazard ID format: ${filters.specificHazardId}`);
                }
            } catch (error) {
                console.error('Error filtering by specific hazard:', error);
            }
        }

        // Get divisions with complete fields and apply geographic level filter



        const baseDivisionsQuery = dr
            .select({
                id: divisionTable.id,
                parentId: divisionTable.parentId,
                name: divisionTable.name,
                nationalId: divisionTable.nationalId,
                level: divisionTable.level,
                geojson: divisionTable.geojson,
                geom: divisionTable.geom,
                bbox: divisionTable.bbox,
                spatial_index: divisionTable.spatial_index,
                importId: divisionTable.importId
            })
            .from(divisionTable)
            .where(
                and(
                    eq(divisionTable.level, 1),
                    filters.geographicLevelId
                        ? eq(divisionTable.id, parseInt(filters.geographicLevelId))
                        : undefined
                )
            );

        let divisions: Division[] = [];
        try {
            divisions = await baseDivisionsQuery;

            if (!divisions || divisions.length === 0) {
                return {
                    success: false,
                    divisions: [],
                    values: {},
                    error: 'No divisions found for the given criteria'
                };
            }
        } catch (error) {
            console.error('Error fetching divisions:', error);
            return {
                success: false,
                divisions: [],
                values: {},
                error: 'Failed to fetch geographic divisions'
            };
        }

        // Create a map to store values for each division
        const values: { [key: string]: CleanDivisionValues } = {};

        for (const division of divisions) {
            try {
                const disasterRecords = await getDisasterRecordsForDivision(division.id.toString(), {
                    startDate: filters.fromDate,
                    endDate: filters.toDate,
                    hazardType: filters.hazardTypeId,
                    hazardCluster: filters.hazardClusterId,
                    specificHazard: filters.specificHazardId,
                    disasterEvent: filters.disasterEventId,
                    assessmentType: filters.assessmentType,
                    confidenceLevel: filters.confidenceLevel
                },
                    sectorIds
                );

                if (!disasterRecords || disasterRecords.length === 0) {
                    values[division.id.toString()] = {
                        totalDamage: 0,
                        totalLoss: 0,
                        metadata,
                        dataAvailability: 'no_data'
                    };
                    continue;
                }

                // Calculate impact values
                const { total: totalDamage } = await aggregateDamagesData(disasterRecords);
                const { total: totalLoss } = await aggregateLossesData(disasterRecords);

                values[division.id.toString()] = {
                    totalDamage,
                    totalLoss,
                    metadata,
                    dataAvailability: totalDamage > 0 || totalLoss > 0 ? 'available' : 'zero'
                };
            } catch (error) {
                console.error(`Error processing division ${division.id}:`, error);
                values[division.id.toString()] = {
                    totalDamage: 0,
                    totalLoss: 0,
                    metadata,
                    dataAvailability: 'no_data'
                };
            }
        }

        return {
            success: true,
            divisions,
            values
        };
    } catch (error) {
        console.error("Error in getGeographicImpact:", error);
        return {
            success: false,
            divisions: [],
            values: {},
            error: `Error processing geographic impact: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

export async function getDescendantDivisionIds(divisionId: number): Promise<number[]> {
    const allDivisions = await dr
        .select({
            id: divisionTable.id,
            parentId: divisionTable.parentId
        })
        .from(divisionTable);

    const childrenMap = new Map<number, number[]>();
    for (const { id, parentId } of allDivisions) {
        if (parentId === null) continue;
        if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
        childrenMap.get(parentId)!.push(id);
    }

    const result = new Set<number>();
    const queue = [divisionId];
    while (queue.length) {
        const current = queue.pop()!;
        const children = childrenMap.get(current) || [];
        for (const child of children) {
            if (!result.has(child)) {
                result.add(child);
                queue.push(child);
            }
        }
    }

    return [divisionId, ...Array.from(result)];
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
    filters?: GeographicFilters,
    sectorIds: number[] = []
): Promise<string[]> {
    try {
        console.log(`[Start] Fetching disaster records for Division ID: ${divisionId}`);

        // Fetch division data first to ensure it exists and has valid geometry
        const division = await dr
            .select({
                id: divisionTable.id,
                geom: divisionTable.geom
            })
            .from(divisionTable)
            .where(eq(divisionTable.id, parseInt(divisionId)))
            .limit(1);



        if (division.length === 0 || !division[0].geom) {
            console.warn(`Division ${divisionId} not found or has no geometry data`);
            return [];
        }

        // Build conditions array
        const conditions: Array<SQL<unknown>> = [];
        // console.log('Starting conditions array construction');

        // Add approval status filter
        conditions.push(sql<string>`${disasterRecordsTable.approvalStatus} = 'published'`);
        // console.log('Added approval status condition');

        // Add sector filter with hierarchy support
        if (sectorIds.length > 0) {
            // console.log('Applying sector filter for:', sectorIds);
            conditions.push(
                inArray(sectorDisasterRecordsRelationTable.sectorId, sectorIds)
            );
            console.log(`✔ Sector filter applied: ${sectorIds.length} sectors`);
        }

        //Log final conditions before query
        // console.log("Final WHERE conditions:", conditions.map(c => c.getSQL()));

        // Add date filters if specified
        if (filters?.startDate) {
            conditions.push(gte(disasterRecordsTable.startDate, filters.startDate));
        }
        if (filters?.endDate) {
            conditions.push(lte(disasterRecordsTable.endDate, filters.endDate));
        }

        // Add disaster event filter if provided
        if (filters?.disasterEvent) {
            try {
                const eventId = filters.disasterEvent;
                if (eventId) {
                    // Check if it's a UUID (for direct ID matching)
                    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                    if (uuidRegex.test(eventId)) {
                        // Direct ID match for UUID format
                        conditions.push(eq(disasterEventTable.id, eventId));
                    } else {
                        // Text search across multiple fields for non-UUID format
                        const searchConditions: Array<SQL<string>> = [];

                        if (disasterEventTable.nameNational) {
                            searchConditions.push(
                                sql<string>`LOWER(${disasterEventTable.nameNational}::text) LIKE ${`%${eventId.toLowerCase()}%`}`
                            );
                        }

                        searchConditions.push(
                            sql<string>`LOWER(${disasterEventTable.id}::text) LIKE ${`%${eventId.toLowerCase()}%`}`
                        );

                        if (disasterEventTable.glide) {
                            searchConditions.push(
                                sql<string>`CASE WHEN ${disasterEventTable.glide} IS NOT NULL 
                                    THEN LOWER(${disasterEventTable.glide}) LIKE ${`%${eventId.toLowerCase()}%`}
                                    ELSE FALSE END`
                            );
                        }

                        if (disasterEventTable.nationalDisasterId) {
                            searchConditions.push(
                                sql<string>`CASE WHEN ${disasterEventTable.nationalDisasterId} IS NOT NULL 
                                    THEN LOWER(${disasterEventTable.nationalDisasterId}) LIKE ${`%${eventId.toLowerCase()}%`}
                                    ELSE FALSE END`
                            );
                        }

                        if (disasterEventTable.otherId1) {
                            searchConditions.push(
                                sql<string>`CASE WHEN ${disasterEventTable.otherId1} IS NOT NULL 
                                    THEN LOWER(${disasterEventTable.otherId1}) LIKE ${`%${eventId.toLowerCase()}%`}
                                    ELSE FALSE END`
                            );
                        }

                        // Add the OR condition for text search if we have any conditions
                        conditions.push(...searchConditions);
                    }
                }
            } catch (error) {
                console.error('Error filtering by disaster event:', error);
            }
        }

        // Build base query
        const query = dr
            .select({
                id: disasterRecordsTable.id,
                spatialFootprint: disasterRecordsTable.spatialFootprint
            })
            .from(disasterRecordsTable)
            .innerJoin(
                sectorDisasterRecordsRelationTable,
                eq(sectorDisasterRecordsRelationTable.disasterRecordId, disasterRecordsTable.id)
            );

        const descendantIds = await getDescendantDivisionIds(parseInt(divisionId));

        const quoted = descendantIds.map((id) => `@ == "${id}"`).join(" || ");
        console.log(`✔ Division path filter applied: ${descendantIds.length} divisions`);

        const pathCondition = sql.raw(
            `jsonb_path_exists("disaster_records"."spatial_footprint", '$[*].geojson.dts_info.division_ids[*] ? (${quoted})')`
        );
        console.log("✔ JSONB path condition constructed for spatial filter");


        // First try to get records with spatial data
        const spatialQuery = query.where(
            and(
                ...conditions,
                sql`${disasterRecordsTable.spatialFootprint} IS NOT NULL`,
                sql.raw(
                    `jsonb_path_exists("disaster_records"."spatial_footprint", '$[*].geojson.dts_info.division_ids[*] ? (${quoted})')`
                )
            )
        );

        // console.log('Executing spatial query first');
        // console.log('Spatial SQL Query:', spatialQuery.toSQL().sql);
        // console.log('Query parameters:', spatialQuery.toSQL().params);
        console.log("🚀 Executing spatial query (SQL + params)");
        console.log(spatialQuery.toSQL());


        // Execute spatial query
        const spatialRecords = await spatialQuery;
        // console.log(`Spatial query returned ${spatialRecords.length} records`);
        // console.log("Matching disaster record IDs:", spatialRecords.map(r => r.id));
        console.log(`✔ Found ${spatialRecords.length} matching disaster records`);

        const divisionIdStr = divisionId.toString();

        const confirmed = spatialRecords.filter((record) => {
            const footprint = record.spatialFootprint;
            if (!Array.isArray(footprint)) return false;

            return footprint.some((feature) => {
                const info = feature.geojson?.dts_info;
                if (!info) return false;

                const ids = info.division_ids || [info.division_id];
                return Array.isArray(ids) ? ids.includes(divisionIdStr) : ids === divisionIdStr;
            });
        });

        // console.log('Sample footprint:', JSON.stringify(spatialRecords[0]?.spatialFootprint, null, 2));

        // console.dir(spatialRecords[0]?.spatialFootprint, { depth: null });


        console.log("After verification:", confirmed.length, "records confirmed to contain division", divisionId);

        // Verify each record actually contains the division ID in its footprint
        const verifiedRecords = [];
        for (const record of spatialRecords) {
            if (!record.spatialFootprint) continue;

            try {
                const footprint = typeof record.spatialFootprint === 'string'
                    ? JSON.parse(record.spatialFootprint)
                    : record.spatialFootprint;

                // Check if any item in the footprint contains this division ID
                // const hasMatchingDivision = footprint.some((item: any) => 
                //     item?.geojson?.dts_info?.division_ids?.includes(parseInt(divisionId))
                // );

                // Convert allIds to strings to match JSON content
                const allIds = new Set(descendantIds.map((id) => String(id)));

                const hasMatchingDivision = footprint.some((item: any) => {
                    const ids = item?.geojson?.dts_info?.division_ids;
                    if (!Array.isArray(ids)) return false;
                    return ids.some((id: any) => allIds.has(String(id)));
                });

                if (hasMatchingDivision) {
                    verifiedRecords.push({
                        id: record.id,
                        spatialFootprint: record.spatialFootprint
                    });
                }
            } catch (err) {
                console.warn(`Error parsing spatialFootprint for record ${record.id}:`, err);
                continue;
            }
        }

        // Use verified records for the rest of the function
        spatialRecords.length = 0;
        spatialRecords.push(...verifiedRecords);
        console.log(`✔ Verified ${confirmed.length} records for Division ${divisionId}`);

        // If no spatial matches, try text matching as fallback
        if (spatialRecords.length === 0) {
            console.log('No spatial matches found, trying text matching as fallback');
            try {
                // Fetch division name for text matching
                const divisionDetails = await dr
                    .select({
                        id: divisionTable.id,
                        name: divisionTable.name
                    })
                    .from(divisionTable)
                    .where(eq(divisionTable.id, parseInt(divisionId)))
                    .limit(1);

                if (divisionDetails.length > 0 && divisionDetails[0].name) {
                    const divisionName = divisionDetails[0].name.en || '';
                    const normalizedDivName = normalizeText(divisionName);
                    console.log(`Trying text match with division name: "${divisionName}" (normalized: "${normalizedDivName}")`);

                    const textQuery = query.where(and(
                        ...conditions,
                        sql<string>`(
                            ${disasterRecordsTable.locationDesc} = ${divisionId} OR
                            ${disasterRecordsTable.locationDesc} LIKE ${`%${divisionId}%`} OR
                            LOWER(${disasterRecordsTable.locationDesc}) LIKE ${`%${normalizedDivName.toLowerCase()}%`} OR
                            ${disasterRecordsTable.locationDesc} LIKE ${`%${divisionName}%`}
                        )`
                    ));

                    const textQueryStr = textQuery.toSQL();
                    console.log('Text matching SQL Query:', textQueryStr.sql);
                    console.log('Query parameters:', textQueryStr.params);

                    const textRecords = await textQuery;
                    console.log(`Text matching returned ${textRecords.length} additional records`);

                    return [...spatialRecords, ...textRecords].map(r => r.id);
                }
            } catch (error) {
                console.error(`Error in text matching for division ${divisionId}:`, error);
            }
        }

        return spatialRecords.map(r => r.id);
    } catch (error) {
        console.error("Error getting disaster records for division:", error);
        return [];
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
): Promise<{ totalDamage: number, totalLoss: number, byYear: Map<number, number>, metadata?: DisasterImpactMetadata }> {
    try {
        console.log("Fetching geographic impact data for division:", divisionId, "filters:", filters);

        // Validate division ID
        if (!divisionId || isNaN(parseInt(divisionId))) {
            console.error("Invalid division ID:", divisionId);
            return {
                totalDamage: 0,
                totalLoss: 0,
                byYear: new Map(),
                metadata: createAssessmentMetadata('rapid', 'low')
            };
        }

        // Get disaster records for the division with improved spatial handling
        const recordIds = await getDisasterRecordsForDivision(divisionId, filters);

        if (recordIds.length === 0) {
            console.log(`No disaster records found for division ${divisionId}`);
            return {
                totalDamage: 0,
                totalLoss: 0,
                byYear: new Map(),
                metadata: createAssessmentMetadata('rapid', 'low')
            };
        }

        // Aggregate damages and losses with proper numeric handling
        const { total: totalDamage } = await aggregateDamagesData(recordIds);
        const { total: totalLoss } = await aggregateLossesData(recordIds);

        // Merge the yearly breakdowns
        const byYear: Map<number, number> = new Map();
        for (const [year, value] of await aggregateDamagesData(recordIds).then(result => result.byYear)) {
            byYear.set(year, value);
        }
        for (const [year, value] of await aggregateLossesData(recordIds).then(result => result.byYear)) {
            if (byYear.has(year)) {
                byYear.set(year, byYear.get(year)! + value);
            } else {
                byYear.set(year, value);
            }
        }

        // Create assessment metadata following international standards
        const metadata = createAssessmentMetadata(
            filters?.assessmentType || 'rapid',
            filters?.confidenceLevel || 'low'
        );

        return {
            totalDamage,
            totalLoss,
            byYear,
            metadata
        };
    } catch (error) {
        console.error("Error fetching geographic impact data:", error);
        return {
            totalDamage: 0,
            totalLoss: 0,
            byYear: new Map(),
            metadata: createAssessmentMetadata('rapid', 'low')
        };
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
        if (recordIds.length === 0) {
            return { total: 0, byYear: new Map() };
        }

        // Query damage data with proper numeric casting
        const damageData = await dr
            .select({
                year: sql<string>`SUBSTRING(${disasterRecordsTable.startDate}, 1, 4)`,
                totalDamage: sql<string>`COALESCE(SUM(CASE 
                    WHEN ${sectorDisasterRecordsRelationTable.withDamage} = true 
                    THEN COALESCE(${sectorDisasterRecordsRelationTable.damageCost}::numeric, 0) + 
                         COALESCE(${sectorDisasterRecordsRelationTable.damageRecoveryCost}::numeric, 0)
                    ELSE 0 
                END), 0)`
            })
            .from(sectorDisasterRecordsRelationTable)
            .innerJoin(
                disasterRecordsTable,
                eq(sectorDisasterRecordsRelationTable.disasterRecordId, disasterRecordsTable.id)
            )
            .where(inArray(sectorDisasterRecordsRelationTable.disasterRecordId, recordIds))
            .groupBy(sql<string>`SUBSTRING(${disasterRecordsTable.startDate}, 1, 4)`)
            .orderBy(sql<string>`SUBSTRING(${disasterRecordsTable.startDate}, 1, 4)`);

        // Process results with safe numeric conversion
        let total = 0;
        const byYear = new Map<number, number>();

        for (const row of damageData) {
            const year = parseInt(row.year);
            if (isNaN(year)) continue;

            const damage = safeMoneyToNumber(row.totalDamage);
            total += damage;
            byYear.set(year, damage);
        }

        return { total, byYear };
    } catch (error) {
        console.error("Error aggregating damages data:", error);
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
        if (recordIds.length === 0) {
            return { total: 0, byYear: new Map() };
        }

        // Query loss data with proper numeric casting
        const lossData = await dr
            .select({
                year: sql<string>`SUBSTRING(${disasterRecordsTable.startDate}, 1, 4)`,
                totalLoss: sql<string>`COALESCE(SUM(CASE 
                    WHEN ${sectorDisasterRecordsRelationTable.withLosses} = true 
                    THEN COALESCE(${sectorDisasterRecordsRelationTable.lossesCost}::numeric, 0)
                    ELSE 0 
                END), 0)`
            })
            .from(sectorDisasterRecordsRelationTable)
            .innerJoin(
                disasterRecordsTable,
                eq(sectorDisasterRecordsRelationTable.disasterRecordId, disasterRecordsTable.id)
            )
            .where(inArray(sectorDisasterRecordsRelationTable.disasterRecordId, recordIds))
            .groupBy(sql<string>`SUBSTRING(${disasterRecordsTable.startDate}, 1, 4)`)
            .orderBy(sql<string>`SUBSTRING(${disasterRecordsTable.startDate}, 1, 4)`);

        // Process results with safe numeric conversion
        let total = 0;
        const byYear = new Map<number, number>();

        for (const row of lossData) {
            const year = parseInt(row.year);
            if (isNaN(year)) continue;

            const loss = safeMoneyToNumber(row.totalLoss);
            total += loss;
            byYear.set(year, loss);
        }

        return { total, byYear };
    } catch (error) {
        console.error("Error aggregating losses data:", error);
        return { total: 0, byYear: new Map() };
    }
}

/**
 * Main function to get geographic impact following international standards
 */
export async function getGeographicImpactGeoJSON(sectorId: string, subSectorId?: string): Promise<GeoJSONFeatureCollection> {
    try {
        const result = await getGeographicImpact({ sectorId, subSectorId });

        if (!result.success) {
            console.warn("Failed to get geographic impact data:", result.error);
            return {
                type: "FeatureCollection",
                features: []
            };
        }

        const features: GeoJSONFeature[] = [];

        for (const division of result.divisions) {
            try {
                // Skip divisions without geometry data
                if (!division.geojson) {
                    console.warn(`Division ${division.id} has no GeoJSON data, skipping`);
                    continue;
                }

                // Parse and validate GeoJSON
                let geometry: GeoJSONGeometry;
                try {
                    // Handle both string and object formats
                    if (typeof division.geojson === 'string') {
                        const parsed = JSON.parse(division.geojson);
                        if (!isValidGeoJSON(parsed)) {
                            console.warn(`Division ${division.id} has invalid GeoJSON structure`);
                            continue;
                        }
                        geometry = parsed as GeoJSONGeometry;
                    } else {
                        if (!isValidGeoJSON(division.geojson)) {
                            console.warn(`Division ${division.id} has invalid GeoJSON structure`);
                            continue;
                        }
                        geometry = division.geojson as GeoJSONGeometry;
                    }
                } catch (error) {
                    console.error(`Error parsing GeoJSON for division ${division.id}:`, error);
                    continue;
                }

                // Create feature with proper properties
                features.push({
                    type: 'Feature' as const,
                    geometry,
                    properties: {
                        id: Number(division.id),
                        name: division.name as Record<string, string>,
                        level: division.level,
                        parentId: division.parentId,
                        totalDamage: result.values[division.id.toString()]?.totalDamage ?? 0,
                        totalLoss: result.values[division.id.toString()]?.totalLoss ?? 0,
                        dataAvailability: result.values[division.id.toString()]?.dataAvailability || 'no_data'
                    }
                });
            } catch (error) {
                console.error(`Error processing division ${division.id} for GeoJSON:`, error);
                // Continue with other divisions instead of failing the entire operation
                continue;
            }
        }

        return {
            type: "FeatureCollection",
            features
        };
    } catch (error) {
        console.error("Error in getGeographicImpactGeoJSON:", error);
        return {
            type: "FeatureCollection",
            features: []
        };
    }
}

// Memoization cache for normalized divisions
const normalizedDivisionsCache = new Map<string, NormalizedDivision>();
