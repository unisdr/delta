import { eq, sql, SQL, and, inArray, gte, lte, exists, or, not } from "drizzle-orm";
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
import { createAssessmentMetadata } from "~/backend.server/utils/disasterCalculations";
import type { DisasterImpactMetadata } from "~/types/disasterCalculations";
import { applyHazardFilters } from "~/backend.server/utils/hazardFilters";
import { parseFlexibleDate, createDateCondition, extractYearFromDate } from "~/backend.server/utils/dateFilters";




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
    baseQuery?: any;
}

// interface DivisionValues {
//     totalDamage: number | null;
//     totalLoss: number | null;
//     sources: Set<string>;
//     metadata: DisasterImpactMetadata;
//     dataAvailability: 'available' | 'no_data' | 'zero';
// }

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

// type GeoJSON = GeoJSONGeometry | GeoJSONFeature | GeoJSONFeatureCollection;

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
        // console.log("Processing location:", normalizedLocation);

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

// Helper function to ensure polygon coordinates form a closed ring
function ensureClosedRing(coordinates: any[]): any[] {
    if (!Array.isArray(coordinates) || coordinates.length < 3) {
        return coordinates;
    }

    const first = coordinates[0];
    const last = coordinates[coordinates.length - 1];

    // Check if first and last points are identical
    if (first[0] !== last[0] || first[1] !== last[1]) {
        // Add the first point to the end to close the ring
        return [...coordinates, [...first]];
    }

    return coordinates;
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
    // First get the level of the input sector
    const sectorInfo = await dr
        .select({
            id: sectorTable.id,
            level: sectorTable.level
        })
        .from(sectorTable)
        .where(eq(sectorTable.id, Number(sectorId)))
        .limit(1);

    if (sectorInfo.length === 0) {
        return [];
    }

    const level = sectorInfo[0].level;

    // If it's already a level 4 sector (most detailed), just return itself
    if (level === 4) {
        return [Number(sectorId)];
    }

    // For other levels, get all subsectors
    const result = await dr
        .select({
            id: sectorTable.id,
            level: sectorTable.level
        })
        .from(sectorTable)
        .where(
            or(
                eq(sectorTable.id, Number(sectorId)),
                and(
                    sql`${sectorTable.id}::text LIKE ${sectorId}::text || '%'`,
                    sql`LENGTH(${sectorTable.id}::text) > LENGTH(${sectorId}::text)`
                )
            )
        );

    return result.map(r => r.id);
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
            console.log('Using specific subsector ID:', parsedSubSectorId);
        } else if (filters.sectorId) {
            // If only parent sector is selected, get all its subsectors
            sectorIds = await getAllSubsectorIds(filters.sectorId);
            console.log(`[SECTOR EXPANSION] Sector ID: ${filters.sectorId ?? "(none)"} ➜ Subsector IDs:`, sectorIds);
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
            console.log('Adding sector filter for IDs:', sectorIds);
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
            const parsedFromDate = parseFlexibleDate(filters.fromDate);
            if (parsedFromDate) {
                baseConditions.push(createDateCondition(disasterRecordsTable.startDate, parsedFromDate, 'gte'));
            } else {
                console.error('Invalid from date format:', filters.fromDate);
            }
        }
        if (filters.toDate) {
            const parsedToDate = parseFlexibleDate(filters.toDate);
            if (parsedToDate) {
                baseConditions.push(createDateCondition(disasterRecordsTable.endDate, parsedToDate, 'lte'));
            } else {
                console.error('Invalid to date format:', filters.toDate);
            }
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

        // Add base query builder for disaster records, supporting hazard filters with joins in applyHazardFilters()
        let queryBuilder = dr
            .select()
            .from(disasterRecordsTable);

        // console.log("🧾 [PASSING FILTERS]: GeographicImpactFilters");
        // console.table(filters);

        // Hazard filtering with improved hierarchical structure handling
        await applyHazardFilters(
            {
                hazardTypeId: filters.hazardTypeId,
                hazardClusterId: filters.hazardClusterId,
                specificHazardId: filters.specificHazardId,
            },
            dr,
            baseConditions,
            sql,
            eq,
            inArray,
            hipTypeTable,
            hipClusterTable,
            hipHazardTable,
            hazardousEventTable,
            disasterEventTable,
            disasterRecordsTable,
            queryBuilder,
            and
        );

        // ✅ Finalize query with all base conditions
        const filteredDisasterQuery = queryBuilder.where(and(...baseConditions));

        // ✅ Extract hazard ID values for debug
        // console.log('HazardType:', filters.hazardTypeId);
        // console.log('HazardCluster:', filters.hazardClusterId);
        // console.log('SpecificHazard:', filters.specificHazardId);
        // console.log('Hazard-related WHERE clause:', filteredDisasterQuery.toSQL().sql);

        // ✅ Check actual hazard values in query
        const debugHazards = await dr
            .select({
                id: disasterRecordsTable.id,
                hip_type: hazardousEventTable.hipTypeId,
                hip_cluster: hazardousEventTable.hipClusterId,
                hip_hazard: hazardousEventTable.hipHazardId,
            })
            .from(disasterRecordsTable)
            .innerJoin(
                disasterEventTable,
                eq(disasterRecordsTable.disasterEventId, disasterEventTable.id)
            )
            .innerJoin(
                hazardousEventTable,
                eq(disasterEventTable.hazardousEventId, hazardousEventTable.id)
            )
            .where(and(...baseConditions));

        console.log(' Matching record hazard fields:', debugHazards);

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
            console.time("baseDivisionsQuery"); // Start timing for baseDivisionsQuery
            divisions = await baseDivisionsQuery;
            console.timeEnd("baseDivisionsQuery"); // End timing for baseDivisionsQuery
            console.log("Number of Divisions Fetched:", divisions.length); // Log number of divisions

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

        await Promise.all(divisions.map(async (division) => {
            try {
                const disasterRecords = await getDisasterRecordsForDivision(
                    division.id.toString(),
                    {
                        startDate: filters.fromDate,
                        endDate: filters.toDate,
                        hazardType: filters.hazardTypeId,
                        hazardCluster: filters.hazardClusterId,
                        specificHazard: filters.specificHazardId,
                        disasterEvent: filters.disasterEventId,
                        assessmentType: filters.assessmentType,
                        confidenceLevel: filters.confidenceLevel,
                        baseQuery: queryBuilder.where(and(...baseConditions)),
                    },
                    sectorIds,
                    division.geom as GeoJSON.Geometry
                );

                if (!disasterRecords || disasterRecords.length === 0) {
                    values[division.id.toString()] = {
                        totalDamage: 0,
                        totalLoss: 0,
                        metadata,
                        dataAvailability: 'no_data'
                    };
                    return;
                }

                const [damageResult, lossResult] = await Promise.all([
                    aggregateDamagesData(disasterRecords, sectorIds),
                    aggregateLossesData(disasterRecords, sectorIds),
                ]);

                const totalDamage = damageResult.total;
                const totalLoss = lossResult.total;

                const byYear: Map<number, number> = new Map(damageResult.byYear);
                for (const [year, value] of lossResult.byYear) {
                    byYear.set(year, (byYear.get(year) || 0) + value);
                }

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
        }));

        // console.timeEnd("DivisionLoop"); // End timing for the loop



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
    sectorIds: number[] = [],
    divisionGeom?: GeoJSON.Geometry
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

        // Add approval status filter
        conditions.push(sql<string>`${disasterRecordsTable.approvalStatus} = 'published'`);

        // Add hazard conditions from baseQuery if present
        if (filters?.hazardType) {
            conditions.push(eq(hazardousEventTable.hipTypeId, filters.hazardType));
        }
        if (filters?.hazardCluster) {
            conditions.push(eq(hazardousEventTable.hipClusterId, filters.hazardCluster));
        }
        if (filters?.specificHazard) {
            conditions.push(eq(hazardousEventTable.hipHazardId, filters.specificHazard));
        }

        // Add sector filter with hierarchy support
        if (sectorIds.length > 0) {
            conditions.push(
                inArray(sectorDisasterRecordsRelationTable.sectorId, sectorIds)
            );
            console.log(`✔ Sector filter applied: ${sectorIds.length} sectors`);
        }

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
            )
            .innerJoin(
                disasterEventTable,
                eq(disasterRecordsTable.disasterEventId, disasterEventTable.id)
            )
            .innerJoin(
                hazardousEventTable,
                eq(disasterEventTable.hazardousEventId, hazardousEventTable.id)
            );

        const descendantIds = await getDescendantDivisionIds(parseInt(divisionId));

        const quoted = descendantIds.map((id) => `@ == "${id}"`).join(" || ");
        console.log(`✔ Division path filter applied: ${descendantIds.length} divisions`);

        const pathCondition = sql.raw(
            `jsonb_path_exists("disaster_records"."spatial_footprint", '$[*].geojson.properties.division_ids[*] ? (${quoted})')`
        );
        console.log("✔ JSONB path condition constructed for spatial filter");

        // First try to get records with spatial data
        const spatialQuery = query.where(
            and(
                ...conditions,
                sql`${disasterRecordsTable.spatialFootprint} IS NOT NULL`,
                or(
                    sql.raw(
                        `jsonb_path_exists("disaster_records"."spatial_footprint", '$[*].geojson.properties.division_ids[*] ? (${quoted})')`
                    ),
                    sql.raw(
                        `jsonb_path_exists("disaster_records"."spatial_footprint", '$[*].geojson.dts_info.division_ids[*] ? (${quoted})')`
                    ),
                    sql.raw(
                        `jsonb_path_exists("disaster_records"."spatial_footprint", '$[*].geojson.dts_info.division_id ? (@ == ${divisionId})')`
                    ),
                    sql.raw(`EXISTS (
                        SELECT 1 FROM jsonb_array_elements("disaster_records"."spatial_footprint") AS footprint
WHERE footprint->>'geographic_level' IN (
    SELECT name->>'en' 
    FROM "division"
    WHERE id = ${divisionId}
)
                    )`),
                    sql.raw(`EXISTS (
                        SELECT 1 FROM jsonb_array_elements("disaster_records"."spatial_footprint") AS footprint,
                        jsonb_array_elements(footprint->'map_coords'->'coordinates') AS coord
                        WHERE ST_Contains(
                            (SELECT geom FROM "division" WHERE id = ${divisionId}),
                            ST_SetSRID(ST_MakePoint(
                                (coord->>1)::float,  -- longitude (first element)
                                (coord->>0)::float   -- latitude (second element)
                            ), 4326)
                        )
                    )`),
                    sql.raw(`EXISTS (
                        SELECT 1 FROM jsonb_array_elements("disaster_records"."spatial_footprint") AS footprint
WHERE footprint->'map_coords'->>'mode' = 'circle'
AND ST_Intersects(
    (SELECT geom FROM "division" WHERE id = ${divisionId}),
    ST_Buffer(
        ST_SetSRID(ST_MakePoint(
            (footprint->'map_coords'->'center'->>1)::float,
            (footprint->'map_coords'->'center'->>0)::float
        ), 4326),
        (footprint->'map_coords'->>'radius')::float / 111320.0  -- Convert meters to degrees (approximate)
    )
)
                    )`),
                    sql.raw(`EXISTS (
                        SELECT 1 FROM jsonb_array_elements("disaster_records"."spatial_footprint") AS footprint
WHERE footprint->'map_coords'->>'mode' = 'rectangle'
AND ST_Intersects(
    (SELECT geom FROM "division" WHERE id = ${divisionId}),
    ST_MakeEnvelope(
        (footprint->'map_coords'->'coordinates'->0->1)::float,  -- lon1
        (footprint->'map_coords'->'coordinates'->0->0)::float,  -- lat1
        (footprint->'map_coords'->'coordinates'->1->1)::float,  -- lon2
        (footprint->'map_coords'->'coordinates'->1->0)::float,  -- lat2
        4326
    )
)
                    )`),
                    sql.raw(`EXISTS (
                        SELECT 1 FROM jsonb_array_elements("disaster_records"."spatial_footprint") AS footprint
WHERE footprint->'map_coords'->>'mode' = 'polygon'
AND ST_Intersects(
    (SELECT geom FROM "division" WHERE id = ${divisionId}),
    ST_SetSRID(ST_MakePolygon(
        ST_MakeLine(
            ARRAY(
                SELECT ST_MakePoint(
                    (coord->>1)::float,
                    (coord->>0)::float
                )
                FROM (
                    SELECT CASE 
                        WHEN array_position(ARRAY(
                            SELECT jsonb_array_elements((footprint->'map_coords'->'coordinates')::jsonb)
                        ), coord) = (
                            SELECT COUNT(*) 
                            FROM jsonb_array_elements((footprint->'map_coords'->'coordinates')::jsonb)
                        )
                        AND (
                            SELECT element->0 
                            FROM jsonb_array_elements((footprint->'map_coords'->'coordinates')::jsonb) element 
                            LIMIT 1
                        ) != coord->0
                        OR (
                            SELECT element->1 
                            FROM jsonb_array_elements((footprint->'map_coords'->'coordinates')::jsonb) element 
                            LIMIT 1
                        ) != coord->1
                        THEN (
                            SELECT jsonb_build_array(
                                element->0,
                                element->1
                            )::jsonb
                            FROM jsonb_array_elements((footprint->'map_coords'->'coordinates')::jsonb) element 
                            LIMIT 1
                        )
                        ELSE coord
                    END AS coord
                    FROM jsonb_array_elements((footprint->'map_coords'->'coordinates')::jsonb) AS coord
                ) AS coords
            )
        )
    ), 4326)
)
                    )`),
                    sql.raw(`EXISTS (
                        SELECT 1 FROM jsonb_array_elements("disaster_records"."spatial_footprint") AS footprint
                        WHERE footprint->'map_coords'->>'mode' = 'lines'
                        AND ST_Intersects(
                            (SELECT geom FROM "division" WHERE id = ${divisionId}),
                            ST_SetSRID(ST_MakeLine(
                                ARRAY(
                                    SELECT ST_MakePoint(
                                        (coord->>1)::float,  -- longitude
                                        (coord->>0)::float   -- latitude
                                    )
                                    FROM jsonb_array_elements(footprint->'map_coords'->'coordinates') AS coord
                                )
                            ), 4326)
                        )
                    )`),
                    sql.raw(`EXISTS (
                        SELECT 1 FROM jsonb_array_elements("disaster_records"."spatial_footprint") AS footprint,
                        jsonb_array_elements(footprint->'geojson'->'features') AS feature
                        WHERE feature->'geometry'->>'type' = 'LineString'
                        AND ST_Intersects(
                            (SELECT geom FROM "division" WHERE id = ${divisionId}),
                            ST_SetSRID(ST_MakeLine(
                                ARRAY(
                                    SELECT ST_MakePoint(
                                        (coord->>0)::float,  -- longitude
                                        (coord->>1)::float   -- latitude
                                    )
                                    FROM jsonb_array_elements(feature->'geometry'->'coordinates') AS coord
                                )
                            ), 4326)
                        )
                    )`),
                    sql.raw(`EXISTS (
                        SELECT 1 FROM jsonb_array_elements("disaster_records"."spatial_footprint") AS footprint,
                        jsonb_array_elements(footprint->'geojson'->'features') AS feature
                        WHERE feature->'geometry'->>'type' = 'Point'
                        AND ST_Contains(
                            (SELECT geom FROM "division" WHERE id = ${divisionId}),
                            ST_SetSRID(ST_MakePoint(
                                (feature->'geometry'->'coordinates'->>0)::float,
                                (feature->'geometry'->'coordinates'->>1)::float
                            ), 4326)
                        )
                    )`)
                )
            )
        );

        // console.log('Executing spatial query first');
        // console.log('Spatial SQL Query:', spatialQuery.toSQL().sql);
        // console.log('Query parameters:', spatialQuery.toSQL().params);
        // console.log("🚀 Executing spatial query (SQL + params)");
        // console.log(spatialQuery.toSQL());

        // Execute spatial query
        const spatialRecords = await spatialQuery;
        console.log(`Spatial query returned ${spatialRecords.length} records`);
        console.log("Matching disaster record IDs:", spatialRecords.map(r => r.id));
        console.log(`✔ Found ${spatialRecords.length} matching disaster records`);

        const divisionIdStr = divisionId.toString();
        const regionResult = await dr.execute(sql`
            SELECT name->>'en' as name FROM "division" WHERE name->>'en' IS NOT NULL
          `);
        const regionNames = regionResult.rows.map(r => r.name);
        const regionNameSet = new Set(regionNames);
        const descendantStrSet = new Set(descendantIds.map(String));

        const confirmed = spatialRecords.filter((record) => {
            const footprint = record.spatialFootprint;
            if (!Array.isArray(footprint)) {
                console.warn(`[SKIP ${record.id}] No valid spatial_footprint array`);
                // console.log(`Spatial footprint: ${footprint}`);
                console.debug("[FilterFail] spatialFootprint is not an array", record);
                return false;
            }

            return footprint.some((feature) => {
                const geojson = feature.geojson || {};
                const props = geojson.properties || {};
                const dts = geojson.dts_info || {};
                const mapCoords = feature.map_coords || {};

                // Check all possible division ID locations
                const ids1 = Array.isArray(props.division_ids) ? props.division_ids.map(String) : [];
                const ids2 = Array.isArray(dts.division_ids) ? dts.division_ids.map(String) : [];
                const id2 = dts.division_id ? String(dts.division_id) : null;

                const matchedId = [...ids1, ...ids2, id2].some(id => id && descendantStrSet.has(id));
                const geographicLevel = feature.geographic_level;
                const matchedName = regionNameSet.has(geographicLevel);

                // Check for spatial matches based on geometry type
                const hasValidGeometry = (
                    // GeoJSON Point Features
                    (geojson.features?.some((f: { geometry?: { type: string } }) =>
                        f.geometry?.type === 'Point' || f.geometry?.type === 'LineString'
                    )) ||
                    // Map Coordinates Points
                    (mapCoords.mode === 'markers' && Array.isArray(mapCoords.coordinates)) ||
                    // Lines
                    (mapCoords.mode === 'lines' && Array.isArray(mapCoords.coordinates)) ||
                    // Circle Areas
                    (mapCoords.mode === 'circle' && mapCoords.center && mapCoords.radius) ||
                    // Rectangle Areas
                    (mapCoords.mode === 'rectangle' && Array.isArray(mapCoords.coordinates) && mapCoords.coordinates.length >= 2) ||
                    // Polygon Areas
                    (mapCoords.mode === 'polygon' && Array.isArray(mapCoords.coordinates) && mapCoords.coordinates.length >= 3)
                );

                // Record is valid if it has either:
                // 1. Matching metadata (division IDs or geographic level)
                // 2. Valid spatial geometry that was matched by SQL spatial queries
                if (!matchedId && !matchedName && !hasValidGeometry) {
                    console.debug(`[NO MATCH] record ${record.id}`, {
                        geographic_level: geographicLevel,
                        props_ids: ids1,
                        dts_ids: ids2,
                        dts_single_id: id2,
                        geometry_type: mapCoords.mode || geojson.features?.[0]?.geometry?.type
                    });
                    return false;
                }

                return true;
            });
        });

        // Use verified records for the rest of the function
        spatialRecords.length = 0;
        spatialRecords.push(...confirmed);
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
                    console.log(`[DIVISION NAME MATCH] Raw: "${divisionName}" (normalized: "${normalizedDivName}")`);

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
                    // console.log(`[TEXT MATCH] SQL Query: ${textQueryStr.sql}`);
                    // console.log('Query parameters:', textQueryStr.params);

                    const textRecords = await textQuery;
                    console.log(`[TEXT MATCH] ➜ Returned ${textRecords.length} additional records`);

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
        const recordIds = await getDisasterRecordsForDivision(divisionId, filters,);

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
        const damageResult = await aggregateDamagesData(recordIds, []);
        const lossResult = await aggregateLossesData(recordIds, []);

        const { total: totalDamage } = damageResult;
        const { total: totalLoss } = lossResult;

        // Merge the yearly breakdowns
        const byYear: Map<number, number> = new Map();
        for (const [year, value] of damageResult.byYear) {
            byYear.set(year, value);
        }
        for (const [year, value] of lossResult.byYear) {
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
async function aggregateDamagesData(recordIds: string[], sectorIds?: number[]): Promise<{ total: number, byYear: Map<number, number> }> {
    try {
        if (recordIds.length === 0) {
            return { total: 0, byYear: new Map() };
        }

        const yearExpr = extractYearFromDate(disasterRecordsTable.startDate);

        // First get sector overrides
        const sectorOverrides = await dr
            .select({
                year: yearExpr.as("year"),
                totalDamage: sql<string>`COALESCE(SUM(
                    CASE 
                        WHEN ${sectorDisasterRecordsRelationTable.withDamage} = true AND ${sectorDisasterRecordsRelationTable.damageCost} IS NOT NULL
 THEN
                            COALESCE(${sectorDisasterRecordsRelationTable.damageCost}, 0)::numeric
                        ELSE 0
                    END
                ), 0)`
            })
            .from(disasterRecordsTable)
            .innerJoin(
                sectorDisasterRecordsRelationTable,
                eq(sectorDisasterRecordsRelationTable.disasterRecordId, disasterRecordsTable.id)
            )
            .where(
                and(
                    inArray(disasterRecordsTable.id, recordIds),
                    sectorIds ? inArray(sectorDisasterRecordsRelationTable.sectorId, sectorIds) : undefined
                )
            )
            .groupBy(disasterRecordsTable.startDate)
            .orderBy(yearExpr);

        // Then get detailed damages
        const detailedDamages = await dr
            .select({
                year: yearExpr.as("year"),
                totalDamage: sql<string>`COALESCE(SUM(
                    CASE 
                        WHEN ${damagesTable.totalRepairReplacementOverride} = true THEN
                            COALESCE(${damagesTable.totalRepairReplacement}, 0)::numeric
                        ELSE
                            COALESCE(${damagesTable.pdDamageAmount}, 0)::numeric * COALESCE(${damagesTable.pdRepairCostUnit}, 0)::numeric +
                            COALESCE(${damagesTable.tdDamageAmount}, 0)::numeric * COALESCE(${damagesTable.tdReplacementCostUnit}, 0)::numeric
                    END
                ), 0)`
            })
            .from(disasterRecordsTable)
            .innerJoin(
                damagesTable,
                eq(damagesTable.recordId, disasterRecordsTable.id)
            )
            .where(
                and(
                    inArray(disasterRecordsTable.id, recordIds),
                    sectorIds ? inArray(damagesTable.sectorId, sectorIds) : undefined,
                    not(exists(
                        dr.select()
                            .from(sectorDisasterRecordsRelationTable)
                            .where(
                                and(
                                    eq(sectorDisasterRecordsRelationTable.disasterRecordId, disasterRecordsTable.id),
                                    eq(sectorDisasterRecordsRelationTable.withDamage, true),
                                    sql`${sectorDisasterRecordsRelationTable.damageCost} IS NOT NULL`,
                                    sectorIds ? inArray(sectorDisasterRecordsRelationTable.sectorId, sectorIds) : undefined
                                )
                            )
                    ))
                )
            )
            .groupBy(disasterRecordsTable.startDate)
            .orderBy(yearExpr);

        // Process results with safe numeric conversion
        let total = 0;
        const byYear = new Map<number, number>();

        // Process sector overrides first
        for (const row of sectorOverrides) {
            const year = Number(row.year);
            if (isNaN(year)) continue;

            const damage = safeMoneyToNumber(row.totalDamage);
            total += damage;
            byYear.set(year, (byYear.get(year) || 0) + damage);
        }

        // Then add detailed damages where there are no overrides
        for (const row of detailedDamages) {
            const year = Number(row.year);
            if (isNaN(year)) continue;

            const damage = safeMoneyToNumber(row.totalDamage);
            total += damage;
            byYear.set(year, (byYear.get(year) || 0) + damage);
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
async function aggregateLossesData(recordIds: string[], sectorIds?: number[]): Promise<{ total: number, byYear: Map<number, number> }> {
    try {
        if (recordIds.length === 0) {
            return { total: 0, byYear: new Map() };
        }

        const yearExpr = extractYearFromDate(disasterRecordsTable.startDate);

        // First get sector overrides
        const sectorOverrides = await dr
            .select({
                year: yearExpr.as("year"),
                totalLoss: sql<string>`COALESCE(SUM(
                    CASE 
                        WHEN ${sectorDisasterRecordsRelationTable.withLosses} = true AND ${sectorDisasterRecordsRelationTable.lossesCost} IS NOT NULL THEN
                            COALESCE(${sectorDisasterRecordsRelationTable.lossesCost}, 0)::numeric
                        ELSE 0
                    END
                ), 0)`
            })
            .from(disasterRecordsTable)
            .innerJoin(
                sectorDisasterRecordsRelationTable,
                eq(sectorDisasterRecordsRelationTable.disasterRecordId, disasterRecordsTable.id)
            )
            .where(
                and(
                    inArray(disasterRecordsTable.id, recordIds),
                    sectorIds ? inArray(sectorDisasterRecordsRelationTable.sectorId, sectorIds) : undefined
                )
            )
            .groupBy(disasterRecordsTable.startDate)
            .orderBy(yearExpr);

        // Then get detailed losses
        const detailedLosses = await dr
            .select({
                year: yearExpr.as("year"),
                totalLoss: sql<string>`COALESCE(SUM(
                    CASE 
                        WHEN ${lossesTable.publicCostTotalOverride} = true THEN
                            COALESCE(${lossesTable.publicCostTotal}, 0)::numeric
                        ELSE
                            COALESCE(${lossesTable.publicUnits}, 0)::numeric * COALESCE(${lossesTable.publicCostUnit}, 0)::numeric +
                            COALESCE(${lossesTable.privateCostTotal}, 0)::numeric
                    END +
                    CASE 
                        WHEN ${lossesTable.privateCostTotalOverride} = true THEN
                            COALESCE(${lossesTable.privateCostTotal}, 0)::numeric
                        ELSE
                            COALESCE(${lossesTable.privateUnits}, 0)::numeric * COALESCE(${lossesTable.privateCostUnit}, 0)::numeric
                    END
                ), 0)`
            })
            .from(disasterRecordsTable)
            .innerJoin(
                lossesTable,
                eq(lossesTable.recordId, disasterRecordsTable.id)
            )
            .where(
                and(
                    inArray(disasterRecordsTable.id, recordIds),
                    sectorIds ? inArray(lossesTable.sectorId, sectorIds) : undefined,
                    not(exists(
                        dr.select()
                            .from(sectorDisasterRecordsRelationTable)
                            .where(
                                and(
                                    eq(sectorDisasterRecordsRelationTable.disasterRecordId, disasterRecordsTable.id),
                                    eq(sectorDisasterRecordsRelationTable.withLosses, true),
                                    sql`${sectorDisasterRecordsRelationTable.lossesCost} IS NOT NULL`,
                                    sectorIds ? inArray(sectorDisasterRecordsRelationTable.sectorId, sectorIds) : undefined
                                )
                            )
                    ))
                )
            )
            .groupBy(disasterRecordsTable.startDate)
            .orderBy(yearExpr);

        // Process results with safe numeric conversion
        let total = 0;
        const byYear = new Map<number, number>();

        // Process sector overrides first
        for (const row of sectorOverrides) {
            const year = Number(row.year);
            if (isNaN(year)) continue;

            const loss = safeMoneyToNumber(row.totalLoss);
            total += loss;
            byYear.set(year, (byYear.get(year) || 0) + loss);
        }

        // Then add detailed losses where there are no overrides
        for (const row of detailedLosses) {
            const year = Number(row.year);
            if (isNaN(year)) continue;

            const loss = safeMoneyToNumber(row.totalLoss);
            total += loss;
            byYear.set(year, (byYear.get(year) || 0) + loss);
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