import {
	eq,
	sql,
	SQL,
	and,
	inArray,
	gte,
	lte,
	exists,
	or,
	not,
} from "drizzle-orm";
import { dr } from "~/db.server";
import createLogger from "~/utils/logger.server";

// Initialize logger for this module
const logger = createLogger("backend.server/models/analytics/geographicImpact");
import {
	disasterRecordsTable,
	damagesTable,
	lossesTable,
	divisionTable,
	type SelectDivision,
	disasterEventTable,
	hazardousEventTable,
	hipHazardTable,
	sectorDisasterRecordsRelationTable,
	sectorTable,
	hipClusterTable,
	hipTypeTable,
} from "~/drizzle/schema";
import { createAssessmentMetadata } from "~/backend.server/utils/disasterCalculations";
import type { DisasterImpactMetadata } from "~/types/disasterCalculations";
import { applyHazardFilters } from "~/backend.server/utils/hazardFilters";
import {
	parseFlexibleDate,
	createDateCondition,
	extractYearFromDate,
} from "~/backend.server/utils/dateFilters";

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
	assessmentType?: "rapid" | "detailed";
	/**
	 * Confidence level based on World Bank DaLA methodology:
	 * - 'low': Limited data availability or rapid assessment
	 * - 'medium': Partial data with some field verification
	 * - 'high': Complete data with full field verification
	 */
	confidenceLevel?: "low" | "medium" | "high";
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
	assessmentType?: "rapid" | "detailed";
	/** Data confidence level */
	confidenceLevel?: "low" | "medium" | "high";
	/** Sector ID for filtering */
	sectorId?: string;
	baseQuery?: any;
}

interface CleanDivisionValues {
	totalDamage: number | null;
	totalLoss: number | null;
	metadata: DisasterImpactMetadata;
	dataAvailability: "available" | "no_data" | "zero";
}

interface GeographicImpactResult {
	success: boolean;
	divisions: SelectDivision[];
	values: { [key: string]: CleanDivisionValues };
	error?: string;
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

// Helper function to normalize text for matching
function normalizeText(text: string): string {
	const normalized = text
		.toLowerCase()
		.normalize("NFKD") // Normalize unicode characters
		.replace(/[\u0300-\u036f]/g, "") // Remove diacritics
		.replace(/[^\w\s,-]/g, " ") // Replace special chars with space
		.replace(/\s+/g, " ") // Clean up multiple spaces
		.replace(/\b(region|province|city|municipality)\b/g, "") // Remove common geographic terms
		.trim();

	return normalized;
}

// Helper function to safely convert money values
function safeMoneyToNumber(value: string | number | null): number {
	try {
		if (value === null || value === undefined) {
			return 0;
		}

		// Handle string values (most common from SQL queries)
		if (typeof value === "string") {
			// Remove any currency symbols or commas
			const cleanValue = value.replace(/[$,]/g, "").trim();
			if (!cleanValue) {
				return 0;
			}

			const parsed = parseFloat(cleanValue);
			const result = isNaN(parsed) ? 0 : parsed;
			return result;
		}

		// Handle numeric values
		const result = typeof value === "number" ? value : 0;
		return result;
	} catch (error) {
		console.error("[MONEY_CONVERT] Error converting money value:", {
			error: error instanceof Error ? error.message : String(error),
			value: value?.toString(),
			stack: error instanceof Error ? error.stack : undefined
		});
		logger.error("Error converting money value", {
			error: error instanceof Error ? error.message : String(error),
			value: value?.toString(),
		});
		return 0;
	}
}

// Gets all subsector IDs for a given sector and its subsectors following international standards.
// This implementation uses the proper hierarchical structure defined in the sector table
// rather than relying on ID patterns, making it suitable for all countries.
//
// @param sectorId - The ID of the sector to get subsectors for
// @returns Array of sector IDs including the input sector and all its subsectors
const getAllSubsectorIds = async (sectorId: string): Promise<string[]> => {
	try {
		// First get the level of the input sector
		const sectorInfo = await dr
			.select({
				id: sectorTable.id,
				level: sectorTable.level,
			})
			.from(sectorTable)
			.where(eq(sectorTable.id, sectorId))

		if (sectorInfo.length === 0) {
			return [];
		}

		const level = sectorInfo[0].level;

		// If it's already a level 4 sector (most detailed), just return itself
		if (level === 4) {
			return [sectorId];
		}

		// FOR PARENT SECTORS: Get all descendant subsectors recursively

		// Get all sectors to build the hierarchy
		const allSectors = await dr
			.select({
				id: sectorTable.id,
				parentId: sectorTable.parentId,
				level: sectorTable.level,
			})
			.from(sectorTable);

		// Build a map of parent -> children
		const childrenMap = new Map<string, string[]>();
		for (const sector of allSectors) {
			if (sector.parentId) {
				if (!childrenMap.has(sector.parentId)) {
					childrenMap.set(sector.parentId, []);
				}
				childrenMap.get(sector.parentId)!.push(sector.id);
			}
		}

		// Recursively get all descendants
		const getAllDescendants = (parentId: string): string[] => {
			const children = childrenMap.get(parentId) || [];
			let descendants = [...children];

			for (const child of children) {
				descendants.push(...getAllDescendants(child));
			}

			return descendants;
		};

		const descendants = getAllDescendants(sectorId);
		const allSectorIds = [sectorId, ...descendants]; // Include parent + all descendants

		return allSectorIds;

	} catch (error) {

		return [];
	}
};

/**
 * Validates if a value is a properly formatted GeoJSON object
 * Following OGC GeoJSON standard requirements
 */
function isValidGeoJSON(value: any): boolean {
	try {
		if (!value || typeof value !== "object") {
			return false;
		}

		// If it's already parsed JSON, check for required properties
		if (typeof value === "object") {
			// Check for required GeoJSON properties
			const isValid = (
				(value.type === "Feature" && value.geometry) ||
				(value.type === "FeatureCollection" && Array.isArray(value.features)) ||
				[
					"Point",
					"LineString",
					"Polygon",
					"MultiPoint",
					"MultiLineString",
					"MultiPolygon",
					"GeometryCollection",
				].includes(value.type)
			);

			return isValid;
		}
		return false;
	} catch (error) {
		logger.error("Error validating GeoJSON", {
			error: error instanceof Error ? error.message : String(error),
			value: value?.toString(),
		});
		return false;
	}
}


export async function getGeographicImpact(
	countryAccountsId: string,
	filters: GeographicImpactFilters
): Promise<GeographicImpactResult> {
	try {
		// Get sector IDs based on selection
		let sectorIds: string[] = [];

		if (filters.subSectorId) {
			// If subsector is selected, only use that ID
			const parsedSubSectorId = filters.subSectorId;
			sectorIds = await getAllSubsectorIds(parsedSubSectorId);
		} else if (filters.sectorId) {
			// If only parent sector is selected, get all its subsectors
			sectorIds = await getAllSubsectorIds(filters.sectorId);
		} else {
		}

		if (filters.sectorId && sectorIds.length === 0) {
			return {
				success: false,
				divisions: [],
				values: {},
				error: "Invalid sector ID",
			};
		}

		// Create assessment metadata with all required fields
		const metadata = await createAssessmentMetadata(
			filters.assessmentType || "rapid",
			filters.confidenceLevel || "low"
		);

		// Base conditions for disaster records following DaLA methodology
		const baseConditions: Array<SQL<unknown>> = [
			sql<string>`${disasterRecordsTable.approvalStatus} = 'published'`,
		];

		// Add sector filtering using sectorDisasterRecordsRelationTable
		if (sectorIds.length > 0) {
			const sectorCondition = exists(
				dr
					.select()
					.from(sectorDisasterRecordsRelationTable)
					.where(
						and(
							eq(
								sectorDisasterRecordsRelationTable.disasterRecordId,
								disasterRecordsTable.id
							),
							inArray(sectorDisasterRecordsRelationTable.sectorId, sectorIds)
						)
					)
			);
			baseConditions.push(sectorCondition);
		}

		// Add date range filters if provided
		if (filters.fromDate) {
			const parsedFromDate = parseFlexibleDate(filters.fromDate);
			if (parsedFromDate) {
				baseConditions.push(
					createDateCondition(
						disasterRecordsTable.startDate,
						parsedFromDate,
						"gte"
					)
				);
			} else {
				console.error("[GEOGRAPHIC_IMPACT] Invalid from date format:", {
					fromDate: filters.fromDate,
				});
			}
		}

		if (filters.toDate) {
			const parsedToDate = parseFlexibleDate(filters.toDate);
			if (parsedToDate) {
				baseConditions.push(
					createDateCondition(disasterRecordsTable.endDate, parsedToDate, "lte")
				);
			} else {
				console.error("[GEOGRAPHIC_IMPACT] Invalid to date format:", {
					toDate: filters.toDate
				});
			}
		}

		// Add disaster event filter if provided
		if (filters.disasterEventId) {
			try {
				const eventId = filters.disasterEventId;
				if (eventId) {
					// Check if it's a UUID (for direct ID matching)
					const uuidRegex =
						/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

					if (uuidRegex.test(eventId)) {
						// Direct ID match for UUID format
						baseConditions.push(eq(disasterEventTable.id, eventId));
					} else {
						// Text search across multiple fields for non-UUID format
						const searchConditions: SQL<unknown>[] = [];
						searchConditions.push(
							sql`LOWER(${disasterEventTable.nameNational
								}::text) LIKE ${`%${eventId.toLowerCase()}%`}`
						);
						searchConditions.push(
							sql`LOWER(${disasterEventTable.id
								}::text) LIKE ${`%${eventId.toLowerCase()}%`}`
						);
						searchConditions.push(sql`
                            CASE WHEN ${disasterEventTable.glide} IS NOT NULL 
                            THEN LOWER(${disasterEventTable.glide
							}) LIKE ${`%${eventId.toLowerCase()}%`}
                            ELSE FALSE END
                        `);
						searchConditions.push(sql`
                            CASE WHEN ${disasterEventTable.nationalDisasterId
							} IS NOT NULL 
                            THEN LOWER(${disasterEventTable.nationalDisasterId
							}) LIKE ${`%${eventId.toLowerCase()}%`}
                            ELSE FALSE END
                        `);
						searchConditions.push(sql`
                            CASE WHEN ${disasterEventTable.otherId1
							} IS NOT NULL 
                            THEN LOWER(${disasterEventTable.otherId1
							}) LIKE ${`%${eventId.toLowerCase()}%`}
                            ELSE FALSE END
                        `);

						baseConditions.push(...searchConditions);
					}
				}
			} catch (error) {
			}
		}

		// Add base query builder for disaster records, supporting hazard filters with joins in applyHazardFilters()
		let queryBuilder = dr.select().from(disasterRecordsTable);

		// Hazard filtering with improved hierarchical structure handling
		await applyHazardFilters(
			{
				hazardTypeId: filters.hazardTypeId,
				hazardClusterId: filters.hazardClusterId,
				specificHazardId: filters.specificHazardId,
			},
			dr,
			baseConditions,
			eq,
			hipTypeTable,
			hipClusterTable,
			hipHazardTable,
			hazardousEventTable,
			disasterEventTable,
			disasterRecordsTable,
			queryBuilder
		);

		// Finalize query with all base conditions
		queryBuilder.where(and(...baseConditions));

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
				importId: divisionTable.importId,
				countryAccountsId: divisionTable.countryAccountsId,
			})
			.from(divisionTable)
			.where(
				and(
					eq(divisionTable.level, 1),
					eq(divisionTable.countryAccountsId, countryAccountsId),
					filters.geographicLevelId
						? eq(divisionTable.id, filters.geographicLevelId)
						: undefined
				)
			);

		let divisions: SelectDivision[] = [];
		try {
			divisions = await baseDivisionsQuery;

			if (!divisions || divisions.length === 0) {
				return {
					success: false,
					divisions: [],
					values: {},
					error: "No divisions found for the given criteria",
				};
			}
		} catch (error) {
			console.error("[GEOGRAPHIC_IMPACT] Error fetching divisions:", {
				countryAccountsId,
				geographicLevelId: filters.geographicLevelId,
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined
			});
			return {
				success: false,
				divisions: [],
				values: {},
				error: "Failed to fetch geographic divisions",
			};
		}

		// Create a map to store values for each division
		const values: { [key: string]: CleanDivisionValues } = {};

		await Promise.all(
			divisions.map(async (division, _index) => {

				try {
					const disasterRecords = await getDisasterRecordsForDivision(
						countryAccountsId,
						division.id,
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
						sectorIds
					);

					if (!disasterRecords || disasterRecords.length === 0) {
						values[division.id.toString()] = {
							totalDamage: 0,
							totalLoss: 0,
							metadata,
							dataAvailability: "no_data",
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
						dataAvailability:
							totalDamage > 0 || totalLoss > 0 ? "available" : "zero",
					};

				} catch (error) {
					console.error(`[DIVISION_PROCESS] Error processing division ${division.id}:`, {
						divisionId: division.id,
						error: error instanceof Error ? error.message : String(error),
						stack: error instanceof Error ? error.stack : undefined
					});
					values[division.id.toString()] = {
						totalDamage: 0,
						totalLoss: 0,
						metadata,
						dataAvailability: "no_data",
					};
				}
			})
		);

		return {
			success: true,
			divisions,
			values,
		};
	} catch (error) {
		console.error("[GEOGRAPHIC_IMPACT] Critical error in getGeographicImpact:", {
			countryAccountsId,
			filters,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined
		});
		return {
			success: false,
			divisions: [],
			values: {},
			error: `Error processing geographic impact: ${error instanceof Error ? error.message : String(error)
				}`,
		};
	}
}

export async function getDescendantDivisionIds(
	divisionId: string
): Promise<string[]> {

	try {
		const allDivisions = await dr
			.select({
				id: divisionTable.id,
				parentId: divisionTable.parentId,
			})
			.from(divisionTable);

		const childrenMap = new Map<string, string[]>();
		for (const { id, parentId } of allDivisions) {
			if (parentId === null) continue;
			if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
			childrenMap.get(parentId)!.push(id);
		}

		const result = new Set<string>();
		const queue = [divisionId];
		let processedCount = 0;

		while (queue.length) {
			const current = queue.pop()!;
			processedCount++;
			const children = childrenMap.get(current) || [];

			for (const child of children) {
				if (!result.has(child)) {
					result.add(child);
					queue.push(child);
				}
			}
		}

		const descendants = [divisionId, ...Array.from(result)];

		return descendants;
	} catch (error) {
		console.error("[DESCENDANT_DIVISIONS] Error finding descendants:", {
			divisionId,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined
		});
		return [divisionId]; // Return at least the input division
	}
}


async function getDisasterRecordsForDivision(
	countryAccountsId: string,
	divisionId: string,
	filters?: GeographicFilters,
	sectorIds: string[] = []
): Promise<string[]> {

	try {
		// Fetch division data first to ensure it exists and has valid geometry
		const division = await dr
			.select({
				id: divisionTable.id,
				geom: divisionTable.geom,
			})
			.from(divisionTable)
			.where(eq(divisionTable.id, divisionId))

		if (division.length === 0 || !division[0].geom) {
			return [];
		}

		// Build conditions array
		const conditions: Array<SQL<unknown>> = [];

		// Add tenant isolation filter
		conditions.push(
			sql<string>`${disasterRecordsTable.countryAccountsId} = ${countryAccountsId}`
		);

		// Add approval status filter
		conditions.push(
			sql<string>`${disasterRecordsTable.approvalStatus} = 'published'`
		);

		// Add hazard conditions from baseQuery if present
		if (filters?.hazardType) {
			conditions.push(eq(hazardousEventTable.hipTypeId, filters.hazardType));
		}
		if (filters?.hazardCluster) {
			conditions.push(
				eq(hazardousEventTable.hipClusterId, filters.hazardCluster)
			);
		}
		if (filters?.specificHazard) {
			conditions.push(
				eq(hazardousEventTable.hipHazardId, filters.specificHazard)
			);
		}

		// Add sector filter with hierarchy support
		if (sectorIds.length > 0) {
			conditions.push(
				inArray(sectorDisasterRecordsRelationTable.sectorId, sectorIds)
			);
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
					const uuidRegex =
						/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

					if (uuidRegex.test(eventId)) {
						// Direct ID match for UUID format
						conditions.push(eq(disasterEventTable.id, eventId));
					} else {
						// Text search across multiple fields for non-UUID format
						const searchConditions: Array<SQL<string>> = [];

						if (disasterEventTable.nameNational) {
							searchConditions.push(
								sql<string>`LOWER(${disasterEventTable.nameNational
									}::text) LIKE ${`%${eventId.toLowerCase()}%`}`
							);
						}

						searchConditions.push(
							sql<string>`LOWER(${disasterEventTable.id
								}::text) LIKE ${`%${eventId.toLowerCase()}%`}`
						);

						if (disasterEventTable.glide) {
							searchConditions.push(
								sql<string>`CASE WHEN ${disasterEventTable.glide} IS NOT NULL 
                                    THEN LOWER(${disasterEventTable.glide
									}) LIKE ${`%${eventId.toLowerCase()}%`}
                                    ELSE FALSE END`
							);
						}

						if (disasterEventTable.nationalDisasterId) {
							searchConditions.push(
								sql<string>`CASE WHEN ${disasterEventTable.nationalDisasterId
									} IS NOT NULL 
                                    THEN LOWER(${disasterEventTable.nationalDisasterId
									}) LIKE ${`%${eventId.toLowerCase()}%`}
                                    ELSE FALSE END`
							);
						}

						if (disasterEventTable.otherId1) {
							searchConditions.push(
								sql<string>`CASE WHEN ${disasterEventTable.otherId1
									} IS NOT NULL 
                                    THEN LOWER(${disasterEventTable.otherId1
									}) LIKE ${`%${eventId.toLowerCase()}%`}
                                    ELSE FALSE END`
							);
						}

						// Add the OR condition for text search if we have any conditions
						conditions.push(...searchConditions);
					}
				}
			} catch (error) {
				console.error(error)
			}
		}

		// Build base query
		const query = dr
			.select({
				id: disasterRecordsTable.id,
				locationDesc: disasterRecordsTable.locationDesc,
				spatialFootprint: disasterRecordsTable.spatialFootprint,
				sectorId: sectorDisasterRecordsRelationTable.sectorId,
				withDamage: sectorDisasterRecordsRelationTable.withDamage,
				damageCost: sectorDisasterRecordsRelationTable.damageCost,
				damageCostCurrency:
					sectorDisasterRecordsRelationTable.damageCostCurrency,
			})
			.from(disasterRecordsTable)
			.innerJoin(
				sectorDisasterRecordsRelationTable,
				eq(
					sectorDisasterRecordsRelationTable.disasterRecordId,
					disasterRecordsTable.id
				)
			)


		const descendantIds = await getDescendantDivisionIds(divisionId);


		const quoted = descendantIds.map((id) => `@ == "${id}"`).join(" || ");

		// First try to get records with spatial data
		const spatialQuery = query.where(
			and(
				...conditions,
				sql`${disasterRecordsTable.spatialFootprint} IS NOT NULL`,
				or(
					sql.raw(`jsonb_path_exists("disaster_records"."spatial_footprint", '$[*].geojson.properties.division_ids[*] ? (${quoted})')`),
					sql.raw(`jsonb_path_exists("disaster_records"."spatial_footprint", '$[*].geojson.dts_info.division_ids[*] ? (${quoted})')`),
					sql.raw(`jsonb_path_exists("disaster_records"."spatial_footprint", '$[*].geojson.dts_info.division_id ? (@ == "${divisionId}")')`),
					sql.raw(`EXISTS (
                        SELECT 1 FROM jsonb_array_elements("disaster_records"."spatial_footprint") AS footprint
                        WHERE footprint->>'geographic_level' IN (
                            SELECT name->>'en' 
                            FROM "division"
                            WHERE id = '${divisionId}'
                        )
                    )`),
					sql.raw(`EXISTS (
                        SELECT 1 FROM jsonb_array_elements("disaster_records"."spatial_footprint") AS footprint,
                        jsonb_array_elements(footprint->'map_coords'->'coordinates') AS coord
                        WHERE ST_Contains(
                            (SELECT geom FROM "division" WHERE id = '${divisionId}'),
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
                            (SELECT geom FROM "division" WHERE id = '${divisionId}'),
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
                            (SELECT geom FROM "division" WHERE id = '${divisionId}'),
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
                            (SELECT geom FROM "division" WHERE id = '${divisionId}'),
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
                            (SELECT geom FROM "division" WHERE id = '${divisionId}'),
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
                            (SELECT geom FROM "division" WHERE id = '${divisionId}'),
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
                            (SELECT geom FROM "division" WHERE id = '${divisionId}'),
                            ST_SetSRID(ST_MakePoint(
                                (feature->'geometry'->'coordinates'->>0)::float,
                                (feature->'geometry'->'coordinates'->>1)::float
                            ), 4326)
                        )
                    )`)
				)
			)
		);

		// Execute spatial query
		const spatialRecords = await spatialQuery;

		const regionResult = await dr.execute(sql`SELECT name->>'en' as name FROM "division" WHERE name->>'en' IS NOT NULL`);
		const regionNames = regionResult.rows.map((r) => r.name);
		const regionNameSet = new Set(regionNames);
		const descendantStrSet = new Set(descendantIds.map(String));

		const confirmed = spatialRecords.filter((record) => {
			const footprint = record.spatialFootprint;
			if (!Array.isArray(footprint)) {
				return false;
			}

			const isValid = footprint.some((feature) => {
				const geojson = feature.geojson || {};
				const props = geojson.properties || {};
				const dts = geojson.dts_info || {};
				const mapCoords = feature.map_coords || {};

				// Check all possible division ID locations
				const ids1 = Array.isArray(props.division_ids)
					? props.division_ids.map(String)
					: [];
				const ids2 = Array.isArray(dts.division_ids)
					? dts.division_ids.map(String)
					: [];
				const id2 = dts.division_id ? String(dts.division_id) : null;

				const matchedId = [...ids1, ...ids2, id2].some(
					(id) => id && descendantStrSet.has(id)
				);
				const geographicLevel = feature.geographic_level;
				const matchedName = regionNameSet.has(geographicLevel);

				// Check for spatial matches based on geometry type
				const hasValidGeometry =
					// GeoJSON Point Features
					geojson.features?.some(
						(f: { geometry?: { type: string } }) =>
							f.geometry?.type === "Point" || f.geometry?.type === "LineString"
					) ||
					// Map Coordinates Points
					(mapCoords.mode === "markers" &&
						Array.isArray(mapCoords.coordinates)) ||
					// Lines
					(mapCoords.mode === "lines" &&
						Array.isArray(mapCoords.coordinates)) ||
					// Circle Areas
					(mapCoords.mode === "circle" &&
						mapCoords.center &&
						mapCoords.radius) ||
					// Rectangle Areas
					(mapCoords.mode === "rectangle" &&
						Array.isArray(mapCoords.coordinates) &&
						mapCoords.coordinates.length >= 2) ||
					// Polygon Areas
					(mapCoords.mode === "polygon" &&
						Array.isArray(mapCoords.coordinates) &&
						mapCoords.coordinates.length >= 3);

				// Record is valid if it has either:
				// 1. Matching metadata (division IDs or geographic level)
				// 2. Valid spatial geometry that was matched by SQL spatial queries
				if (!matchedId && !matchedName && !hasValidGeometry) {
					return false;
				}
				return true;
			});

			return isValid;
		});

		// Use verified records for the rest of the function
		spatialRecords.length = 0;
		spatialRecords.push(...confirmed);

		// If no spatial matches, try text matching as fallback
		if (spatialRecords.length === 0) {
			try {
				// Fetch division name for text matching
				const divisionDetails = await dr
					.select({
						id: divisionTable.id,
						name: divisionTable.name,
					})
					.from(divisionTable)
					.where(eq(divisionTable.id, divisionId))

				if (divisionDetails.length > 0 && divisionDetails[0].name) {
					const divisionName = divisionDetails[0].name.en || "";
					const normalizedDivName = normalizeText(divisionName);

					const textQuery = query.where(
						and(
							...conditions,
							sql<string>`(
                            ${disasterRecordsTable.locationDesc
								} = ${divisionId} OR
                            ${disasterRecordsTable.locationDesc
								} LIKE ${`%${divisionId}%`} OR
                            LOWER(${disasterRecordsTable.locationDesc
								}) LIKE ${`%${normalizedDivName.toLowerCase()}%`} OR
                            ${disasterRecordsTable.locationDesc
								} LIKE ${`%${divisionName}%`}
                        )`
						)
					);

					const textRecords = await textQuery;

					return [...spatialRecords, ...textRecords].map((r) => r.id);
				} else {
				}
			} catch (error) {
				console.error("[DISASTER_RECORDS] Error in text matching:", {
					divisionId,
					error: error instanceof Error ? error.message : String(error),
					stack: error instanceof Error ? error.stack : undefined
				});
			}
		}

		const finalRecordIds = spatialRecords.map((r) => r.id);

		return finalRecordIds;
	} catch (error) {
		console.error("[DISASTER_RECORDS] Critical error getting disaster records:", {
			divisionId,
			countryAccountsId,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined
		});
		return [];
	}
}


export async function fetchGeographicImpactData(
	countryAccountsId: string,
	divisionId: string,
	filters?: GeographicFilters
): Promise<{
	totalDamage: number;
	totalLoss: number;
	byYear: Map<number, number>;
	metadata?: DisasterImpactMetadata;
}> {

	try {
		// Validate division ID
		if (!divisionId) {
			return {
				totalDamage: 0,
				totalLoss: 0,
				byYear: new Map(),
				metadata: await createAssessmentMetadata("rapid", "low"),
			};
		}

		// Get disaster records for the division with improved spatial handling
		const recordIds = await getDisasterRecordsForDivision(
			countryAccountsId,
			divisionId,
			filters
		);

		if (recordIds.length === 0) {
			return {
				totalDamage: 0,
				totalLoss: 0,
				byYear: new Map(),
				metadata: await createAssessmentMetadata("rapid", "low"),
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
		const metadata = await createAssessmentMetadata(
			filters?.assessmentType || "rapid",
			filters?.confidenceLevel || "low"
		);

		return {
			totalDamage,
			totalLoss,
			byYear,
			metadata,
		};
	} catch (error) {
		console.error("[FETCH_IMPACT] Error fetching geographic impact data:", {
			countryAccountsId,
			divisionId,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined
		});
		return {
			totalDamage: 0,
			totalLoss: 0,
			byYear: new Map(),
			metadata: await createAssessmentMetadata("rapid", "low"),
		};
	}
}

async function aggregateDamagesData(
	recordIds: string[],
	sectorIds?: string[]
): Promise<{ total: number; byYear: Map<number, number> }> {

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
                ), 0)`,
			})
			.from(disasterRecordsTable)
			.innerJoin(
				sectorDisasterRecordsRelationTable,
				eq(
					sectorDisasterRecordsRelationTable.disasterRecordId,
					disasterRecordsTable.id
				)
			)
			.where(
				and(
					inArray(disasterRecordsTable.id, recordIds),
					sectorIds
						? inArray(sectorDisasterRecordsRelationTable.sectorId, sectorIds)
						: undefined
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
                ), 0)`,
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
					not(
						exists(
							dr
								.select()
								.from(sectorDisasterRecordsRelationTable)
								.where(
									and(
										eq(
											sectorDisasterRecordsRelationTable.disasterRecordId,
											disasterRecordsTable.id
										),
										eq(sectorDisasterRecordsRelationTable.withDamage, true),
										sql`${sectorDisasterRecordsRelationTable.damageCost} IS NOT NULL`,
										sectorIds
											? inArray(
												sectorDisasterRecordsRelationTable.sectorId,
												sectorIds
											)
											: undefined
									)
								)
						)
					)
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
			if (isNaN(year)) {
				continue;
			}

			const damage = safeMoneyToNumber(row.totalDamage);
			total += damage;
			byYear.set(year, (byYear.get(year) || 0) + damage);
		}

		// Then add detailed damages where there are no overrides
		for (const row of detailedDamages) {
			const year = Number(row.year);
			if (isNaN(year)) {
				continue;
			}

			const damage = safeMoneyToNumber(row.totalDamage);

			total += damage;
			byYear.set(year, (byYear.get(year) || 0) + damage);
		}

		return { total, byYear };
	} catch (error) {
		console.error("[DAMAGE_AGGREGATION] Error aggregating damages data:", {
			recordIds: recordIds.slice(0, 5),
			sectorIds: sectorIds?.slice(0, 5),
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined
		});
		return { total: 0, byYear: new Map() };
	}
}

async function aggregateLossesData(
	recordIds: string[],
	sectorIds?: string[]
): Promise<{ total: number; byYear: Map<number, number> }> {

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
                ), 0)`,
			})
			.from(disasterRecordsTable)
			.innerJoin(
				sectorDisasterRecordsRelationTable,
				eq(
					sectorDisasterRecordsRelationTable.disasterRecordId,
					disasterRecordsTable.id
				)
			)
			.where(
				and(
					inArray(disasterRecordsTable.id, recordIds),
					sectorIds
						? inArray(sectorDisasterRecordsRelationTable.sectorId, sectorIds)
						: undefined
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
                ), 0)`,
			})
			.from(disasterRecordsTable)
			.innerJoin(lossesTable, eq(lossesTable.recordId, disasterRecordsTable.id))
			.where(
				and(
					inArray(disasterRecordsTable.id, recordIds),
					sectorIds ? inArray(lossesTable.sectorId, sectorIds) : undefined,
					not(
						exists(
							dr
								.select()
								.from(sectorDisasterRecordsRelationTable)
								.where(
									and(
										eq(
											sectorDisasterRecordsRelationTable.disasterRecordId,
											disasterRecordsTable.id
										),
										eq(sectorDisasterRecordsRelationTable.withLosses, true),
										sql`${sectorDisasterRecordsRelationTable.lossesCost} IS NOT NULL`,
										sectorIds
											? inArray(
												sectorDisasterRecordsRelationTable.sectorId,
												sectorIds
											)
											: undefined
									)
								)
						)
					)
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
			if (isNaN(year)) {
				continue;
			}

			const loss = safeMoneyToNumber(row.totalLoss);

			total += loss;
			byYear.set(year, (byYear.get(year) || 0) + loss);
		}

		// Then add detailed losses where there are no overrides
		for (const row of detailedLosses) {
			const year = Number(row.year);
			if (isNaN(year)) {
				continue;
			}

			const loss = safeMoneyToNumber(row.totalLoss);

			total += loss;
			byYear.set(year, (byYear.get(year) || 0) + loss);
		}

		return { total, byYear };
	} catch (error) {
		console.error("[LOSS_AGGREGATION] Error aggregating losses data:", {
			recordIds: recordIds.slice(0, 5),
			sectorIds: sectorIds?.slice(0, 5),
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined
		});
		return { total: 0, byYear: new Map() };
	}
}

/**
 * Main function to get geographic impact following international standards
 */
export async function getGeographicImpactGeoJSON(
	countryAccountsId: string,
	sectorId: string,
	subSectorId?: string
): Promise<GeoJSONFeatureCollection> {

	try {
		const result = await getGeographicImpact(countryAccountsId, {
			sectorId,
			subSectorId,
		});

		if (!result.success) {
			return {
				type: "FeatureCollection",
				features: [],
			};
		}

		const features: GeoJSONFeature[] = [];

		for (const division of result.divisions) {

			try {
				// Skip divisions without geometry data
				if (!division.geojson) {
					continue;
				}

				// Parse and validate GeoJSON
				let geometry: GeoJSONGeometry;
				try {
					// Handle both string and object formats
					if (typeof division.geojson === "string") {
						const parsed = JSON.parse(division.geojson);
						if (!isValidGeoJSON(parsed)) {
							continue;
						}
						geometry = parsed as GeoJSONGeometry;
					} else {
						if (!isValidGeoJSON(division.geojson)) {
							continue;
						}
						geometry = division.geojson as GeoJSONGeometry;
					}
				} catch (error) {
					console.error(`[GEOJSON_FEATURE] Error parsing GeoJSON for division ${division.id}:`, {
						error: error instanceof Error ? error.message : String(error),
						stack: error instanceof Error ? error.stack : undefined
					});
					continue;
				}

				// Create feature with proper properties
				const featureProperties = {
					id: Number(division.id),
					name: division.name as Record<string, string>,
					level: division.level,
					parentId: division.parentId,
					totalDamage: result.values[division.id.toString()]?.totalDamage ?? 0,
					totalLoss: result.values[division.id.toString()]?.totalLoss ?? 0,
					dataAvailability: result.values[division.id.toString()]?.dataAvailability || "no_data",
				};

				features.push({
					type: "Feature" as const,
					geometry,
					properties: featureProperties,
				});
			} catch (error) {
				console.error(`[GEOJSON_FEATURE] Error processing division ${division.id} for GeoJSON:`, {
					divisionId: division.id,
					error: error instanceof Error ? error.message : String(error),
					stack: error instanceof Error ? error.stack : undefined
				});
				// Continue with other divisions instead of failing the entire operation
				continue;
			}
		}

		return {
			type: "FeatureCollection",
			features,
		};
	} catch (error) {
		console.error("[GEOJSON_EXPORT] Error in getGeographicImpactGeoJSON:", {
			countryAccountsId,
			sectorId,
			subSectorId,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined
		});
		return {
			type: "FeatureCollection",
			features: [],
		};
	}
}