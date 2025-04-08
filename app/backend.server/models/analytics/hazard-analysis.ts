import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { dr } from "~/db.server";
import {
	affectedTable,
	deathsTable,
	disasterEventTable,
	disasterRecordsTable,
	displacedTable,
	humanDsgTable,
	injuredTable,
	missingTable,
	sectorDisasterRecordsRelationTable,
} from "~/drizzle/schema";

interface HazardFilters {
	hazardTypeId: string | null;
	hazardClusterId: string | null;
	specificHazardId: string | null;
	geographicLevelId: string | null;
	fromDate: string | null;
	toDate: string | null;
}

/**
 * Retrieves the count of disaster event records based on the provided filters.
 * @param filters - Object containing filter values from HazardFilters
 * @returns Promise<number> - The count of matching disaster events
 */
export async function getDisasterEventCount(
	filters: HazardFilters
): Promise<number> {
	const {
		hazardTypeId,
		hazardClusterId,
		specificHazardId,
		geographicLevelId,
		fromDate,
		toDate,
	} = filters;

	// Build the WHERE conditions dynamically
	const conditions = [];

	conditions.push(eq(disasterEventTable.approvalStatus, "published"));

	// Filter by hazard type
	if (hazardTypeId) {
		conditions.push(eq(disasterEventTable.hipTypeId, hazardTypeId));
	}

	// Filter by hazard cluster
	if (hazardClusterId) {
		conditions.push(eq(disasterEventTable.hipClusterId, hazardClusterId));
	}

	// Filter by specific hazard
	if (specificHazardId) {
		conditions.push(eq(disasterEventTable.hipHazardId, specificHazardId));
	}

	// Filter by geographic level (match division_id in spatialFootprint JSONB array)
	if (geographicLevelId) {
		conditions.push(
			sql`EXISTS (
        SELECT 1
        FROM jsonb_array_elements(${disasterEventTable.spatialFootprint}) AS elem
        WHERE (elem->'geojson'->'properties'->>'division_id') = ${geographicLevelId}
      )`
		);
	}

	// Filter by date range (overlap with startDate and endDate)
	if (fromDate || toDate) {
		const from = fromDate || "0001-01-01"; // Default to very early date if not provided
		const to = toDate || "9999-12-31"; // Default to very late date if not provided
		conditions.push(
			sql`${disasterEventTable.startDate} >= ${from} AND ${disasterEventTable.endDate} <= ${to}`
		);
	}

	// Construct the query to count matching records
	const query = dr
		.select({
			count: sql<number>`COUNT(*)`.as("disaster_count"),
		})
		.from(disasterEventTable)
		.where(and(...conditions));

	const result = await query.execute();
	return result[0]?.count ?? 0;
}

export interface YearlyDisasterCount {
	year: number;
	count: number;
}

export async function getDisasterEventCountByYear(
	filters: HazardFilters
): Promise<YearlyDisasterCount[]> {
	const {
		hazardTypeId,
		hazardClusterId,
		specificHazardId,
		geographicLevelId,
		fromDate,
		toDate,
	} = filters;

	// Build the WHERE conditions dynamically
	const conditions = [];

	conditions.push(eq(disasterEventTable.approvalStatus, "published"));

	// Filter by hazard type
	if (hazardTypeId) {
		conditions.push(eq(disasterEventTable.hipTypeId, hazardTypeId));
	}

	// Filter by hazard cluster
	if (hazardClusterId) {
		conditions.push(eq(disasterEventTable.hipClusterId, hazardClusterId));
	}

	// Filter by specific hazard
	if (specificHazardId) {
		conditions.push(eq(disasterEventTable.hipHazardId, specificHazardId));
	}

	// Filter by geographic level (match division_id in spatialFootprint JSONB array)
	if (geographicLevelId) {
		conditions.push(
			sql`EXISTS (
        SELECT 1
        FROM jsonb_array_elements(${disasterEventTable.spatialFootprint}) AS elem
        WHERE (elem->'geojson'->'properties'->>'division_id') = ${geographicLevelId}
      )`
		);
	}

	// Filter by date range (overlap with startDate and endDate as text)
	if (fromDate || toDate) {
		const from = fromDate || "0001-01-01"; // Default to earliest possible date
		const to = toDate || "9999-12-31"; // Default to latest possible date

		// Convert startDate and endDate to comparable dates, handling all formats
		const startDateAsDate = sql`CASE 
      WHEN ${disasterEventTable.startDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${disasterEventTable.startDate}, 'YYYY-MM-DD')
      WHEN ${disasterEventTable.startDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${disasterEventTable.startDate}, 'YYYY-MM')
      WHEN ${disasterEventTable.startDate} ~ '^[0-9]{4}$' THEN TO_DATE(${disasterEventTable.startDate}, 'YYYY')
      ELSE NULL
    END`;

		const endDateAsDate = sql`CASE 
      WHEN ${disasterEventTable.endDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${disasterEventTable.endDate}, 'YYYY-MM-DD')
      WHEN ${disasterEventTable.endDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${disasterEventTable.endDate}, 'YYYY-MM')
      WHEN ${disasterEventTable.endDate} ~ '^[0-9]{4}$' THEN TO_DATE(${disasterEventTable.endDate}, 'YYYY')
      ELSE NULL
    END`;

		// Add overlap condition: events where startDate <= to and endDate >= from
		conditions.push(
			sql`${startDateAsDate} <= ${to}::date AND ${endDateAsDate} >= ${from}::date`
		);
	}

	// Construct the query to count disasters grouped by year
	const query = dr
		.select({
			year: sql<number | null>`CASE 
        WHEN ${disasterEventTable.startDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN EXTRACT(YEAR FROM TO_DATE(${disasterEventTable.startDate}, 'YYYY-MM-DD'))
        WHEN ${disasterEventTable.startDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN EXTRACT(YEAR FROM TO_DATE(${disasterEventTable.startDate}, 'YYYY-MM'))
        WHEN ${disasterEventTable.startDate} ~ '^[0-9]{4}$' THEN EXTRACT(YEAR FROM TO_DATE(${disasterEventTable.startDate}, 'YYYY'))
        ELSE NULL
      END`.as("year"),
			count: sql<number>`COUNT(*)`.as("disaster_count"),
		})
		.from(disasterEventTable)
		.where(and(...conditions)).groupBy(sql`CASE 
      WHEN ${disasterEventTable.startDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN EXTRACT(YEAR FROM TO_DATE(${disasterEventTable.startDate}, 'YYYY-MM-DD'))
      WHEN ${disasterEventTable.startDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN EXTRACT(YEAR FROM TO_DATE(${disasterEventTable.startDate}, 'YYYY-MM'))
      WHEN ${disasterEventTable.startDate} ~ '^[0-9]{4}$' THEN EXTRACT(YEAR FROM TO_DATE(${disasterEventTable.startDate}, 'YYYY'))
      ELSE NULL
    END`).orderBy(sql`CASE 
      WHEN ${disasterEventTable.startDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN EXTRACT(YEAR FROM TO_DATE(${disasterEventTable.startDate}, 'YYYY-MM-DD'))
      WHEN ${disasterEventTable.startDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN EXTRACT(YEAR FROM TO_DATE(${disasterEventTable.startDate}, 'YYYY-MM'))
      WHEN ${disasterEventTable.startDate} ~ '^[0-9]{4}$' THEN EXTRACT(YEAR FROM TO_DATE(${disasterEventTable.startDate}, 'YYYY'))
      ELSE NULL
    END ASC`);

	const result = await query.execute();
	return result
		.filter((row) => row.year !== null) // Filter out rows with null years
		.map((row) => ({
			year: row.year as number, // Safe cast since nulls are filtered
			count: row.count,
		}));
}

interface AffectedPeopleResult {
	totalDeaths: number;
	totalInjured: number;
	totalMissing: number;
	totalDisplaced: number;
	totalAffectedDirect: number;
	totalAffectedIndirect: number;
}

export async function getAffectedPeopleByHazardFilters(
	filters: HazardFilters
): Promise<AffectedPeopleResult> {
	const {
		hazardTypeId,
		hazardClusterId,
		specificHazardId,
		fromDate,
		toDate,
		geographicLevelId,
	} = filters;

	// Build WHERE conditions dynamically
	const conditions = [];

	conditions.push(eq(disasterRecordsTable.approvalStatus, "published"));

	// Filter by hazard type (hip_type_id)
	if (hazardTypeId) {
		conditions.push(eq(disasterRecordsTable.hipTypeId, hazardTypeId));
	}

	// Filter by hazard cluster (hip_cluster_id)
	if (hazardClusterId) {
		conditions.push(eq(disasterRecordsTable.hipClusterId, hazardClusterId));
	}

	// Filter by specific hazard (hip_hazard_id)
	if (specificHazardId) {
		conditions.push(eq(disasterRecordsTable.hipHazardId, specificHazardId));
	}

	// Filter by geographic level (division_id or division_ids in spatial_footprint)
	if (geographicLevelId) {
		conditions.push(
			sql`(
        EXISTS (
          SELECT 1
          FROM jsonb_array_elements(${disasterRecordsTable.spatialFootprint}) AS elem
          WHERE (elem->'geojson'->'properties'->>'division_id') = ${geographicLevelId}
        )
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements(${disasterRecordsTable.spatialFootprint}) AS elem,
               jsonb_array_elements_text(elem->'geojson'->'properties'->'division_ids') AS div_id
          WHERE div_id = ${geographicLevelId}
        )
      )`
		);
	}

	// Filter by date range (overlap with start_date and end_date as text)
	if (fromDate || toDate) {
		const from = fromDate || "0001-01-01"; // Default to earliest date
		const to = toDate || "9999-12-31"; // Default to latest date

		const startDateAsDate = sql`CASE 
      WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM-DD')
      WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM')
      WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY')
      ELSE NULL
    END`;

		const endDateAsDate = sql`CASE 
      WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY-MM-DD')
      WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY-MM')
      WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY')
      ELSE NULL
    END`;

		conditions.push(
			sql`${startDateAsDate} <= ${to}::date AND ${endDateAsDate} >= ${from}::date`
		);
	}

	// Conditions for human_dsg: all specified fields are NULL and custom is {}
	const humanDsgConditions = and(
		isNull(humanDsgTable.sex),
		isNull(humanDsgTable.age),
		isNull(humanDsgTable.disability),
		isNull(humanDsgTable.globalPovertyLine),
		isNull(humanDsgTable.nationalPovertyLine),
		sql`${humanDsgTable.custom} = '{}'::jsonb`
	);

	// Construct the query
	const query = dr
		.select({
			totalDeaths: sql<number>`COALESCE(SUM(${deathsTable.deaths}), 0)`.as(
				"total_deaths"
			),
			totalInjured: sql<number>`COALESCE(SUM(${injuredTable.injured}), 0)`.as(
				"total_injured"
			),
			totalMissing: sql<number>`COALESCE(SUM(${missingTable.missing}), 0)`.as(
				"total_missing"
			),
			totalDisplaced:
				sql<number>`COALESCE(SUM(${displacedTable.displaced}), 0)`.as(
					"total_displaced"
				),
			totalAffectedDirect:
				sql<number>`COALESCE(SUM(${affectedTable.direct}), 0)`.as(
					"total_affected_direct"
				),
			totalAffectedIndirect:
				sql<number>`COALESCE(SUM(${affectedTable.indirect}), 0)`.as(
					"total_affected_indirect"
				),
		})
		.from(disasterRecordsTable)
		.leftJoin(
			humanDsgTable,
			eq(disasterRecordsTable.id, humanDsgTable.recordId)
		)
		.leftJoin(deathsTable, eq(humanDsgTable.id, deathsTable.dsgId))
		.leftJoin(injuredTable, eq(humanDsgTable.id, injuredTable.dsgId))
		.leftJoin(missingTable, eq(humanDsgTable.id, missingTable.dsgId))
		.leftJoin(displacedTable, eq(humanDsgTable.id, displacedTable.dsgId))
		.leftJoin(affectedTable, eq(humanDsgTable.id, affectedTable.dsgId))
		.where(and(...conditions, humanDsgConditions));

	const result = await query.execute();

	// Return the aggregated totals
	return {
		totalDeaths: result[0]?.totalDeaths ?? 0,
		totalInjured: result[0]?.totalInjured ?? 0,
		totalMissing: result[0]?.totalMissing ?? 0,
		totalDisplaced: result[0]?.totalDisplaced ?? 0,
		totalAffectedDirect: result[0]?.totalAffectedDirect ?? 0,
		totalAffectedIndirect: result[0]?.totalAffectedIndirect ?? 0,
	};
}

interface GenderTotals {
	totalMen: number;
	totalWomen: number;
	totalNonBinary: number;
}

export async function getGenderTotalsByHazardFilters(
	filters: HazardFilters
): Promise<GenderTotals> {
	const {
		hazardTypeId,
		hazardClusterId,
		specificHazardId,
		fromDate,
		toDate,
		geographicLevelId,
	} = filters;

	const disasterConditions = [];

	disasterConditions.push(eq(disasterRecordsTable.approvalStatus, "published"));

	if (hazardTypeId) {
		disasterConditions.push(eq(disasterRecordsTable.hipTypeId, hazardTypeId));
	}
	if (hazardClusterId) {
		disasterConditions.push(
			eq(disasterRecordsTable.hipClusterId, hazardClusterId)
		);
	}
	if (specificHazardId) {
		disasterConditions.push(
			eq(disasterRecordsTable.hipHazardId, specificHazardId)
		);
	}
	if (geographicLevelId) {
		disasterConditions.push(
			sql`EXISTS (
		  SELECT 1
		  FROM jsonb_array_elements(${disasterRecordsTable.spatialFootprint}) AS elem
		  WHERE (elem->'geojson'->'properties'->>'division_id') = ${geographicLevelId}
		)`
		);
	}

	if (fromDate || toDate) {
		const from = fromDate || "0001-01-01";
		const to = toDate || "9999-12-31";

		const startDateAsDate = sql`CASE 
		WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM-DD')
		WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM')
		WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY')
		ELSE NULL
	  END`;

		const endDateAsDate = sql`CASE 
		WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY-MM-DD')
		WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY-MM')
		WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY')
		ELSE NULL
	  END`;

		disasterConditions.push(
			sql`(${startDateAsDate} IS NULL OR ${startDateAsDate} <= ${to}::date) AND (${endDateAsDate} IS NULL OR ${endDateAsDate} >= ${from}::date)`
		);
	}

	const humanDsgBaseConditions = and(
		isNull(humanDsgTable.age),
		isNull(humanDsgTable.disability),
		isNull(humanDsgTable.globalPovertyLine),
		isNull(humanDsgTable.nationalPovertyLine),
		sql`${humanDsgTable.custom} = '{}'::jsonb`
	);

	// Sum each column with COALESCE individually
	const totalSql = sql<number>`(
	  COALESCE(${deathsTable.deaths}, 0) + 
	  COALESCE(${missingTable.missing}, 0) + 
	  COALESCE(${affectedTable.direct}, 0) + 
	  COALESCE(${affectedTable.indirect}, 0) + 
	  COALESCE(${injuredTable.injured}, 0) + 
	  COALESCE(${displacedTable.displaced}, 0)
	)`;

	const query = dr
		.select({
			totalMen:
				sql<number>`COALESCE(SUM(CASE WHEN ${humanDsgTable.sex} = 'm' THEN ${totalSql} ELSE 0 END), 0)`.as(
					"total_men"
				),
			totalWomen:
				sql<number>`COALESCE(SUM(CASE WHEN ${humanDsgTable.sex} = 'f' THEN ${totalSql} ELSE 0 END), 0)`.as(
					"total_women"
				),
			totalNonBinary:
				sql<number>`COALESCE(SUM(CASE WHEN ${humanDsgTable.sex} = 'o' THEN ${totalSql} ELSE 0 END), 0)`.as(
					"total_non_binary"
				),
		})
		.from(disasterRecordsTable)
		.leftJoin(
			humanDsgTable,
			eq(disasterRecordsTable.id, humanDsgTable.recordId)
		)
		.leftJoin(deathsTable, eq(humanDsgTable.id, deathsTable.dsgId))
		.leftJoin(missingTable, eq(humanDsgTable.id, missingTable.dsgId))
		.leftJoin(affectedTable, eq(humanDsgTable.id, affectedTable.dsgId))
		.leftJoin(injuredTable, eq(humanDsgTable.id, injuredTable.dsgId))
		.leftJoin(displacedTable, eq(humanDsgTable.id, displacedTable.dsgId))
		.where(and(...disasterConditions, humanDsgBaseConditions));

	const result = await query.execute();

	return {
		totalMen: result[0].totalMen,
		totalWomen: result[0].totalWomen,
		totalNonBinary: result[0].totalNonBinary,
	};
}

interface AgeTotals {
	totalChildren: number;
	totalAdults: number;
	totalSeniors: number;
}

export async function getAgeTotalsByHazardFilters(
	filters: HazardFilters
): Promise<AgeTotals> {
	const {
		hazardTypeId,
		hazardClusterId,
		specificHazardId,
		fromDate,
		toDate,
		geographicLevelId,
	} = filters;

	const disasterConditions = [];

	disasterConditions.push(eq(disasterRecordsTable.approvalStatus, "published"));

	if (hazardTypeId) {
		disasterConditions.push(eq(disasterRecordsTable.hipTypeId, hazardTypeId));
	}
	if (hazardClusterId) {
		disasterConditions.push(
			eq(disasterRecordsTable.hipClusterId, hazardClusterId)
		);
	}
	if (specificHazardId) {
		disasterConditions.push(
			eq(disasterRecordsTable.hipHazardId, specificHazardId)
		);
	}
	if (geographicLevelId) {
		disasterConditions.push(
			sql`EXISTS (
		  SELECT 1
		  FROM jsonb_array_elements(${disasterRecordsTable.spatialFootprint}) AS elem
		  WHERE (elem->'geojson'->'properties'->>'division_id') = ${geographicLevelId}
		)`
		);
	}

	if (fromDate || toDate) {
		const from = fromDate || "0001-01-01";
		const to = toDate || "9999-12-31";

		const startDateAsDate = sql`CASE 
		WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM-DD')
		WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM')
		WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY')
		ELSE NULL
	  END`;

		const endDateAsDate = sql`CASE 
		WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY-MM-DD')
		WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY-MM')
		WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY')
		ELSE NULL
	  END`;

		disasterConditions.push(
			sql`(${startDateAsDate} IS NULL OR ${startDateAsDate} <= ${to}::date) AND (${endDateAsDate} IS NULL OR ${endDateAsDate} >= ${from}::date)`
		);
	}

	// Base conditions now exclude age from being NULL, since we want specific ranges
	const humanDsgBaseConditions = and(
		isNull(humanDsgTable.disability),
		isNull(humanDsgTable.globalPovertyLine),
		isNull(humanDsgTable.nationalPovertyLine),
		sql`${humanDsgTable.custom} = '{}'::jsonb`
	);

	const totalSql = sql<number>`(
	  COALESCE(${deathsTable.deaths}, 0) + 
	  COALESCE(${missingTable.missing}, 0) + 
	  COALESCE(${affectedTable.direct}, 0) + 
	  COALESCE(${affectedTable.indirect}, 0) + 
	  COALESCE(${injuredTable.injured}, 0) + 
	  COALESCE(${displacedTable.displaced}, 0)
	)`;

	const query = dr
		.select({
			totalChildren:
				sql<number>`COALESCE(SUM(CASE WHEN ${humanDsgTable.age} = '0-14' THEN ${totalSql} ELSE 0 END), 0)`.as(
					"total_children"
				),
			totalAdults:
				sql<number>`COALESCE(SUM(CASE WHEN ${humanDsgTable.age} = '15-64' THEN ${totalSql} ELSE 0 END), 0)`.as(
					"total_adults"
				),
			totalSeniors:
				sql<number>`COALESCE(SUM(CASE WHEN ${humanDsgTable.age} = '65+' THEN ${totalSql} ELSE 0 END), 0)`.as(
					"total_seniors"
				),
		})
		.from(disasterRecordsTable)
		.leftJoin(
			humanDsgTable,
			eq(disasterRecordsTable.id, humanDsgTable.recordId)
		)
		.leftJoin(deathsTable, eq(humanDsgTable.id, deathsTable.dsgId))
		.leftJoin(missingTable, eq(humanDsgTable.id, missingTable.dsgId))
		.leftJoin(affectedTable, eq(humanDsgTable.id, affectedTable.dsgId))
		.leftJoin(injuredTable, eq(humanDsgTable.id, injuredTable.dsgId))
		.leftJoin(displacedTable, eq(humanDsgTable.id, displacedTable.dsgId))
		.where(and(...disasterConditions, humanDsgBaseConditions));

	const result = await query.execute();

	return {
		totalChildren: result[0].totalChildren,
		totalAdults: result[0].totalAdults,
		totalSeniors: result[0].totalSeniors,
	};
}

export async function getDisabilityTotalByHazardFilters(
	filters: HazardFilters
): Promise<number> {
	const {
		hazardTypeId,
		hazardClusterId,
		specificHazardId,
		fromDate,
		toDate,
		geographicLevelId,
	} = filters;

	const disasterConditions = [];

	disasterConditions.push(eq(disasterRecordsTable.approvalStatus, "published"));

	if (hazardTypeId) {
		disasterConditions.push(eq(disasterRecordsTable.hipTypeId, hazardTypeId));
	}
	if (hazardClusterId) {
		disasterConditions.push(
			eq(disasterRecordsTable.hipClusterId, hazardClusterId)
		);
	}
	if (specificHazardId) {
		disasterConditions.push(
			eq(disasterRecordsTable.hipHazardId, specificHazardId)
		);
	}
	if (geographicLevelId) {
		disasterConditions.push(
			sql`EXISTS (
		  SELECT 1
		  FROM jsonb_array_elements(${disasterRecordsTable.spatialFootprint}) AS elem
		  WHERE (elem->'geojson'->'properties'->>'division_id') = ${geographicLevelId}
		)`
		);
	}

	if (fromDate || toDate) {
		const from = fromDate || "0001-01-01";
		const to = toDate || "9999-12-31";

		const startDateAsDate = sql`CASE 
		WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM-DD')
		WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM')
		WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY')
		ELSE NULL
	  END`;

		const endDateAsDate = sql`CASE 
		WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY-MM-DD')
		WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY-MM')
		WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY')
		ELSE NULL
	  END`;

		disasterConditions.push(
			sql`(${startDateAsDate} IS NULL OR ${startDateAsDate} <= ${to}::date) AND (${endDateAsDate} IS NULL OR ${endDateAsDate} >= ${from}::date)`
		);
	}

	// Base conditions: Exclude disability = NULL or "none"
	const humanDsgBaseConditions = and(
		isNull(humanDsgTable.age),
		isNull(humanDsgTable.globalPovertyLine),
		isNull(humanDsgTable.nationalPovertyLine),
		sql`${humanDsgTable.custom} = '{}'::jsonb`,
		sql`${humanDsgTable.disability} IS NOT NULL`, // Exclude NULL
		ne(humanDsgTable.disability, "none") // Exclude "none"
	);

	const totalSql = sql<number>`(
	  COALESCE(${deathsTable.deaths}, 0) + 
	  COALESCE(${missingTable.missing}, 0) + 
	  COALESCE(${affectedTable.direct}, 0) + 
	  COALESCE(${affectedTable.indirect}, 0) + 
	  COALESCE(${injuredTable.injured}, 0) + 
	  COALESCE(${displacedTable.displaced}, 0)
	)`;

	const query = dr
		.select({
			totalDisability: sql<number>`COALESCE(SUM(${totalSql}), 0)`.as(
				"total_disability"
			),
		})
		.from(disasterRecordsTable)
		.leftJoin(
			humanDsgTable,
			eq(disasterRecordsTable.id, humanDsgTable.recordId)
		)
		.leftJoin(deathsTable, eq(humanDsgTable.id, deathsTable.dsgId))
		.leftJoin(missingTable, eq(humanDsgTable.id, missingTable.dsgId))
		.leftJoin(affectedTable, eq(humanDsgTable.id, affectedTable.dsgId))
		.leftJoin(injuredTable, eq(humanDsgTable.id, injuredTable.dsgId))
		.leftJoin(displacedTable, eq(humanDsgTable.id, displacedTable.dsgId))
		.where(and(...disasterConditions, humanDsgBaseConditions));

	const result = await query.execute();

	return result[0].totalDisability;
}

export async function getInternationalPovertyTotalByHazardFilters(
	filters: HazardFilters
): Promise<number> {
	const {
		hazardTypeId,
		hazardClusterId,
		specificHazardId,
		fromDate,
		toDate,
		geographicLevelId,
	} = filters;

	const disasterConditions = [];

	disasterConditions.push(eq(disasterRecordsTable.approvalStatus, "published"));

	if (hazardTypeId) {
		disasterConditions.push(eq(disasterRecordsTable.hipTypeId, hazardTypeId));
	}
	if (hazardClusterId) {
		disasterConditions.push(
			eq(disasterRecordsTable.hipClusterId, hazardClusterId)
		);
	}
	if (specificHazardId) {
		disasterConditions.push(
			eq(disasterRecordsTable.hipHazardId, specificHazardId)
		);
	}
	if (geographicLevelId) {
		disasterConditions.push(
			sql`EXISTS (
		  SELECT 1
		  FROM jsonb_array_elements(${disasterRecordsTable.spatialFootprint}) AS elem
		  WHERE (elem->'geojson'->'properties'->>'division_id') = ${geographicLevelId}
		)`
		);
	}

	if (fromDate || toDate) {
		const from = fromDate || "0001-01-01";
		const to = toDate || "9999-12-31";

		const startDateAsDate = sql`CASE 
		WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM-DD')
		WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM')
		WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY')
		ELSE NULL
	  END`;

		const endDateAsDate = sql`CASE 
		WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY-MM-DD')
		WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY-MM')
		WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY')
		ELSE NULL
	  END`;

		disasterConditions.push(
			sql`(${startDateAsDate} IS NULL OR ${startDateAsDate} <= ${to}::date) AND (${endDateAsDate} IS NULL OR ${endDateAsDate} >= ${from}::date)`
		);
	}

	// Base conditions: Only count where global_poverty_line = "above"
	const humanDsgBaseConditions = and(
		isNull(humanDsgTable.age),
		isNull(humanDsgTable.disability),
		isNull(humanDsgTable.nationalPovertyLine),
		sql`${humanDsgTable.custom} = '{}'::jsonb`,
		eq(humanDsgTable.globalPovertyLine, "above") // Only "above" counts
	);

	const totalSql = sql<number>`(
	  COALESCE(${deathsTable.deaths}, 0) + 
	  COALESCE(${missingTable.missing}, 0) + 
	  COALESCE(${affectedTable.direct}, 0) + 
	  COALESCE(${affectedTable.indirect}, 0) + 
	  COALESCE(${injuredTable.injured}, 0) + 
	  COALESCE(${displacedTable.displaced}, 0)
	)`;

	const query = dr
		.select({
			totalPoverty: sql<number>`COALESCE(SUM(${totalSql}), 0)`.as(
				"total_poverty"
			),
		})
		.from(disasterRecordsTable)
		.leftJoin(
			humanDsgTable,
			eq(disasterRecordsTable.id, humanDsgTable.recordId)
		)
		.leftJoin(deathsTable, eq(humanDsgTable.id, deathsTable.dsgId))
		.leftJoin(missingTable, eq(humanDsgTable.id, missingTable.dsgId))
		.leftJoin(affectedTable, eq(humanDsgTable.id, affectedTable.dsgId))
		.leftJoin(injuredTable, eq(humanDsgTable.id, injuredTable.dsgId))
		.leftJoin(displacedTable, eq(humanDsgTable.id, displacedTable.dsgId))
		.where(and(...disasterConditions, humanDsgBaseConditions));

	const result = await query.execute();

	return result[0].totalPoverty;
}

export async function getNationalPovertyTotalByHazardFilters(
	filters: HazardFilters
): Promise<number> {
	const {
		hazardTypeId,
		hazardClusterId,
		specificHazardId,
		fromDate,
		toDate,
		geographicLevelId,
	} = filters;

	const disasterConditions = [];

	disasterConditions.push(eq(disasterRecordsTable.approvalStatus, "published"));

	if (hazardTypeId) {
		disasterConditions.push(eq(disasterRecordsTable.hipTypeId, hazardTypeId));
	}
	if (hazardClusterId) {
		disasterConditions.push(
			eq(disasterRecordsTable.hipClusterId, hazardClusterId)
		);
	}
	if (specificHazardId) {
		disasterConditions.push(
			eq(disasterRecordsTable.hipHazardId, specificHazardId)
		);
	}
	if (geographicLevelId) {
		disasterConditions.push(
			sql`EXISTS (
		  SELECT 1
		  FROM jsonb_array_elements(${disasterRecordsTable.spatialFootprint}) AS elem
		  WHERE (elem->'geojson'->'properties'->>'division_id') = ${geographicLevelId}
		)`
		);
	}

	if (fromDate || toDate) {
		const from = fromDate || "0001-01-01";
		const to = toDate || "9999-12-31";

		const startDateAsDate = sql`CASE 
		WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM-DD')
		WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM')
		WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY')
		ELSE NULL
	  END`;

		const endDateAsDate = sql`CASE 
		WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY-MM-DD')
		WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY-MM')
		WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY')
		ELSE NULL
	  END`;

		disasterConditions.push(
			sql`(${startDateAsDate} IS NULL OR ${startDateAsDate} <= ${to}::date) AND (${endDateAsDate} IS NULL OR ${endDateAsDate} >= ${from}::date)`
		);
	}

	// Base conditions: Only count where national_poverty_line = "above"
	const humanDsgBaseConditions = and(
		isNull(humanDsgTable.age),
		isNull(humanDsgTable.disability),
		isNull(humanDsgTable.globalPovertyLine),
		sql`${humanDsgTable.custom} = '{}'::jsonb`,
		eq(humanDsgTable.nationalPovertyLine, "above") // Only "above" counts
	);

	const totalSql = sql<number>`(
	  COALESCE(${deathsTable.deaths}, 0) + 
	  COALESCE(${missingTable.missing}, 0) + 
	  COALESCE(${affectedTable.direct}, 0) + 
	  COALESCE(${affectedTable.indirect}, 0) + 
	  COALESCE(${injuredTable.injured}, 0) + 
	  COALESCE(${displacedTable.displaced}, 0)
	)`;

	const query = dr
		.select({
			totalPoverty: sql<number>`COALESCE(SUM(${totalSql}), 0)`.as(
				"total_poverty"
			),
		})
		.from(disasterRecordsTable)
		.leftJoin(
			humanDsgTable,
			eq(disasterRecordsTable.id, humanDsgTable.recordId)
		)
		.leftJoin(deathsTable, eq(humanDsgTable.id, deathsTable.dsgId))
		.leftJoin(missingTable, eq(humanDsgTable.id, missingTable.dsgId))
		.leftJoin(affectedTable, eq(humanDsgTable.id, affectedTable.dsgId))
		.leftJoin(injuredTable, eq(humanDsgTable.id, injuredTable.dsgId))
		.leftJoin(displacedTable, eq(humanDsgTable.id, displacedTable.dsgId))
		.where(and(...disasterConditions, humanDsgBaseConditions));

	const result = await query.execute();

	return result[0].totalPoverty;
}

export async function getTotalDamagesByHazardFilters(
	filters: HazardFilters
): Promise<number> {
	const {
		hazardTypeId,
		hazardClusterId,
		specificHazardId,
		fromDate,
		toDate,
		geographicLevelId,
	} = filters;

	const disasterConditions = [];

	disasterConditions.push(eq(disasterRecordsTable.approvalStatus, "published"));

	if (hazardTypeId) {
		disasterConditions.push(eq(disasterRecordsTable.hipTypeId, hazardTypeId));
	}
	if (hazardClusterId) {
		disasterConditions.push(
			eq(disasterRecordsTable.hipClusterId, hazardClusterId)
		);
	}
	if (specificHazardId) {
		disasterConditions.push(
			eq(disasterRecordsTable.hipHazardId, specificHazardId)
		);
	}
	if (geographicLevelId) {
		disasterConditions.push(
			sql`EXISTS (
		  SELECT 1
		  FROM jsonb_array_elements(${disasterRecordsTable.spatialFootprint}) AS elem
		  WHERE (elem->'geojson'->'properties'->>'division_id') = ${geographicLevelId}
		)`
		);
	}

	if (fromDate || toDate) {
		const from = fromDate || "0001-01-01";
		const to = toDate || "9999-12-31";

		const startDateAsDate = sql`CASE 
		WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM-DD')
		WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM')
		WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY')
		ELSE NULL
	  END`;

		const endDateAsDate = sql`CASE 
		WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY-MM-DD')
		WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY-MM')
		WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY')
		ELSE NULL
	  END`;

		disasterConditions.push(
			sql`(${startDateAsDate} IS NULL OR ${startDateAsDate} <= ${to}::date) AND (${endDateAsDate} IS NULL OR ${endDateAsDate} >= ${from}::date)`
		);
	}

	const query = dr
		.select({
			totalDamages:
				sql<number>`COALESCE(SUM(${sectorDisasterRecordsRelationTable.damageCost}), 0)`.as(
					"total_damages"
				),
		})
		.from(disasterRecordsTable)
		.leftJoin(
			sectorDisasterRecordsRelationTable,
			eq(
				disasterRecordsTable.id,
				sectorDisasterRecordsRelationTable.disasterRecordId
			)
		)
		.where(and(...disasterConditions));

	const result = await query.execute();

	return result[0].totalDamages;
}

export async function getTotalLossesByHazardFilters(
	filters: HazardFilters
): Promise<number> {
	const {
		hazardTypeId,
		hazardClusterId,
		specificHazardId,
		fromDate,
		toDate,
		geographicLevelId,
	} = filters;

	const disasterConditions = [];

	disasterConditions.push(eq(disasterRecordsTable.approvalStatus, "published"));

	if (hazardTypeId) {
		disasterConditions.push(eq(disasterRecordsTable.hipTypeId, hazardTypeId));
	}
	if (hazardClusterId) {
		disasterConditions.push(
			eq(disasterRecordsTable.hipClusterId, hazardClusterId)
		);
	}
	if (specificHazardId) {
		disasterConditions.push(
			eq(disasterRecordsTable.hipHazardId, specificHazardId)
		);
	}
	if (geographicLevelId) {
		disasterConditions.push(
			sql`EXISTS (
		  SELECT 1
		  FROM jsonb_array_elements(${disasterRecordsTable.spatialFootprint}) AS elem
		  WHERE (elem->'geojson'->'properties'->>'division_id') = ${geographicLevelId}
		)`
		);
	}

	if (fromDate || toDate) {
		const from = fromDate || "0001-01-01";
		const to = toDate || "9999-12-31";

		const startDateAsDate = sql`CASE 
		WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM-DD')
		WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM')
		WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY')
		ELSE NULL
	  END`;

		const endDateAsDate = sql`CASE 
		WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY-MM-DD')
		WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY-MM')
		WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY')
		ELSE NULL
	  END`;

		disasterConditions.push(
			sql`(${startDateAsDate} IS NULL OR ${startDateAsDate} <= ${to}::date) AND (${endDateAsDate} IS NULL OR ${endDateAsDate} >= ${from}::date)`
		);
	}

	const query = dr
		.select({
			totalLosses:
				sql<number>`COALESCE(SUM(${sectorDisasterRecordsRelationTable.lossesCost}), 0)`.as(
					"total_losses"
				),
		})
		.from(disasterRecordsTable)
		.leftJoin(
			sectorDisasterRecordsRelationTable,
			eq(
				disasterRecordsTable.id,
				sectorDisasterRecordsRelationTable.disasterRecordId
			)
		)
		.where(and(...disasterConditions));

	const result = await query.execute();

	return result[0].totalLosses;
}

export interface DamageByYear {
	year: number; // Changed to number
	totalDamages: number;
}

export async function getTotalDamagesByYear(
	filters: HazardFilters
): Promise<DamageByYear[]> {
	const {
		hazardTypeId,
		hazardClusterId,
		specificHazardId,
		fromDate,
		toDate,
		geographicLevelId,
	} = filters;

	const disasterConditions = [];

	disasterConditions.push(eq(disasterRecordsTable.approvalStatus, "published"));

	if (hazardTypeId) {
		disasterConditions.push(eq(disasterRecordsTable.hipTypeId, hazardTypeId));
	}
	if (hazardClusterId) {
		disasterConditions.push(
			eq(disasterRecordsTable.hipClusterId, hazardClusterId)
		);
	}
	if (specificHazardId) {
		disasterConditions.push(
			eq(disasterRecordsTable.hipHazardId, specificHazardId)
		);
	}
	if (geographicLevelId) {
		disasterConditions.push(
			sql`EXISTS (
		  SELECT 1
		  FROM jsonb_array_elements(${disasterRecordsTable.spatialFootprint}) AS elem
		  WHERE (elem->'geojson'->'properties'->>'division_id') = ${geographicLevelId}
		)`
		);
	}

	if (fromDate || toDate) {
		const from = fromDate || "0001-01-01";
		const to = toDate || "9999-12-31";

		const startDateAsDate = sql`CASE 
		WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM-DD')
		WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM')
		WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY')
		ELSE NULL
	  END`;

		const endDateAsDate = sql`CASE 
		WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY-MM-DD')
		WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY-MM')
		WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY')
		ELSE NULL
	  END`;

		disasterConditions.push(
			sql`(${startDateAsDate} IS NULL OR ${startDateAsDate} <= ${to}::date) AND (${endDateAsDate} IS NULL OR ${endDateAsDate} >= ${from}::date)`
		);
	}

	const yearSql = sql<number>`COALESCE(EXTRACT(YEAR FROM CASE 
	  WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM-DD')
	  WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM')
	  WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY')
	  ELSE NULL
	END)::integer, -1)`;

	const query = dr
		.select({
			year: yearSql.as("year"),
			totalDamages:
				sql<number>`COALESCE(SUM(${sectorDisasterRecordsRelationTable.damageCost}), 0)`.as(
					"total_damages"
				),
		})
		.from(disasterRecordsTable)
		.leftJoin(
			sectorDisasterRecordsRelationTable,
			eq(
				disasterRecordsTable.id,
				sectorDisasterRecordsRelationTable.disasterRecordId
			)
		)
		.where(and(...disasterConditions))
		.groupBy(yearSql);

	const result = await query.execute();

	return result.map((row) => ({
		year: row.year,
		totalDamages: Number(row.totalDamages),
	}));
}

export interface LossByYear {
	year: number;
	totalLosses: number;
}

export async function getTotalLossesByYear(
	filters: HazardFilters
): Promise<LossByYear[]> {
	const {
		hazardTypeId,
		hazardClusterId,
		specificHazardId,
		fromDate,
		toDate,
		geographicLevelId,
	} = filters;

	const disasterConditions = [];

	disasterConditions.push(eq(disasterRecordsTable.approvalStatus, "published"));

	if (hazardTypeId) {
		disasterConditions.push(eq(disasterRecordsTable.hipTypeId, hazardTypeId));
	}
	if (hazardClusterId) {
		disasterConditions.push(
			eq(disasterRecordsTable.hipClusterId, hazardClusterId)
		);
	}
	if (specificHazardId) {
		disasterConditions.push(
			eq(disasterRecordsTable.hipHazardId, specificHazardId)
		);
	}
	if (geographicLevelId) {
		disasterConditions.push(
			sql`EXISTS (
		  SELECT 1
		  FROM jsonb_array_elements(${disasterRecordsTable.spatialFootprint}) AS elem
		  WHERE (elem->'geojson'->'properties'->>'division_id') = ${geographicLevelId}
		)`
		);
	}

	if (fromDate || toDate) {
		const from = fromDate || "0001-01-01";
		const to = toDate || "9999-12-31";

		const startDateAsDate = sql`CASE 
		WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM-DD')
		WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM')
		WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY')
		ELSE NULL
	  END`;

		const endDateAsDate = sql`CASE 
		WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY-MM-DD')
		WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY-MM')
		WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY')
		ELSE NULL
	  END`;

		disasterConditions.push(
			sql`(${startDateAsDate} IS NULL OR ${startDateAsDate} <= ${to}::date) AND (${endDateAsDate} IS NULL OR ${endDateAsDate} >= ${from}::date)`
		);
	}

	// Exclude invalid/empty start_date
	disasterConditions.push(
		sql`CASE 
		WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM-DD')
		WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM')
		WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY')
		ELSE NULL
	  END IS NOT NULL`
	);

	const yearSql = sql<number>`EXTRACT(YEAR FROM CASE 
	  WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM-DD')
	  WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM')
	  WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY')
	  ELSE NULL
	END)::integer`;

	const query = dr
		.select({
			year: yearSql.as("year"),
			totalLosses:
				sql<number>`COALESCE(SUM(${sectorDisasterRecordsRelationTable.lossesCost}), 0)`.as(
					"total_losses"
				),
		})
		.from(disasterRecordsTable)
		.leftJoin(
			sectorDisasterRecordsRelationTable,
			eq(
				disasterRecordsTable.id,
				sectorDisasterRecordsRelationTable.disasterRecordId
			)
		)
		.where(and(...disasterConditions))
		.groupBy(yearSql)
		.orderBy(yearSql); // Sort by year for line chart

	const result = await query.execute();

	return result.map((row) => ({
		year: row.year,
		totalLosses: Number(row.totalLosses),
	}));
}

interface DamageByDivision {
	divisionId: string;
	totalDamages: number;
}

export async function getTotalDamagesByDivision(
	filters: HazardFilters
): Promise<DamageByDivision[]> {
	const {
		hazardTypeId,
		hazardClusterId,
		specificHazardId,
		geographicLevelId,
		fromDate,
		toDate,
	} = filters;

	// Subquery to unnest spatial_footprint and extract division_id
	const damagesByDivisionSubquery = dr
		.select({
			id: disasterRecordsTable.id,
			divisionId:
				sql<string>`jsonb_array_elements(${disasterRecordsTable.spatialFootprint})->'geojson'->'properties'->>'division_id'`.as(
					"division_id"
				),
		})
		.from(disasterRecordsTable)
		.where(
			and(
				eq(disasterRecordsTable.approvalStatus, "published"),
				hazardTypeId
					? eq(disasterRecordsTable.hipTypeId, hazardTypeId)
					: undefined,
				hazardClusterId
					? eq(disasterRecordsTable.hipClusterId, hazardClusterId)
					: undefined,
				specificHazardId
					? eq(disasterRecordsTable.hipHazardId, specificHazardId)
					: undefined,
				geographicLevelId
					? sql`EXISTS (
				SELECT 1
				FROM jsonb_array_elements(${disasterRecordsTable.spatialFootprint}) AS elem
				WHERE (elem->'geojson'->'properties'->>'division_id') = ${geographicLevelId}
			  )`
					: undefined,
				fromDate || toDate
					? sql`(
				CASE 
				  WHEN ${
						disasterRecordsTable.startDate
					} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${
							disasterRecordsTable.startDate
					  }, 'YYYY-MM-DD')
				  WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${
							disasterRecordsTable.startDate
					  }, 'YYYY-MM')
				  WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}$' THEN TO_DATE(${
							disasterRecordsTable.startDate
					  }, 'YYYY')
				  ELSE NULL
				END IS NULL OR 
				CASE 
				  WHEN ${
						disasterRecordsTable.startDate
					} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${
							disasterRecordsTable.startDate
					  }, 'YYYY-MM-DD')
				  WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${
							disasterRecordsTable.startDate
					  }, 'YYYY-MM')
				  WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}$' THEN TO_DATE(${
							disasterRecordsTable.startDate
					  }, 'YYYY')
				  ELSE NULL
				END <= ${toDate || "9999-12-31"}::date
			  ) AND (
				CASE 
				  WHEN ${
						disasterRecordsTable.endDate
					} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${
							disasterRecordsTable.endDate
					  }, 'YYYY-MM-DD')
				  WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${
							disasterRecordsTable.endDate
					  }, 'YYYY-MM')
				  WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}$' THEN TO_DATE(${
							disasterRecordsTable.endDate
					  }, 'YYYY')
				  ELSE NULL
				END IS NULL OR 
				CASE 
				  WHEN ${
						disasterRecordsTable.endDate
					} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${
							disasterRecordsTable.endDate
					  }, 'YYYY-MM-DD')
				  WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${
							disasterRecordsTable.endDate
					  }, 'YYYY-MM')
				  WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}$' THEN TO_DATE(${
							disasterRecordsTable.endDate
					  }, 'YYYY')
				  ELSE NULL
				END >= ${fromDate || "0001-01-01"}::date
			  )`
					: undefined
			)
		)
		.as("damages_subquery");

	const damagesByDivisionQuery = dr
		.select({
			divisionId: sql<string>`damages_subquery.division_id`,
			totalDamages:
				sql<number>`COALESCE(SUM(${sectorDisasterRecordsRelationTable.damageCost}), 0)`.as(
					"total_damages"
				),
		})
		.from(damagesByDivisionSubquery)
		.leftJoin(
			sectorDisasterRecordsRelationTable,
			eq(
				damagesByDivisionSubquery.id,
				sectorDisasterRecordsRelationTable.disasterRecordId
			)
		)
		.where(sql`damages_subquery.division_id IS NOT NULL`)
		.groupBy(sql`damages_subquery.division_id`);

	const result = await damagesByDivisionQuery.execute();

	return result;
}

interface LossByDivision {
	divisionId: string;
	totalLosses: number;
}

export async function getTotalLossesByDivision(
	filters: HazardFilters
): Promise<LossByDivision[]> {
	const {
		hazardTypeId,
		hazardClusterId,
		specificHazardId,
		geographicLevelId,
		fromDate,
		toDate,
	} = filters;

	// Subquery to unnest spatial_footprint and extract division_id
	const lossesByDivisionSubquery = dr
		.select({
			id: disasterRecordsTable.id,
			divisionId:
				sql<string>`jsonb_array_elements(${disasterRecordsTable.spatialFootprint})->'geojson'->'properties'->>'division_id'`.as(
					"division_id"
				),
		})
		.from(disasterRecordsTable)
		.where(
			and(
				eq(disasterRecordsTable.approvalStatus, "published"),
				hazardTypeId
					? eq(disasterRecordsTable.hipTypeId, hazardTypeId)
					: undefined,
				hazardClusterId
					? eq(disasterRecordsTable.hipClusterId, hazardClusterId)
					: undefined,
				specificHazardId
					? eq(disasterRecordsTable.hipHazardId, specificHazardId)
					: undefined,
				geographicLevelId
					? sql`EXISTS (
				SELECT 1
				FROM jsonb_array_elements(${disasterRecordsTable.spatialFootprint}) AS elem
				WHERE (elem->'geojson'->'properties'->>'division_id') = ${geographicLevelId}
			  )`
					: undefined,
				fromDate || toDate
					? sql`(
				CASE 
				  WHEN ${
						disasterRecordsTable.startDate
					} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${
							disasterRecordsTable.startDate
					  }, 'YYYY-MM-DD')
				  WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${
							disasterRecordsTable.startDate
					  }, 'YYYY-MM')
				  WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}$' THEN TO_DATE(${
							disasterRecordsTable.startDate
					  }, 'YYYY')
				  ELSE NULL
				END IS NULL OR 
				CASE 
				  WHEN ${
						disasterRecordsTable.startDate
					} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${
							disasterRecordsTable.startDate
					  }, 'YYYY-MM-DD')
				  WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${
							disasterRecordsTable.startDate
					  }, 'YYYY-MM')
				  WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}$' THEN TO_DATE(${
							disasterRecordsTable.startDate
					  }, 'YYYY')
				  ELSE NULL
				END <= ${toDate || "9999-12-31"}::date
			  ) AND (
				CASE 
				  WHEN ${
						disasterRecordsTable.endDate
					} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${
							disasterRecordsTable.endDate
					  }, 'YYYY-MM-DD')
				  WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${
							disasterRecordsTable.endDate
					  }, 'YYYY-MM')
				  WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}$' THEN TO_DATE(${
							disasterRecordsTable.endDate
					  }, 'YYYY')
				  ELSE NULL
				END IS NULL OR 
				CASE 
				  WHEN ${
						disasterRecordsTable.endDate
					} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${
							disasterRecordsTable.endDate
					  }, 'YYYY-MM-DD')
				  WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${
							disasterRecordsTable.endDate
					  }, 'YYYY-MM')
				  WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}$' THEN TO_DATE(${
							disasterRecordsTable.endDate
					  }, 'YYYY')
				  ELSE NULL
				END >= ${fromDate || "0001-01-01"}::date
			  )`
					: undefined
			)
		)
		.as("losses_subquery");

	const lossesByDivisionQuery = dr
		.select({
			divisionId: sql<string>`losses_subquery.division_id`,
			totalLosses:
				sql<number>`COALESCE(SUM(${sectorDisasterRecordsRelationTable.lossesCost}), 0)`.as(
					"total_losses"
				), // Changed to losses_cost
		})
		.from(lossesByDivisionSubquery)
		.leftJoin(
			sectorDisasterRecordsRelationTable,
			eq(
				lossesByDivisionSubquery.id,
				sectorDisasterRecordsRelationTable.disasterRecordId
			)
		)
		.where(sql`losses_subquery.division_id IS NOT NULL`)
		.groupBy(sql`losses_subquery.division_id`);

	const result = await lossesByDivisionQuery.execute();

	return result;
}

interface DeathsByDivision {
	divisionId: string;
	totalDeaths: number;
}

export async function getTotalDeathsByDivision(
	filters: HazardFilters
): Promise<DeathsByDivision[]> {
	const {
		hazardTypeId,
		hazardClusterId,
		specificHazardId,
		geographicLevelId,
		fromDate,
		toDate,
	} = filters;

	// Build WHERE conditions dynamically
	const conditions = [];

	conditions.push(eq(disasterRecordsTable.approvalStatus, "published"))

	if (hazardTypeId) {
		conditions.push(eq(disasterRecordsTable.hipTypeId, hazardTypeId));
	}
	if (hazardClusterId) {
		conditions.push(eq(disasterRecordsTable.hipClusterId, hazardClusterId));
	}
	if (specificHazardId) {
		conditions.push(eq(disasterRecordsTable.hipHazardId, specificHazardId));
	}
	if (geographicLevelId) {
		conditions.push(
			sql`EXISTS (
		  SELECT 1
		  FROM jsonb_array_elements(${disasterRecordsTable.spatialFootprint}) AS elem
		  WHERE (elem->'geojson'->'properties'->>'division_id') = ${geographicLevelId}
		)`
		);
	}
	if (fromDate || toDate) {
		const from = fromDate || "0001-01-01";
		const to = toDate || "9999-12-31";

		const startDateAsDate = sql`CASE 
		WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM-DD')
		WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM')
		WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY')
		ELSE NULL
	  END`;

		const endDateAsDate = sql`CASE 
		WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY-MM-DD')
		WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY-MM')
		WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY')
		ELSE NULL
	  END`;

		conditions.push(
			sql`(${startDateAsDate} IS NULL OR ${startDateAsDate} <= ${to}::date) AND (${endDateAsDate} IS NULL OR ${endDateAsDate} >= ${from}::date)`
		);
	}

	// Conditions for human_dsg: all specified fields are NULL and custom is {}
	const humanDsgConditions = and(
		isNull(humanDsgTable.sex),
		isNull(humanDsgTable.age),
		isNull(humanDsgTable.disability),
		isNull(humanDsgTable.globalPovertyLine),
		isNull(humanDsgTable.nationalPovertyLine),
		sql`${humanDsgTable.custom} = '{}'::jsonb`
	);

	// Subquery to unnest spatial_footprint and join with deaths
	const deathsByDivisionSubquery = dr
		.select({
			id: disasterRecordsTable.id,
			divisionId:
				sql<string>`jsonb_array_elements(${disasterRecordsTable.spatialFootprint})->'geojson'->'properties'->>'division_id'`.as(
					"division_id"
				),
			deaths: deathsTable.deaths,
		})
		.from(disasterRecordsTable)
		.leftJoin(
			humanDsgTable,
			eq(disasterRecordsTable.id, humanDsgTable.recordId)
		)
		.leftJoin(deathsTable, eq(humanDsgTable.id, deathsTable.dsgId))
		.where(and(...conditions, humanDsgConditions))
		.as("deaths_subquery");

	const deathsByDivisionQuery = dr
		.select({
			divisionId: sql<string>`deaths_subquery.division_id`,
			totalDeaths: sql<number>`COALESCE(SUM(deaths_subquery.deaths), 0)`.as(
				"total_deaths"
			),
		})
		.from(deathsByDivisionSubquery)
		.where(sql`deaths_subquery.division_id IS NOT NULL`)
		.groupBy(sql`deaths_subquery.division_id`);

	const result = await deathsByDivisionQuery.execute();

	return result;
}

interface AffectedPeopleByDivision {
	divisionId: string;
	totalAffected: number;
}

export async function getTotalAffectedPeopleByDivision(
	filters: HazardFilters
): Promise<AffectedPeopleByDivision[]> {
	const {
		hazardTypeId,
		hazardClusterId,
		specificHazardId,
		geographicLevelId,
		fromDate,
		toDate,
	} = filters;

	// Build WHERE conditions dynamically
	const conditions = [];

	conditions.push(eq(disasterRecordsTable.approvalStatus,"published"))

	if (hazardTypeId) {
		conditions.push(eq(disasterRecordsTable.hipTypeId, hazardTypeId));
	}
	if (hazardClusterId) {
		conditions.push(eq(disasterRecordsTable.hipClusterId, hazardClusterId));
	}
	if (specificHazardId) {
		conditions.push(eq(disasterRecordsTable.hipHazardId, specificHazardId));
	}
	if (geographicLevelId) {
		conditions.push(
			sql`EXISTS (
		  SELECT 1
		  FROM jsonb_array_elements(${disasterRecordsTable.spatialFootprint}) AS elem
		  WHERE (elem->'geojson'->'properties'->>'division_id') = ${geographicLevelId}
		)`
		);
	}
	if (fromDate || toDate) {
		const from = fromDate || "0001-01-01";
		const to = toDate || "9999-12-31";

		const startDateAsDate = sql`CASE 
		WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM-DD')
		WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY-MM')
		WHEN ${disasterRecordsTable.startDate} ~ '^[0-9]{4}$' THEN TO_DATE(${disasterRecordsTable.startDate}, 'YYYY')
		ELSE NULL
	  END`;

		const endDateAsDate = sql`CASE 
		WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY-MM-DD')
		WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY-MM')
		WHEN ${disasterRecordsTable.endDate} ~ '^[0-9]{4}$' THEN TO_DATE(${disasterRecordsTable.endDate}, 'YYYY')
		ELSE NULL
	  END`;

		conditions.push(
			sql`(${startDateAsDate} IS NULL OR ${startDateAsDate} <= ${to}::date) AND (${endDateAsDate} IS NULL OR ${endDateAsDate} >= ${from}::date)`
		);
	}

	// Conditions for human_dsg: all specified fields are NULL and custom is {}
	const humanDsgConditions = and(
		isNull(humanDsgTable.sex),
		isNull(humanDsgTable.age),
		isNull(humanDsgTable.disability),
		isNull(humanDsgTable.globalPovertyLine),
		isNull(humanDsgTable.nationalPovertyLine),
		sql`${humanDsgTable.custom} = '{}'::jsonb`
	);

	// Subquery to unnest spatial_footprint and join with affected-related tables
	const affectedByDivisionSubquery = dr
		.select({
			id: disasterRecordsTable.id,
			divisionId:
				sql<string>`jsonb_array_elements(${disasterRecordsTable.spatialFootprint})->'geojson'->'properties'->>'division_id'`.as(
					"division_id"
				),
			injured: injuredTable.injured,
			missing: missingTable.missing,
			displaced: displacedTable.displaced,
			direct: affectedTable.direct,
			indirect: affectedTable.indirect,
		})
		.from(disasterRecordsTable)
		.leftJoin(
			humanDsgTable,
			eq(disasterRecordsTable.id, humanDsgTable.recordId)
		)
		.leftJoin(injuredTable, eq(humanDsgTable.id, injuredTable.dsgId))
		.leftJoin(missingTable, eq(humanDsgTable.id, missingTable.dsgId))
		.leftJoin(displacedTable, eq(humanDsgTable.id, displacedTable.dsgId))
		.leftJoin(affectedTable, eq(humanDsgTable.id, affectedTable.dsgId))
		.where(and(...conditions, humanDsgConditions))
		.as("affected_subquery");

	const affectedByDivisionQuery = dr
		.select({
			divisionId: sql<string>`affected_subquery.division_id`,
			totalAffected: sql<number>`COALESCE(SUM(
		  COALESCE(affected_subquery.injured, 0) +
		  COALESCE(affected_subquery.missing, 0) +
		  COALESCE(affected_subquery.displaced, 0) +
		  COALESCE(affected_subquery.direct, 0) +
		  COALESCE(affected_subquery.indirect, 0)
		), 0)`.as("total_affected"),
		})
		.from(affectedByDivisionSubquery)
		.where(sql`affected_subquery.division_id IS NOT NULL`)
		.groupBy(sql`affected_subquery.division_id`);

	const result = await affectedByDivisionQuery.execute();

	return result;
}

interface DisasterEventCountByDivision {
	divisionId: string;
	eventCount: number;
}

export async function getDisasterEventCountByDivision(
	filters: HazardFilters
): Promise<DisasterEventCountByDivision[]> {
	const {
		hazardTypeId,
		hazardClusterId,
		specificHazardId,
		geographicLevelId,
		fromDate,
		toDate,
	} = filters;

	// Build WHERE conditions dynamically
	const conditions = [];

	conditions.push(eq(disasterEventTable.approvalStatus, "published"));

	if (hazardTypeId) {
		conditions.push(eq(disasterEventTable.hipTypeId, hazardTypeId));
	}
	if (hazardClusterId) {
		conditions.push(eq(disasterEventTable.hipClusterId, hazardClusterId));
	}
	if (specificHazardId) {
		conditions.push(eq(disasterEventTable.hipHazardId, specificHazardId));
	}
	if (geographicLevelId) {
		conditions.push(
			sql`EXISTS (
		  SELECT 1
		  FROM jsonb_array_elements(${disasterEventTable.spatialFootprint}) AS elem
		  WHERE (elem->'geojson'->'properties'->>'division_id') = ${geographicLevelId}
		)`
		);
	}
	if (fromDate || toDate) {
		const from = fromDate || "0001-01-01";
		const to = toDate || "9999-12-31";
		conditions.push(
			sql`${disasterEventTable.startDate} >= ${from} AND ${disasterEventTable.endDate} <= ${to}`
		);
	}

	// Subquery to unnest spatial_footprint
	const eventCountSubquery = dr
		.select({
			id: disasterEventTable.id,
			divisionId:
				sql<string>`jsonb_array_elements(${disasterEventTable.spatialFootprint})->'geojson'->'properties'->>'division_id'`.as(
					"division_id"
				),
		})
		.from(disasterEventTable)
		.where(and(...conditions))
		.as("event_subquery");

	const eventCountQuery = dr
		.select({
			divisionId: sql<string>`event_subquery.division_id`,
			eventCount: sql<number>`COUNT(DISTINCT event_subquery.id)`.as(
				"event_count"
			),
		})
		.from(eventCountSubquery)
		.where(sql`event_subquery.division_id IS NOT NULL`)
		.groupBy(sql`event_subquery.division_id`);

	const result = await eventCountQuery.execute();

	return result;
}


export interface DisasterSummary {
	disasterId: string;
	disasterName: string;
	startDate: string;
	endDate: string;
	provinceAffected: string; 
	totalDamages: number;
	totalLosses: number;
	totalAffectedPeople: number;
  }
  
  export async function getDisasterSummary(filters: HazardFilters): Promise<DisasterSummary[]> {
	const {
	  hazardTypeId,
	  hazardClusterId,
	  specificHazardId,
	  geographicLevelId,
	  fromDate,
	  toDate,
	} = filters;
  
	// Build WHERE conditions for disaster_event
	const eventConditions = [
	  eq(disasterEventTable.approvalStatus, "published"),
	];
  
	if (hazardTypeId) eventConditions.push(eq(disasterEventTable.hipTypeId, hazardTypeId));
	if (hazardClusterId) eventConditions.push(eq(disasterEventTable.hipClusterId, hazardClusterId));
	if (specificHazardId) eventConditions.push(eq(disasterEventTable.hipHazardId, specificHazardId));
	if (geographicLevelId) {
	  eventConditions.push(
		sql`EXISTS (
		  SELECT 1
		  FROM jsonb_array_elements(${disasterEventTable.spatialFootprint}) AS elem
		  WHERE (elem->'geojson'->'properties'->>'division_id') = ${geographicLevelId}
		)`
	  );
	}
	if (fromDate || toDate) {
	  const from = fromDate || "0001-01-01";
	  const to = toDate || "9999-12-31";
	  eventConditions.push(
		sql`${disasterEventTable.startDate} >= ${from} AND ${disasterEventTable.endDate} <= ${to}`
	  );
	}
  
	// Conditions for human_dsg
	const humanDsgConditions = and(
	  isNull(humanDsgTable.sex),
	  isNull(humanDsgTable.age),
	  isNull(humanDsgTable.disability),
	  isNull(humanDsgTable.globalPovertyLine),
	  isNull(humanDsgTable.nationalPovertyLine),
	  sql`${humanDsgTable.custom} = '{}'::jsonb`
	);
  
	// Subquery for affected people, grouped by disasterEventId
	const affectedSubquery = dr
	  .select({
		disasterEventId: disasterRecordsTable.disasterEventId,
		totalAffected: sql<number>`COALESCE(SUM(
		  COALESCE(${missingTable.missing}, 0) +
		  COALESCE(${displacedTable.displaced}, 0) +
		  COALESCE(${injuredTable.injured}, 0) +
		  COALESCE(${affectedTable.direct}, 0)
		), 0)`.as("total_affected"),
	  })
	  .from(disasterRecordsTable)
	  .leftJoin(humanDsgTable, eq(disasterRecordsTable.id, humanDsgTable.recordId))
	  .leftJoin(missingTable, eq(humanDsgTable.id, missingTable.dsgId))
	  .leftJoin(displacedTable, eq(humanDsgTable.id, displacedTable.dsgId))
	  .leftJoin(injuredTable, eq(humanDsgTable.id, injuredTable.dsgId))
	  .leftJoin(affectedTable, eq(humanDsgTable.id, affectedTable.dsgId))
	  .where(and(eq(disasterRecordsTable.approvalStatus, "published"), humanDsgConditions))
	  .groupBy(disasterRecordsTable.disasterEventId)
	  .as("affected_subquery");
  
	// Subquery for provinces
	const provincesSubquery = dr
	  .select({
		disasterId: disasterEventTable.id,
		provinceName: sql<string>`jsonb_array_elements(${disasterEventTable.spatialFootprint})->'geojson'->'properties'->'name'->>'en'`.as("province_name"),
	  })
	  .from(disasterEventTable)
	  .where(and(...eventConditions))
	  .as("provinces_subquery");
  
	const provincesAggQuery = dr
	  .select({
		disasterId: provincesSubquery.disasterId,
		provinceAffected: sql<string>`string_agg(DISTINCT ${provincesSubquery.provinceName}, ', ')`.as("province_affected"),
	  })
	  .from(provincesSubquery)
	  .where(sql`${provincesSubquery.provinceName} IS NOT NULL`)
	  .groupBy(provincesSubquery.disasterId)
	  .as("provinces_agg");
  
	// Main query
	const query = dr
	  .select({
		disasterId: disasterEventTable.id,
		disasterName: disasterEventTable.nameNational,
		startDate: disasterEventTable.startDate,
		endDate: disasterEventTable.endDate,
		provinceAffected: provincesAggQuery.provinceAffected,
		totalDamages: sql<number>`COALESCE(SUM(${sectorDisasterRecordsRelationTable.damageCost}), 0)`.as("total_damages"),
		totalLosses: sql<number>`COALESCE(SUM(${sectorDisasterRecordsRelationTable.lossesCost}), 0)`.as("total_losses"),
		totalAffectedPeople: sql<number>`COALESCE(${affectedSubquery.totalAffected}, 0)`.as("total_affected_people"),
	  })
	  .from(disasterEventTable)
	  .leftJoin(
		provincesAggQuery,
		eq(disasterEventTable.id, provincesAggQuery.disasterId)
	  )
	  .leftJoin(
		disasterRecordsTable,
		eq(disasterEventTable.id, disasterRecordsTable.disasterEventId)
	  )
	  .leftJoin(
		sectorDisasterRecordsRelationTable,
		eq(disasterRecordsTable.id, sectorDisasterRecordsRelationTable.disasterRecordId)
	  )
	  .leftJoin(
		affectedSubquery,
		eq(disasterEventTable.id, affectedSubquery.disasterEventId)
	  )
	  .where(and(...eventConditions))
	  .groupBy(
		disasterEventTable.id,
		disasterEventTable.nameNational,
		disasterEventTable.startDate,
		disasterEventTable.endDate,
		provincesAggQuery.provinceAffected,
		affectedSubquery.totalAffected
	  );
  
	const result = await query.execute();
	console.log("Disaster Summary:", result);
  
	return result.map((row) => ({
	  disasterId: row.disasterId,
	  disasterName: row.disasterName || "Unnamed Disaster",
	  startDate: row.startDate,
	  endDate: row.endDate,
	  provinceAffected: row.provinceAffected || "",
	  totalDamages: row.totalDamages,
	  totalLosses: row.totalLosses,
	  totalAffectedPeople: row.totalAffectedPeople,
	}));
  }