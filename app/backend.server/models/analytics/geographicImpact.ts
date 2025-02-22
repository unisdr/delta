import { eq, sql, SQL, and } from "drizzle-orm";
import { dr } from "~/db.server";
import {
    disasterRecordsTable,
    damagesTable,
    lossesTable,
    divisionTable,
    type Division,
} from "~/drizzle/schema";
import { getSectorsByParentId } from "./sectors";
import { NodePgDatabase } from "drizzle-orm/node-postgres";

interface GeographicImpactFilters {
    sectorId: number;
    subSectorId?: number;
    hazardTypeId?: string;
    hazardClusterId?: string;
    specificHazardId?: string;
    geographicLevelId?: string;
    fromDate?: string;
    toDate?: string;
    disasterEventId?: string;
}

interface DivisionValues {
    totalDamage: number;
    totalLoss: number;
    sources: Set<string>;
}

interface CleanDivisionValues {
    totalDamage: number;
    totalLoss: number;
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

// Get disaster records for a sector and its subsectors
async function getDisasterRecordsForSector(sectorId: number | undefined, subSectorId: number | undefined): Promise<any[]> {
    try {
        console.log("Fetching records for sector:", sectorId, "subSector:", subSectorId);

        // Get all records directly associated with this sector
        const records = await dr
            .select()
            .from(disasterRecordsTable)
            .where(
                and(
                    // Only include approved records
                    eq(disasterRecordsTable.approvalStatus, "approved"),
                    // Filter by sector if provided
                    sectorId ? eq(disasterRecordsTable.sectorId, sectorId) : undefined,
                    // Filter by sub-sector if provided
                    subSectorId ? eq(disasterRecordsTable.subSector, subSectorId.toString()) : undefined
                )
            );

        // If a specific subsector is requested, we don't need to look for other subsectors
        if (subSectorId) {
            const subSectorRecords = await dr
                .select()
                .from(disasterRecordsTable)
                .where(
                    and(
                        eq(disasterRecordsTable.approvalStatus, "approved"),
                        eq(disasterRecordsTable.sectorId, subSectorId)
                    )
                );

            return [...records, ...subSectorRecords];
        }

        // Get all subsectors for this sector
        const subsectors = await getSectorsByParentId(sectorId ?? null);

        // Get records for each subsector
        const subsectorRecords = await Promise.all(
            subsectors.map(async (subsector) => {
                return dr
                    .select()
                    .from(disasterRecordsTable)
                    .where(
                        and(
                            eq(disasterRecordsTable.approvalStatus, "approved"),
                            eq(disasterRecordsTable.sectorId, subsector.id)
                        )
                    );
            })
        );

        // Combine all records
        return [...records, ...subsectorRecords.flat()];
    } catch (error) {
        console.error("Error fetching disaster records:", error);
        return [];
    }
}

// Main function to get geographic impact
export async function getGeographicImpact(filters: GeographicImpactFilters): Promise<GeographicImpactResult> {
    try {
        console.log("Processing geographic impact with filters:", JSON.stringify(filters, null, 2));

        // Get disaster records based on sector
        const records = await getDisasterRecordsForSector(filters.sectorId, filters.subSectorId);
        console.log(`Found ${records.length} disaster records`);

        // Build the base query for divisions
        const divisionQuery = dr
            .select({
                id: divisionTable.id,
                name: divisionTable.name,
                importId: divisionTable.importId,
                level: divisionTable.level,
                parentId: divisionTable.parentId,
                geojson: divisionTable.geojson,
                geom: divisionTable.geom,
                bbox: divisionTable.bbox,
                spatial_index: divisionTable.spatial_index
            })
            .from(divisionTable);

        // Add WHERE conditions
        const whereConditions = [];
        whereConditions.push(eq(divisionTable.level, 2)); // Default to level 2

        // Execute the query with all conditions
        const divisions = await divisionQuery.where(and(...whereConditions));
        console.log(`Found ${divisions.length} divisions`);

        // Create a map to store aggregated values per division
        const divisionValues: { [key: string]: DivisionValues } = {};

        // Process each disaster record
        for (const record of records) {
            console.log(`Processing record: ${record.id}`);

            // Get damages and losses for this record
            const [damages, losses] = await Promise.all([
                dr.select()
                    .from(damagesTable)
                    .where(eq(damagesTable.recordId, record.id)),
                dr.select()
                    .from(lossesTable)
                    .where(eq(lossesTable.recordId, record.id))
            ]);

            console.log(`Found ${damages.length} damages and ${losses.length} losses for record ${record.id}`);

            // Process damages and losses for each division
            for (const division of divisions) {
                // Initialize division values if not exists
                if (!divisionValues[division.id]) {
                    divisionValues[division.id] = {
                        totalDamage: 0,
                        totalLoss: 0,
                        sources: new Set<string>()
                    };
                }

                // Add damages
                for (const damage of damages) {
                    const repairCost = safeMoneyToNumber(damage.publicRepairCostTotalOverride);
                    const replacementCost = safeMoneyToNumber(damage.publicReplacementCostTotalOverride);
                    const recoveryCost = safeMoneyToNumber(damage.publicRecoveryCostTotalOverride);
                    divisionValues[division.id].totalDamage += repairCost + replacementCost + recoveryCost;
                }

                // Add losses
                for (const loss of losses) {
                    const publicCost = safeMoneyToNumber(loss.publicCostTotalOverride);
                    const privateCost = safeMoneyToNumber(loss.privateCostTotalOverride);
                    divisionValues[division.id].totalLoss += publicCost + privateCost;
                }

                // Add record ID to sources
                divisionValues[division.id].sources.add(record.id);
            }
        }

        // Clean up the division values for response
        const cleanValues: { [key: string]: CleanDivisionValues } = {};
        for (const [id, values] of Object.entries(divisionValues)) {
            cleanValues[id] = {
                totalDamage: values.totalDamage,
                totalLoss: values.totalLoss
            };
        }

        console.log("Successfully processed geographic impact data");

        return {
            success: true,
            divisions,
            values: cleanValues
        };

    } catch (error) {
        console.error("Error in getGeographicImpact:", error);
        return {
            success: false,
            divisions: [],
            values: {},
            error: error instanceof Error ? error.message : "Unknown error occurred"
        };
    }
}

// Memoization cache for normalized divisions
const normalizedDivisionsCache = new Map<string, NormalizedDivision>();

export async function getGeographicImpactGeoJSON(sectorId: number, subSectorId?: number): Promise<GeoJSONFeatureCollection> {
    const result = await getGeographicImpact({ sectorId, subSectorId });

    if (!result.success) {
        return {
            type: "FeatureCollection",
            features: []
        };
    }

    const features: GeoJSONFeature[] = result.divisions.map(division => ({
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
