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
        // Remove parentheses and their contents
        .replace(/\([^)]*\)/g, '')
        // Remove common words that might differ
        .replace(/\b(region|province|city)\b/g, '')
        // Remove extra spaces and trim
        .replace(/\s+/g, ' ')
        .trim();
}

// Helper function to find matching division
function findMatchingDivision(locationName: string, divisions: any[]): any {
    const normalizedLocation = normalizeLocationName(locationName);
    console.log("Normalized location name:", normalizedLocation);

    // First try exact match after normalization
    const exactMatch = divisions.find(div => {
        const divName = normalizeLocationName(div.name?.en || '');
        return divName === normalizedLocation;
    });

    if (exactMatch) {
        console.log("Found exact match:", exactMatch.name?.en);
        return exactMatch;
    }

    // Then try partial matches
    const partialMatch = divisions.find(div => {
        const divName = normalizeLocationName(div.name?.en || '');
        // Check if either name contains the other
        return divName.includes(normalizedLocation) || normalizedLocation.includes(divName);
    });

    if (partialMatch) {
        console.log("Found partial match:", partialMatch.name?.en);
        return partialMatch;
    }

    // Special cases for regions
    const regionMatches = {
        'calabarzon': 'CALABARZON (Region IV-A)',
        'abra': 'Cordillera Administrative Region (CAR)',
        'northern luzon': 'Cordillera Administrative Region (CAR)'
    };

    for (const [key, value] of Object.entries(regionMatches)) {
        if (normalizedLocation.includes(key)) {
            const match = divisions.find(div => normalizeLocationName(div.name?.en || '') === normalizeLocationName(value));
            if (match) {
                console.log("Found region match:", match.name?.en);
                return match;
            }
        }
    }

    return null;
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
}

async function getDisasterRecordsForSector(sectorId: string): Promise<string[]> {
    const numericSectorId = parseInt(sectorId, 10);
    if (isNaN(numericSectorId)) {
        throw new Error("Invalid sector ID format");
    }

    // Get all subsectors if this is a parent sector
    const subsectors = await getSectorsByParentId(numericSectorId);
    const sectorIds = subsectors.length > 0 
        ? [numericSectorId, ...subsectors.map(s => s.id)]
        : [numericSectorId];

    console.log("Fetching records for sectors:", sectorIds);

    const records = await dr
        .select({ id: disasterRecordsTable.id })
        .from(disasterRecordsTable)
        .where(
            and(
                inArray(disasterRecordsTable.sectorId, sectorIds),
                sql<boolean>`LOWER(${disasterRecordsTable.approvalStatus}) = 'approved'`
            )
        );

    console.log("Found records:", records);
    return records.map(r => r.id);
}

export const getGeographicImpact = async (filters: GeographicImpactFilters): Promise<{ type: "FeatureCollection", features: any[] }> => {
    try {
        if (!filters.sectorId) {
            throw new Error("Sector ID is required");
        }

        console.log("Processing geographic impact for sector:", filters.sectorId);

        // Get all divisions with their GeoJSON data
        const divisions = await dr
            .select({
                id: divisionTable.id,
                name: divisionTable.name,
                geojson: divisionTable.geojson,
                parentId: divisionTable.parentId
            })
            .from(divisionTable)
            .execute();

        console.log("Found divisions:", divisions.length);
        console.log("Division names:", divisions.map(d => d.name?.en));

        // Get all disaster records for the sector
        const recordIds = await getDisasterRecordsForSector(filters.sectorId);

        // Build additional conditions for date and event filters
        const additionalConditions = [];
        if (filters.disasterEventId) {
            additionalConditions.push(eq(disasterRecordsTable.disasterEventId, filters.disasterEventId));
        }
        if (filters.fromDate) {
            additionalConditions.push(sql`${disasterRecordsTable.startDate} >= ${filters.fromDate}`);
        }
        if (filters.toDate) {
            additionalConditions.push(sql`${disasterRecordsTable.endDate} <= ${filters.toDate}`);
        }

        // Get records with their damage and loss values
        const records = await dr
            .select({
                locationDesc: disasterRecordsTable.locationDesc,
                // Calculate total damage
                damage: sql<string>`
                    (
                        -- Public repair cost
                        COALESCE(${damagesTable.publicRepairCostTotalOverride}, 
                            NULLIF(${damagesTable.publicRepairCostUnit} * ${damagesTable.publicRepairUnits}, 0), 0) +
                        -- Private repair cost
                        COALESCE(${damagesTable.privateRepairCostTotalOverride}, 
                            NULLIF(${damagesTable.privateRepairCostUnit} * ${damagesTable.privateRepairUnits}, 0), 0)
                    )::text
                `.as('damage'),
                // Calculate total loss
                loss: sql<string>`
                    (
                        COALESCE(${lossesTable.publicTotalCost}, 0) + 
                        COALESCE(${lossesTable.privateTotalCost}, 0)
                    )::text
                `.as('loss')
            })
            .from(disasterRecordsTable)
            .leftJoin(damagesTable, eq(damagesTable.recordId, disasterRecordsTable.id))
            .leftJoin(lossesTable, eq(lossesTable.recordId, disasterRecordsTable.id))
            .where(
                and(
                    inArray(disasterRecordsTable.id, recordIds),
                    ...additionalConditions
                )
            )
            .execute();

        console.log("Found records with values:", records);

        // Aggregate values for each division
        const divisionValues = new Map<number, { damage: number, loss: number }>();
        
        // Process each record
        records.forEach(record => {
            const locationName = (record.locationDesc || '').toLowerCase();
            const damage = parseFloat(record.damage) || 0;
            const loss = parseFloat(record.loss) || 0;

            console.log("Processing record:", {
                location: locationName,
                damage,
                loss
            });

            // Find matching division using improved matching logic
            const matchedDivision = findMatchingDivision(locationName, divisions);

            if (matchedDivision) {
                console.log("Matched division:", {
                    divisionId: matchedDivision.id,
                    divisionName: matchedDivision.name?.en,
                    damage,
                    loss
                });

                // Add values to the matched division
                const current = divisionValues.get(matchedDivision.id) || { damage: 0, loss: 0 };
                divisionValues.set(matchedDivision.id, {
                    damage: current.damage + damage,
                    loss: current.loss + loss
                });
            } else {
                console.warn("No matching division found for location:", locationName);
            }
        });

        console.log("Final division values:", Object.fromEntries(divisionValues));

        // Create GeoJSON features for ALL divisions with valid geometry
        const features = divisions
            // Only filter out divisions without geometry
            .filter(div => {
                const hasGeometry = !!div.geojson;
                if (!hasGeometry) {
                    console.log(`Skipping division ${div.name?.en} - no geometry`);
                }
                return hasGeometry;
            })
            .map(div => {
                const values = divisionValues.get(div.id) || { damage: 0, loss: 0 }; // Use default values if no data
                const geometry = parseGeometry(div.geojson);
                
                if (!geometry) {
                    console.warn(`Invalid geometry for division ${div.id}:`, div.geojson);
                    return null;
                }

                return {
                    type: "Feature",
                    geometry,
                    properties: {
                        id: div.id,
                        name: div.name || { en: 'Unknown' },
                        totalDamage: values.damage,
                        totalLoss: values.loss
                    }
                };
            })
            .filter((feature): feature is NonNullable<typeof feature> => feature !== null);

        console.log("Final features:", features.map(f => ({
            name: f.properties.name.en,
            damage: f.properties.totalDamage,
            loss: f.properties.totalLoss
        })));

        return {
            type: "FeatureCollection",
            features
        };
    } catch (error) {
        console.error("Error in getGeographicImpact:", error);
        return {
            type: "FeatureCollection",
            features: []
        };
    }
};
