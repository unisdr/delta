import { and, eq, sql, inArray } from "drizzle-orm";
import { dr } from "~/db.server";
import {
    divisionTable,
    damagesTable,
    lossesTable,
    disasterRecordsTable,
    type Division
} from "~/drizzle/schema";
import { getSectorsByParentId } from "./sectors";

// Helper function to normalize location names for matching
function normalizeLocationName(name: string): string {
    return name
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/\bregion\b/g, '')  // Remove standalone "region"
        .replace(/\s+/g, ' ')        // Clean up double spaces
        .trim();
}

// Helper function to find matching division
async function findMatchingDivision(locationName: string, divisions: any[]): Promise<any> {
    const normalizedLocation = normalizeLocationName(locationName);
    console.log("Normalized location:", normalizedLocation);

    // Try exact match first
    let match = divisions.find(d => {
        const divNameFull = d.name.en.toLowerCase();
        const divNameSimple = divNameFull
            .replace(/\s*\(.*?\)\s*/g, '')  // Remove anything in parentheses
            .replace(/\bregion\b/g, '')     // Remove "region"
            .replace(/\s+/g, ' ')           // Clean up spaces
            .trim();

        console.log("Comparing with division:", {
            original: d.name.en,
            normalized: divNameFull,
            simple: divNameSimple
        });

        // First try exact match with simple names
        if (normalizedLocation === divNameSimple) {
            return true;
        }

        // Then try partial matches
        const locationParts: string[] = normalizedLocation.split(' ');
        const divParts: string[] = divNameSimple.split(' ');

        // Check if all parts of the location are in the division name
        return locationParts.every((part: string) =>
            divParts.some((divPart: string) =>
                divPart.includes(part) || part.includes(divPart)
            )
        );
    });

    if (match) {
        console.log("Found match:", {
            name: match.name.en,
            level: match.level,
            parentId: match.parentId
        });
    } else {
        console.log("No match found for:", normalizedLocation);
        console.log("Available divisions:", divisions.map(d => ({
            name: d.name.en,
            level: d.level
        })));
    }

    return match;
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

// Type for GeoJSON geometry
interface GeoJSONGeometry {
    type: string;
    coordinates: any[];
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

export interface GeographicImpactFilters {
    sectorId: string;
    geographicLevelId?: string;
    fromDate?: string;
    toDate?: string;
    disasterEventId?: string;
    level?: number;
    parentId?: number;
    subSectorId?: string;
}

// Function to get disaster records based on sector ID
export async function getDisasterRecordsForSector(sectorId: string, subSectorId?: string): Promise<string[]> {
    console.log("Fetching records for sector:", sectorId, "subSector:", subSectorId);
    
    // If subSectorId is provided, use that instead of the parent sector
    const targetSectorId = subSectorId || sectorId;
    const numericSectorId = parseInt(targetSectorId, 10);
    
    if (isNaN(numericSectorId)) {
        throw new Error("Invalid sector ID");
    }

    // Get all subsectors only if we're using the parent sector
    let sectorIds: number[];
    if (!subSectorId) {
        const subsectors = await getSectorsByParentId(numericSectorId);
        sectorIds = subsectors.length > 0
            ? [numericSectorId, ...subsectors.map(s => s.id)]
            : [numericSectorId];
    } else {
        sectorIds = [numericSectorId];
    }

    console.log("Using sector IDs:", sectorIds);

    const records = await dr
        .select({ id: disasterRecordsTable.id })
        .from(disasterRecordsTable)
        .where(inArray(disasterRecordsTable.sectorId, sectorIds));

    console.log("Found records:", records);
    return records.map(r => r.id);
}

export async function getGeographicImpact(filters: GeographicImpactFilters): Promise<{ type: "FeatureCollection", features: any[] }> {
    console.log("Processing geographic impact for sector:", filters.sectorId, "subSector:", filters.subSectorId);

    try {
        // Build the base query conditions
        const conditions = [
            sql`CAST(${divisionTable.level} AS BIGINT) = CAST(${filters.level || 1} AS BIGINT)` // Cast both sides to BIGINT
        ];

        if (filters.parentId) {
            conditions.push(sql`${divisionTable.parentId} = ${filters.parentId}`);
        }

        // Get divisions first
        const divisions = await dr
            .select({
                id: divisionTable.id,
                name: divisionTable.name,
                geojson: divisionTable.geojson,
                level: divisionTable.level,
                importId: divisionTable.importId,
                parentId: divisionTable.parentId
            })
            .from(divisionTable)
            .where(and(...conditions));

        // Get disaster records for the sector, considering subSectorId
        const recordIds = await getDisasterRecordsForSector(filters.sectorId, filters.subSectorId);
        if (recordIds.length === 0) {
            console.log("No damage or loss values found for sector", filters.sectorId);
            return { type: "FeatureCollection", features: [] };
        }

        // Get damages data
        const damagesQuery = dr
            .select({
                locationDesc: disasterRecordsTable.locationDesc,
                damage: sql<string>`CAST(SUM(
                    COALESCE(${damagesTable.publicRepairCostTotalOverride}, 0) + 
                    COALESCE(${damagesTable.publicReplacementCostTotalOverride}, 0) +
                    COALESCE(${damagesTable.privateRepairCostTotalOverride}, 0) + 
                    COALESCE(${damagesTable.privateReplacementCostTotalOverride}, 0)
                ) AS TEXT)`,
            })
            .from(damagesTable)
            .innerJoin(disasterRecordsTable, eq(damagesTable.recordId, disasterRecordsTable.id))
            .where(inArray(damagesTable.recordId, recordIds))
            .groupBy(disasterRecordsTable.locationDesc);

        // Get losses data
        const lossesQuery = dr
            .select({
                locationDesc: disasterRecordsTable.locationDesc,
                loss: sql<string>`CAST(SUM(
                    COALESCE(${lossesTable.publicTotalCost}, 0) + 
                    COALESCE(${lossesTable.privateTotalCost}, 0)
                ) AS TEXT)`,
            })
            .from(lossesTable)
            .innerJoin(disasterRecordsTable, eq(lossesTable.recordId, disasterRecordsTable.id))
            .where(inArray(lossesTable.recordId, recordIds))
            .groupBy(disasterRecordsTable.locationDesc);

        const [damagesResult, lossesResult] = await Promise.all([
            damagesQuery,
            lossesQuery
        ]);

        // Combine damages and losses by location
        const locationValues: { [key: string]: { damage: number, loss: number } } = {};

        damagesResult.forEach(record => {
            if (!record.locationDesc) return;
            const location = record.locationDesc.toLowerCase();
            if (!locationValues[location]) {
                locationValues[location] = { damage: 0, loss: 0 };
            }
            locationValues[location].damage += parseFloat(record.damage || '0');
        });

        lossesResult.forEach(record => {
            if (!record.locationDesc) return;
            const location = record.locationDesc.toLowerCase();
            if (!locationValues[location]) {
                locationValues[location] = { damage: 0, loss: 0 };
            }
            locationValues[location].loss += parseFloat(record.loss || '0');
        });

        // Create a map to store division values
        const divisionValues: { [key: number]: { totalDamage: number, totalLoss: number } } = {};

        // Process each location and find matching division
        for (const [location, values] of Object.entries(locationValues)) {
            const matchingDivision = await findMatchingDivision(location, divisions);
            if (matchingDivision) {
                const divId = matchingDivision.id;
                if (!divisionValues[divId]) {
                    divisionValues[divId] = { totalDamage: 0, totalLoss: 0 };
                }
                divisionValues[divId].totalDamage += values.damage;
                divisionValues[divId].totalLoss += values.loss;
            }
        }

        // Create GeoJSON features with the aggregated values
        const features = divisions.map(division => {
            const geometry = parseGeometry(division.geojson);
            if (!geometry) return null;

            const values = divisionValues[division.id] || { totalDamage: 0, totalLoss: 0 };

            return {
                type: "Feature",
                geometry,
                properties: {
                    id: division.id,
                    name: division.name,
                    level: division.level,
                    parentId: division.parentId,
                    totalDamage: values.totalDamage,
                    totalLoss: values.totalLoss
                }
            };
        }).filter(f => f !== null);

        return {
            type: "FeatureCollection",
            features
        };

    } catch (error) {
        console.error("Error in getGeographicImpact:", error);
        throw error;
    }
}
