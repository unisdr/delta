import { and, eq, isNull, ne, SQL, sql } from "drizzle-orm";
import { dr } from "~/db.server";
import {
	affectedTable,
	deathsTable,
	disasterEventTable,
	disasterRecordsTable,
	displacedTable,
	divisionTable,
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

	// Build WHERE conditions for disaster_event as SQL objects
	const whereConditions: SQL[] = [];
	whereConditions.push(sql`"approvalStatus" = ${"published"}`);
	if (hazardTypeId) whereConditions.push(sql`"hip_type_id" = ${hazardTypeId}`);
	if (hazardClusterId)
		whereConditions.push(sql`"hip_cluster_id" = ${hazardClusterId}`);
	if (specificHazardId)
		whereConditions.push(sql`"hip_hazard_id" = ${specificHazardId}`);
	if (fromDate || toDate) {
		const from = fromDate || "0001-01-01";
		const to = toDate || "9999-12-31";
		whereConditions.push(sql`
		(
		  CASE 
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM-DD')
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM')
			WHEN "start_date" ~ '^[0-9]{4}$' THEN TO_DATE("start_date", 'YYYY')
			ELSE NULL
		  END IS NULL OR 
		  CASE 
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM-DD')
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM')
			WHEN "start_date" ~ '^[0-9]{4}$' THEN TO_DATE("start_date", 'YYYY')
			ELSE NULL
		  END <= ${to}::date
		) AND (
		  CASE 
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM-DD')
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM')
			WHEN "end_date" ~ '^[0-9]{4}$' THEN TO_DATE("end_date", 'YYYY')
			ELSE NULL
		  END IS NULL OR 
		  CASE 
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM-DD')
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM')
			WHEN "end_date" ~ '^[0-9]{4}$' THEN TO_DATE("end_date", 'YYYY')
			ELSE NULL
		  END >= ${from}::date
		)
	  `);
	}

	// Combine conditions into a single WHERE clause for the subquery
	const subqueryWhereClause =
		whereConditions.length > 0 ? sql`WHERE ${and(...whereConditions)}` : sql``;

	// Construct the full raw SQL query
	const rawQuery = sql`
	  WITH RECURSIVE division_hierarchy AS (
		SELECT id, parent_id, id AS level1_id
		FROM "division"
		WHERE parent_id IS NULL
		UNION ALL
		SELECT d.id, d.parent_id, dh.level1_id
		FROM "division" d
		INNER JOIN division_hierarchy dh ON d.parent_id = dh.id
	  )
	  SELECT 
		COUNT(DISTINCT ds.record_id) AS disaster_count
	  FROM (
		SELECT "disaster_event"."id" AS record_id, 
			   jsonb_array_elements("disaster_event"."spatial_footprint")->'geojson'->'properties'->>'division_id' AS division_id
		FROM "disaster_event"
		${subqueryWhereClause}
	  ) ds
	  LEFT JOIN division_hierarchy dh 
		ON ds.division_id = dh.id::text
	  WHERE ds.division_id IS NOT NULL
	  ${
			geographicLevelId
				? sql`AND dh.level1_id IN (
		SELECT level1_id 
		FROM division_hierarchy 
		WHERE id = ${geographicLevelId}
	  )`
				: sql``
		}
	`;

	// Execute the query
	const result = await dr.execute(rawQuery);

	return Number(result.rows[0]?.disaster_count ?? 0);
}

export interface YearlyDisasterCount {
	year: number;
	count: number;
}

export async function getDisasterEventCountByYear(filters: HazardFilters): Promise<YearlyDisasterCount[]> {
	const {
	  hazardTypeId,
	  hazardClusterId,
	  specificHazardId,
	  geographicLevelId,
	  fromDate,
	  toDate,
	} = filters;
  
	// Build WHERE conditions for disaster_event as SQL objects
	const whereConditions: SQL[] = [];
	whereConditions.push(sql`"approvalStatus" = ${"published"}`);
	if (hazardTypeId) whereConditions.push(sql`"hip_type_id" = ${hazardTypeId}`);
	if (hazardClusterId) whereConditions.push(sql`"hip_cluster_id" = ${hazardClusterId}`);
	if (specificHazardId) whereConditions.push(sql`"hip_hazard_id" = ${specificHazardId}`);
	if (fromDate || toDate) {
	  const from = fromDate || "0001-01-01";
	  const to = toDate || "9999-12-31";
	  whereConditions.push(sql`
		(
		  CASE 
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM-DD')
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM')
			WHEN "start_date" ~ '^[0-9]{4}$' THEN TO_DATE("start_date", 'YYYY')
			ELSE NULL
		  END IS NULL OR 
		  CASE 
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM-DD')
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM')
			WHEN "start_date" ~ '^[0-9]{4}$' THEN TO_DATE("start_date", 'YYYY')
			ELSE NULL
		  END <= ${to}::date
		) AND (
		  CASE 
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM-DD')
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM')
			WHEN "end_date" ~ '^[0-9]{4}$' THEN TO_DATE("end_date", 'YYYY')
			ELSE NULL
		  END IS NULL OR 
		  CASE 
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM-DD')
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM')
			WHEN "end_date" ~ '^[0-9]{4}$' THEN TO_DATE("end_date", 'YYYY')
			ELSE NULL
		  END >= ${from}::date
		)
	  `);
	}
  
	// Combine conditions into a single WHERE clause for the subquery
	const subqueryWhereClause = whereConditions.length > 0 ? sql`WHERE ${and(...whereConditions)}` : sql``;
  
	// Construct the full raw SQL query with year extraction and ordering
	const rawQuery = sql`
	  WITH RECURSIVE division_hierarchy AS (
		SELECT id, parent_id, id AS level1_id
		FROM "division"
		WHERE parent_id IS NULL
		UNION ALL
		SELECT d.id, d.parent_id, dh.level1_id
		FROM "division" d
		INNER JOIN division_hierarchy dh ON d.parent_id = dh.id
	  )
	  SELECT 
		EXTRACT(YEAR FROM CASE 
		  WHEN ds.start_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(ds.start_date, 'YYYY-MM-DD')
		  WHEN ds.start_date ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(ds.start_date, 'YYYY-MM')
		  WHEN ds.start_date ~ '^[0-9]{4}$' THEN TO_DATE(ds.start_date, 'YYYY')
		  ELSE NULL
		END)::integer AS year,
		COUNT(DISTINCT ds.record_id) AS disaster_count
	  FROM (
		SELECT "disaster_event"."id" AS record_id, 
			   jsonb_array_elements("disaster_event"."spatial_footprint")->'geojson'->'properties'->>'division_id' AS division_id,
			   "disaster_event"."start_date" AS start_date
		FROM "disaster_event"
		${subqueryWhereClause}
	  ) ds
	  LEFT JOIN division_hierarchy dh 
		ON ds.division_id = dh.id::text
	  WHERE ds.division_id IS NOT NULL
	  ${geographicLevelId ? sql`AND dh.level1_id IN (
		SELECT level1_id 
		FROM division_hierarchy 
		WHERE id = ${geographicLevelId}
	  )` : sql``}
	  GROUP BY 
		EXTRACT(YEAR FROM CASE 
		  WHEN ds.start_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(ds.start_date, 'YYYY-MM-DD')
		  WHEN ds.start_date ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(ds.start_date, 'YYYY-MM')
		  WHEN ds.start_date ~ '^[0-9]{4}$' THEN TO_DATE(ds.start_date, 'YYYY')
		  ELSE NULL
		END)::integer
	  HAVING 
		EXTRACT(YEAR FROM CASE 
		  WHEN ds.start_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(ds.start_date, 'YYYY-MM-DD')
		  WHEN ds.start_date ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(ds.start_date, 'YYYY-MM')
		  WHEN ds.start_date ~ '^[0-9]{4}$' THEN TO_DATE(ds.start_date, 'YYYY')
		  ELSE NULL
		END)::integer IS NOT NULL
	  ORDER BY year ASC
	`;
  
	// Execute the query
	const result = await dr.execute(rawQuery);
  
	return result.rows.map((row: any) => ({
	  year: Number(row.year),
	  count: Number(row.disaster_count),
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

export async function getAffectedPeopleByHazardFilters(filters: HazardFilters): Promise<AffectedPeopleResult> {
	const {
	  hazardTypeId,
	  hazardClusterId,
	  specificHazardId,
	  geographicLevelId,
	  fromDate,
	  toDate,
	} = filters;
  
	// Build WHERE conditions for disaster_records as SQL objects
	const whereConditions: SQL[] = [];
	whereConditions.push(sql`"approvalStatus" = ${"published"}`);
	if (hazardTypeId) whereConditions.push(sql`"hip_type_id" = ${hazardTypeId}`);
	if (hazardClusterId) whereConditions.push(sql`"hip_cluster_id" = ${hazardClusterId}`);
	if (specificHazardId) whereConditions.push(sql`"hip_hazard_id" = ${specificHazardId}`);
	if (fromDate || toDate) {
	  const from = fromDate || "0001-01-01";
	  const to = toDate || "9999-12-31";
	  whereConditions.push(sql`
		(
		  CASE 
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM-DD')
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM')
			WHEN "start_date" ~ '^[0-9]{4}$' THEN TO_DATE("start_date", 'YYYY')
			ELSE NULL
		  END IS NULL OR 
		  CASE 
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM-DD')
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM')
			WHEN "start_date" ~ '^[0-9]{4}$' THEN TO_DATE("start_date", 'YYYY')
			ELSE NULL
		  END <= ${to}::date
		) AND (
		  CASE 
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM-DD')
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM')
			WHEN "end_date" ~ '^[0-9]{4}$' THEN TO_DATE("end_date", 'YYYY')
			ELSE NULL
		  END IS NULL OR 
		  CASE 
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM-DD')
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM')
			WHEN "end_date" ~ '^[0-9]{4}$' THEN TO_DATE("end_date", 'YYYY')
			ELSE NULL
		  END >= ${from}::date
		)
	  `);
	}
  
	// Combine all conditions (including geographicLevelId) into a single WHERE clause
	const allConditions = [
	  ...whereConditions,
	  sql`(sf->'geojson'->'properties'->>'division_id' IS NOT NULL OR sf->'geojson'->'properties'->'division_ids' IS NOT NULL)`,
	];
	if (geographicLevelId) {
	  allConditions.push(sql`dh.level1_id IN (
		SELECT level1_id 
		FROM division_hierarchy 
		WHERE id = ${geographicLevelId}
	  )`);
	}
	const combinedWhereClause = allConditions.length > 0 ? sql`WHERE ${and(...allConditions)}` : sql``;
  
	// Construct the full raw SQL query
	const rawQuery = sql`
	  WITH RECURSIVE division_hierarchy AS (
		SELECT id, parent_id, id AS level1_id
		FROM "division"
		WHERE parent_id IS NULL
		UNION ALL
		SELECT d.id, d.parent_id, dh.level1_id
		FROM "division" d
		INNER JOIN division_hierarchy dh ON d.parent_id = dh.id
	  ),
	  filtered_records AS (
		SELECT DISTINCT dr."id" AS record_id
		FROM "disaster_records" dr
		CROSS JOIN jsonb_array_elements(dr."spatial_footprint") AS sf
		LEFT JOIN division_hierarchy dh 
		  ON (sf->'geojson'->'properties'->>'division_id') = dh.id::text 
		  OR EXISTS (
			SELECT 1 
			FROM jsonb_array_elements_text(sf->'geojson'->'properties'->'division_ids') AS div_id 
			WHERE div_id = dh.id::text
		  )
		${combinedWhereClause}
	  )
	  SELECT 
		COALESCE(SUM(dth.deaths), 0) AS total_deaths,
		COALESCE(SUM(inj.injured), 0) AS total_injured,
		COALESCE(SUM(mis.missing), 0) AS total_missing,
		COALESCE(SUM(dsp.displaced), 0) AS total_displaced,
		COALESCE(SUM(aff.direct), 0) AS total_affected_direct,
		COALESCE(SUM(aff.indirect), 0) AS total_affected_indirect
	  FROM filtered_records fr
	  LEFT JOIN "human_dsg" hd 
		ON fr.record_id = hd.record_id
		AND hd.sex IS NULL 
		AND hd.age IS NULL 
		AND hd.disability IS NULL 
		AND hd.global_poverty_line IS NULL 
		AND hd.national_poverty_line IS NULL 
		AND hd.custom = '{}'::jsonb
	  LEFT JOIN "deaths" dth 
		ON hd.id = dth.dsg_id
	  LEFT JOIN "injured" inj 
		ON hd.id = inj.dsg_id
	  LEFT JOIN "missing" mis 
		ON hd.id = mis.dsg_id
	  LEFT JOIN "displaced" dsp 
		ON hd.id = dsp.dsg_id
	  LEFT JOIN "affected" aff 
		ON hd.id = aff.dsg_id
	`;
  
  
	// Execute the query
	const result = await dr.execute(rawQuery);
  
	// Return the aggregated totals
	const row = result.rows[0] || {};
	return {
	  totalDeaths: Number(row.total_deaths ?? 0),
	  totalInjured: Number(row.total_injured ?? 0),
	  totalMissing: Number(row.total_missing ?? 0),
	  totalDisplaced: Number(row.total_displaced ?? 0),
	  totalAffectedDirect: Number(row.total_affected_direct ?? 0),
	  totalAffectedIndirect: Number(row.total_affected_indirect ?? 0),
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

	// Base conditions: Only count where global_poverty_line = "below"
	const humanDsgBaseConditions = and(
		isNull(humanDsgTable.age),
		isNull(humanDsgTable.disability),
		isNull(humanDsgTable.nationalPovertyLine),
		sql`${humanDsgTable.custom} = '{}'::jsonb`,
		eq(humanDsgTable.globalPovertyLine, "below") // Only "below" counts
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

	// Base conditions: Only count where national_poverty_line = "below"
	const humanDsgBaseConditions = and(
		isNull(humanDsgTable.age),
		isNull(humanDsgTable.disability),
		isNull(humanDsgTable.globalPovertyLine),
		sql`${humanDsgTable.custom} = '{}'::jsonb`,
		eq(humanDsgTable.nationalPovertyLine, "below") // Only "below" counts
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
		geographicLevelId,
		fromDate,
		toDate,
	} = filters;

	// Build WHERE conditions for disaster_records as SQL objects
	const whereConditions: SQL[] = [];
	whereConditions.push(sql`"approvalStatus" = ${"published"}`);
	if (hazardTypeId) whereConditions.push(sql`"hip_type_id" = ${hazardTypeId}`);
	if (hazardClusterId)
		whereConditions.push(sql`"hip_cluster_id" = ${hazardClusterId}`);
	if (specificHazardId)
		whereConditions.push(sql`"hip_hazard_id" = ${specificHazardId}`);
	if (fromDate || toDate) {
		const from = fromDate || "0001-01-01";
		const to = toDate || "9999-12-31";
		whereConditions.push(sql`
		(
		  CASE 
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM-DD')
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM')
			WHEN "start_date" ~ '^[0-9]{4}$' THEN TO_DATE("start_date", 'YYYY')
			ELSE NULL
		  END IS NULL OR 
		  CASE 
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM-DD')
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM')
			WHEN "start_date" ~ '^[0-9]{4}$' THEN TO_DATE("start_date", 'YYYY')
			ELSE NULL
		  END <= ${to}::date
		) AND (
		  CASE 
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM-DD')
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM')
			WHEN "end_date" ~ '^[0-9]{4}$' THEN TO_DATE("end_date", 'YYYY')
			ELSE NULL
		  END IS NULL OR 
		  CASE 
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM-DD')
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM')
			WHEN "end_date" ~ '^[0-9]{4}$' THEN TO_DATE("end_date", 'YYYY')
			ELSE NULL
		  END >= ${from}::date
		)
	  `);
	}

	// Combine conditions into a single WHERE clause for the subquery
	const subqueryWhereClause =
		whereConditions.length > 0 ? sql`WHERE ${and(...whereConditions)}` : sql``;

	// Construct the full raw SQL query
	const rawQuery = sql`
	  WITH RECURSIVE division_hierarchy AS (
		SELECT id, parent_id, id AS level1_id
		FROM "division"
		WHERE parent_id IS NULL
		UNION ALL
		SELECT d.id, d.parent_id, dh.level1_id
		FROM "division" d
		INNER JOIN division_hierarchy dh ON d.parent_id = dh.id
	  )
	  SELECT 
		COALESCE(SUM(sdr.damage_cost), 0) AS total_damages
	  FROM (
		SELECT "disaster_records"."id" AS record_id, 
			   jsonb_array_elements("disaster_records"."spatial_footprint")->'geojson'->'properties'->>'division_id' AS division_id
		FROM "disaster_records"
		${subqueryWhereClause}
	  ) ds
	  LEFT JOIN "sector_disaster_records_relation" sdr 
		ON ds.record_id = sdr.disaster_record_id
	  LEFT JOIN division_hierarchy dh 
		ON ds.division_id = dh.id::text
	  WHERE ds.division_id IS NOT NULL
	  ${
			geographicLevelId
				? sql`AND dh.level1_id IN (
		SELECT level1_id 
		FROM division_hierarchy 
		WHERE id = ${geographicLevelId}
	  )`
				: sql``
		}
	`;

	// Execute the query
	const result = await dr.execute(rawQuery);

	return Number(result.rows[0].total_damages);
}

export async function getTotalLossesByHazardFilters(
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

	// Build WHERE conditions for disaster_records as SQL objects
	const whereConditions: SQL[] = [];
	whereConditions.push(sql`"approvalStatus" = ${"published"}`);
	if (hazardTypeId) whereConditions.push(sql`"hip_type_id" = ${hazardTypeId}`);
	if (hazardClusterId)
		whereConditions.push(sql`"hip_cluster_id" = ${hazardClusterId}`);
	if (specificHazardId)
		whereConditions.push(sql`"hip_hazard_id" = ${specificHazardId}`);
	if (fromDate || toDate) {
		const from = fromDate || "0001-01-01";
		const to = toDate || "9999-12-31";
		whereConditions.push(sql`
		(
		  CASE 
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM-DD')
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM')
			WHEN "start_date" ~ '^[0-9]{4}$' THEN TO_DATE("start_date", 'YYYY')
			ELSE NULL
		  END IS NULL OR 
		  CASE 
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM-DD')
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM')
			WHEN "start_date" ~ '^[0-9]{4}$' THEN TO_DATE("start_date", 'YYYY')
			ELSE NULL
		  END <= ${to}::date
		) AND (
		  CASE 
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM-DD')
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM')
			WHEN "end_date" ~ '^[0-9]{4}$' THEN TO_DATE("end_date", 'YYYY')
			ELSE NULL
		  END IS NULL OR 
		  CASE 
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM-DD')
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM')
			WHEN "end_date" ~ '^[0-9]{4}$' THEN TO_DATE("end_date", 'YYYY')
			ELSE NULL
		  END >= ${from}::date
		)
	  `);
	}

	// Combine conditions into a single WHERE clause for the subquery
	const subqueryWhereClause =
		whereConditions.length > 0 ? sql`WHERE ${and(...whereConditions)}` : sql``;

	// Construct the full raw SQL query
	const rawQuery = sql`
	  WITH RECURSIVE division_hierarchy AS (
		SELECT id, parent_id, id AS level1_id
		FROM "division"
		WHERE parent_id IS NULL
		UNION ALL
		SELECT d.id, d.parent_id, dh.level1_id
		FROM "division" d
		INNER JOIN division_hierarchy dh ON d.parent_id = dh.id
	  )
	  SELECT 
		COALESCE(SUM(sdr.losses_cost), 0) AS total_losses
	  FROM (
		SELECT "disaster_records"."id" AS record_id, 
			   jsonb_array_elements("disaster_records"."spatial_footprint")->'geojson'->'properties'->>'division_id' AS division_id
		FROM "disaster_records"
		${subqueryWhereClause}
	  ) ds
	  LEFT JOIN "sector_disaster_records_relation" sdr 
		ON ds.record_id = sdr.disaster_record_id
	  LEFT JOIN division_hierarchy dh 
		ON ds.division_id = dh.id::text
	  WHERE ds.division_id IS NOT NULL
	  ${
			geographicLevelId
				? sql`AND dh.level1_id IN (
		SELECT level1_id 
		FROM division_hierarchy 
		WHERE id = ${geographicLevelId}
	  )`
				: sql``
		}
	`;

	// Execute the query
	const result = await dr.execute(rawQuery);

	return Number(result.rows[0].total_losses);
}

export interface DamageByYear {
	year: number;
	totalDamages: number;
}

export async function getTotalDamagesByYear(
	filters: HazardFilters
): Promise<DamageByYear[]> {
	const {
		hazardTypeId,
		hazardClusterId,
		specificHazardId,
		geographicLevelId,
		fromDate,
		toDate,
	} = filters;

	// Build WHERE conditions for disaster_records as SQL objects
	const whereConditions: SQL[] = [];
	whereConditions.push(sql`"approvalStatus" = ${"published"}`);
	if (hazardTypeId) whereConditions.push(sql`"hip_type_id" = ${hazardTypeId}`);
	if (hazardClusterId)
		whereConditions.push(sql`"hip_cluster_id" = ${hazardClusterId}`);
	if (specificHazardId)
		whereConditions.push(sql`"hip_hazard_id" = ${specificHazardId}`);
	if (fromDate || toDate) {
		const from = fromDate || "0001-01-01";
		const to = toDate || "9999-12-31";
		whereConditions.push(sql`
		(
		  CASE 
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM-DD')
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM')
			WHEN "start_date" ~ '^[0-9]{4}$' THEN TO_DATE("start_date", 'YYYY')
			ELSE NULL
		  END IS NULL OR 
		  CASE 
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM-DD')
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM')
			WHEN "start_date" ~ '^[0-9]{4}$' THEN TO_DATE("start_date", 'YYYY')
			ELSE NULL
		  END <= ${to}::date
		) AND (
		  CASE 
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM-DD')
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM')
			WHEN "end_date" ~ '^[0-9]{4}$' THEN TO_DATE("end_date", 'YYYY')
			ELSE NULL
		  END IS NULL OR 
		  CASE 
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM-DD')
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM')
			WHEN "end_date" ~ '^[0-9]{4}$' THEN TO_DATE("end_date", 'YYYY')
			ELSE NULL
		  END >= ${from}::date
		)
	  `);
	}

	// Combine conditions into a single WHERE clause for the subquery
	const subqueryWhereClause =
		whereConditions.length > 0 ? sql`WHERE ${and(...whereConditions)}` : sql``;

	// Construct the full raw SQL query with year extraction and ordering
	const rawQuery = sql`
	  WITH RECURSIVE division_hierarchy AS (
		SELECT id, parent_id, id AS level1_id
		FROM "division"
		WHERE parent_id IS NULL
		UNION ALL
		SELECT d.id, d.parent_id, dh.level1_id
		FROM "division" d
		INNER JOIN division_hierarchy dh ON d.parent_id = dh.id
	  )
	  SELECT 
		COALESCE(
		  EXTRACT(YEAR FROM CASE 
			WHEN ds.start_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(ds.start_date, 'YYYY-MM-DD')
			WHEN ds.start_date ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(ds.start_date, 'YYYY-MM')
			WHEN ds.start_date ~ '^[0-9]{4}$' THEN TO_DATE(ds.start_date, 'YYYY')
			ELSE NULL
		  END)::integer,
		  -1
		) AS year,
		COALESCE(SUM(sdr.damage_cost), 0) AS total_damages
	  FROM (
		SELECT "disaster_records"."id" AS record_id, 
			   jsonb_array_elements("disaster_records"."spatial_footprint")->'geojson'->'properties'->>'division_id' AS division_id,
			   "disaster_records"."start_date" AS start_date
		FROM "disaster_records"
		${subqueryWhereClause}
	  ) ds
	  LEFT JOIN "sector_disaster_records_relation" sdr 
		ON ds.record_id = sdr.disaster_record_id
	  LEFT JOIN division_hierarchy dh 
		ON ds.division_id = dh.id::text
	  WHERE ds.division_id IS NOT NULL
	  ${
			geographicLevelId
				? sql`AND dh.level1_id IN (
		SELECT level1_id 
		FROM division_hierarchy 
		WHERE id = ${geographicLevelId}
	  )`
				: sql``
		}
	  GROUP BY 
		COALESCE(
		  EXTRACT(YEAR FROM CASE 
			WHEN ds.start_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(ds.start_date, 'YYYY-MM-DD')
			WHEN ds.start_date ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(ds.start_date, 'YYYY-MM')
			WHEN ds.start_date ~ '^[0-9]{4}$' THEN TO_DATE(ds.start_date, 'YYYY')
			ELSE NULL
		  END)::integer,
		  -1
		)
	  ORDER BY year ASC
	`;

	// Execute the query
	const result = await dr.execute(rawQuery);

	return result.rows.map((row: any) => ({
		year: Number(row.year),
		totalDamages: Number(row.total_damages),
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
		geographicLevelId,
		fromDate,
		toDate,
	} = filters;

	// Build WHERE conditions for disaster_records as SQL objects
	const whereConditions: SQL[] = [];
	whereConditions.push(sql`"approvalStatus" = ${"published"}`);
	if (hazardTypeId) whereConditions.push(sql`"hip_type_id" = ${hazardTypeId}`);
	if (hazardClusterId)
		whereConditions.push(sql`"hip_cluster_id" = ${hazardClusterId}`);
	if (specificHazardId)
		whereConditions.push(sql`"hip_hazard_id" = ${specificHazardId}`);
	if (fromDate || toDate) {
		const from = fromDate || "0001-01-01";
		const to = toDate || "9999-12-31";
		whereConditions.push(sql`
		(
		  CASE 
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM-DD')
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM')
			WHEN "start_date" ~ '^[0-9]{4}$' THEN TO_DATE("start_date", 'YYYY')
			ELSE NULL
		  END IS NULL OR 
		  CASE 
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM-DD')
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM')
			WHEN "start_date" ~ '^[0-9]{4}$' THEN TO_DATE("start_date", 'YYYY')
			ELSE NULL
		  END <= ${to}::date
		) AND (
		  CASE 
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM-DD')
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM')
			WHEN "end_date" ~ '^[0-9]{4}$' THEN TO_DATE("end_date", 'YYYY')
			ELSE NULL
		  END IS NULL OR 
		  CASE 
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM-DD')
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM')
			WHEN "end_date" ~ '^[0-9]{4}$' THEN TO_DATE("end_date", 'YYYY')
			ELSE NULL
		  END >= ${from}::date
		)
	  `);
	}
	// Exclude invalid/empty start_date
	whereConditions.push(sql`
	  CASE 
		WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM-DD')
		WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM')
		WHEN "start_date" ~ '^[0-9]{4}$' THEN TO_DATE("start_date", 'YYYY')
		ELSE NULL
	  END IS NOT NULL
	`);

	// Combine conditions into a single WHERE clause for the subquery
	const subqueryWhereClause =
		whereConditions.length > 0 ? sql`WHERE ${and(...whereConditions)}` : sql``;

	// Construct the full raw SQL query with year extraction and ordering
	const rawQuery = sql`
	  WITH RECURSIVE division_hierarchy AS (
		SELECT id, parent_id, id AS level1_id
		FROM "division"
		WHERE parent_id IS NULL
		UNION ALL
		SELECT d.id, d.parent_id, dh.level1_id
		FROM "division" d
		INNER JOIN division_hierarchy dh ON d.parent_id = dh.id
	  )
	  SELECT 
		EXTRACT(YEAR FROM CASE 
		  WHEN ds.start_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(ds.start_date, 'YYYY-MM-DD')
		  WHEN ds.start_date ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(ds.start_date, 'YYYY-MM')
		  WHEN ds.start_date ~ '^[0-9]{4}$' THEN TO_DATE(ds.start_date, 'YYYY')
		  ELSE NULL
		END)::integer AS year,
		COALESCE(SUM(sdr.losses_cost), 0) AS total_losses
	  FROM (
		SELECT "disaster_records"."id" AS record_id, 
			   jsonb_array_elements("disaster_records"."spatial_footprint")->'geojson'->'properties'->>'division_id' AS division_id,
			   "disaster_records"."start_date" AS start_date
		FROM "disaster_records"
		${subqueryWhereClause}
	  ) ds
	  LEFT JOIN "sector_disaster_records_relation" sdr 
		ON ds.record_id = sdr.disaster_record_id
	  LEFT JOIN division_hierarchy dh 
		ON ds.division_id = dh.id::text
	  WHERE ds.division_id IS NOT NULL
	  ${
			geographicLevelId
				? sql`AND dh.level1_id IN (
		SELECT level1_id 
		FROM division_hierarchy 
		WHERE id = ${geographicLevelId}
	  )`
				: sql``
		}
	  GROUP BY 
		EXTRACT(YEAR FROM CASE 
		  WHEN ds.start_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(ds.start_date, 'YYYY-MM-DD')
		  WHEN ds.start_date ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE(ds.start_date, 'YYYY-MM')
		  WHEN ds.start_date ~ '^[0-9]{4}$' THEN TO_DATE(ds.start_date, 'YYYY')
		  ELSE NULL
		END)::integer
	  ORDER BY year ASC
	`;

	// Execute the query
	const result = await dr.execute(rawQuery);

	return result.rows.map((row: any) => ({
		year: Number(row.year),
		totalLosses: Number(row.total_losses),
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

	// Build WHERE conditions for disaster_records as SQL objects
	const whereConditions: SQL[] = [];
	whereConditions.push(sql`"approvalStatus" = ${"published"}`);
	if (hazardTypeId) whereConditions.push(sql`"hip_type_id" = ${hazardTypeId}`);
	if (hazardClusterId)
		whereConditions.push(sql`"hip_cluster_id" = ${hazardClusterId}`);
	if (specificHazardId)
		whereConditions.push(sql`"hip_hazard_id" = ${specificHazardId}`);
	if (fromDate || toDate) {
		const from = fromDate || "0001-01-01";
		const to = toDate || "9999-12-31";
		whereConditions.push(sql`
		(
		  CASE 
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM-DD')
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM')
			WHEN "start_date" ~ '^[0-9]{4}$' THEN TO_DATE("start_date", 'YYYY')
			ELSE NULL
		  END IS NULL OR 
		  CASE 
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM-DD')
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM')
			WHEN "start_date" ~ '^[0-9]{4}$' THEN TO_DATE("start_date", 'YYYY')
			ELSE NULL
		  END <= ${to}::date
		) AND (
		  CASE 
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM-DD')
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM')
			WHEN "end_date" ~ '^[0-9]{4}$' THEN TO_DATE("end_date", 'YYYY')
			ELSE NULL
		  END IS NULL OR 
		  CASE 
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM-DD')
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM')
			WHEN "end_date" ~ '^[0-9]{4}$' THEN TO_DATE("end_date", 'YYYY')
			ELSE NULL
		  END >= ${from}::date
		)
	  `);
	}

	// Combine conditions into a single WHERE clause for the subquery
	const subqueryWhereClause =
		whereConditions.length > 0 ? sql`WHERE ${and(...whereConditions)}` : sql``;

	// Construct the full raw SQL query
	const rawQuery = sql`
	  WITH RECURSIVE division_hierarchy AS (
		SELECT id, parent_id, id AS level1_id
		FROM "division"
		WHERE parent_id IS NULL
		UNION ALL
		SELECT d.id, d.parent_id, dh.level1_id
		FROM "division" d
		INNER JOIN division_hierarchy dh ON d.parent_id = dh.id
	  )
	  SELECT 
		dh.level1_id::text AS division_id,
		COALESCE(SUM(sdr.damage_cost), 0) AS total_damages
	  FROM (
		SELECT "id" AS record_id, jsonb_array_elements("spatial_footprint")->'geojson'->'properties'->>'division_id' AS division_id
		FROM "disaster_records"
		${subqueryWhereClause}
	  ) ds
	  LEFT JOIN "sector_disaster_records_relation" sdr 
		ON ds.record_id = sdr.disaster_record_id
	  LEFT JOIN division_hierarchy dh 
		ON ds.division_id = dh.id::text
	  WHERE ds.division_id IS NOT NULL
	  ${
			geographicLevelId
				? sql`AND dh.level1_id IN (
		SELECT level1_id 
		FROM division_hierarchy 
		WHERE id = ${geographicLevelId}
	  )`
				: sql``
		}
	  GROUP BY dh.level1_id
	`;

	// Execute the query
	const result = await dr.execute(rawQuery);

	return result.rows.map((row: any) => ({
		divisionId: row.division_id,
		totalDamages: Number(row.total_damages),
	}));
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

	// Build WHERE conditions for disaster_records as SQL objects
	const whereConditions: SQL[] = [];
	whereConditions.push(sql`"approvalStatus" = ${"published"}`);
	if (hazardTypeId) whereConditions.push(sql`"hip_type_id" = ${hazardTypeId}`);
	if (hazardClusterId)
		whereConditions.push(sql`"hip_cluster_id" = ${hazardClusterId}`);
	if (specificHazardId)
		whereConditions.push(sql`"hip_hazard_id" = ${specificHazardId}`);
	if (fromDate || toDate) {
		const from = fromDate || "0001-01-01";
		const to = toDate || "9999-12-31";
		whereConditions.push(sql`
		(
		  CASE 
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM-DD')
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM')
			WHEN "start_date" ~ '^[0-9]{4}$' THEN TO_DATE("start_date", 'YYYY')
			ELSE NULL
		  END IS NULL OR 
		  CASE 
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM-DD')
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM')
			WHEN "start_date" ~ '^[0-9]{4}$' THEN TO_DATE("start_date", 'YYYY')
			ELSE NULL
		  END <= ${to}::date
		) AND (
		  CASE 
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM-DD')
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM')
			WHEN "end_date" ~ '^[0-9]{4}$' THEN TO_DATE("end_date", 'YYYY')
			ELSE NULL
		  END IS NULL OR 
		  CASE 
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM-DD')
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM')
			WHEN "end_date" ~ '^[0-9]{4}$' THEN TO_DATE("end_date", 'YYYY')
			ELSE NULL
		  END >= ${from}::date
		)
	  `);
	}

	// Combine conditions into a single WHERE clause for the subquery
	const subqueryWhereClause =
		whereConditions.length > 0 ? sql`WHERE ${and(...whereConditions)}` : sql``;

	// Construct the full raw SQL query
	const rawQuery = sql`
	  WITH RECURSIVE division_hierarchy AS (
		SELECT id, parent_id, id AS level1_id
		FROM "division"
		WHERE parent_id IS NULL
		UNION ALL
		SELECT d.id, d.parent_id, dh.level1_id
		FROM "division" d
		INNER JOIN division_hierarchy dh ON d.parent_id = dh.id
	  )
	  SELECT 
		dh.level1_id::text AS division_id,
		COALESCE(SUM(sdr.losses_cost), 0) AS total_losses
	  FROM (
		SELECT "id" AS record_id, jsonb_array_elements("spatial_footprint")->'geojson'->'properties'->>'division_id' AS division_id
		FROM "disaster_records"
		${subqueryWhereClause}
	  ) ds
	  LEFT JOIN "sector_disaster_records_relation" sdr 
		ON ds.record_id = sdr.disaster_record_id
	  LEFT JOIN division_hierarchy dh 
		ON ds.division_id = dh.id::text
	  WHERE ds.division_id IS NOT NULL
	  ${
			geographicLevelId
				? sql`AND dh.level1_id IN (
		SELECT level1_id 
		FROM division_hierarchy 
		WHERE id = ${geographicLevelId}
	  )`
				: sql``
		}
	  GROUP BY dh.level1_id
	`;

	// Execute the query
	const result = await dr.execute(rawQuery);

	return result.rows.map((row: any) => ({
		divisionId: row.division_id,
		totalLosses: Number(row.total_losses),
	}));
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

	// Build WHERE conditions for disaster_records as SQL objects
	const whereConditions: SQL[] = [];
	whereConditions.push(sql`"approvalStatus" = ${"published"}`);
	if (hazardTypeId) whereConditions.push(sql`"hip_type_id" = ${hazardTypeId}`);
	if (hazardClusterId)
		whereConditions.push(sql`"hip_cluster_id" = ${hazardClusterId}`);
	if (specificHazardId)
		whereConditions.push(sql`"hip_hazard_id" = ${specificHazardId}`);
	if (fromDate || toDate) {
		const from = fromDate || "0001-01-01";
		const to = toDate || "9999-12-31";
		whereConditions.push(sql`
		(
		  CASE 
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM-DD')
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM')
			WHEN "start_date" ~ '^[0-9]{4}$' THEN TO_DATE("start_date", 'YYYY')
			ELSE NULL
		  END IS NULL OR 
		  CASE 
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM-DD')
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM')
			WHEN "start_date" ~ '^[0-9]{4}$' THEN TO_DATE("start_date", 'YYYY')
			ELSE NULL
		  END <= ${to}::date
		) AND (
		  CASE 
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM-DD')
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM')
			WHEN "end_date" ~ '^[0-9]{4}$' THEN TO_DATE("end_date", 'YYYY')
			ELSE NULL
		  END IS NULL OR 
		  CASE 
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM-DD')
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM')
			WHEN "end_date" ~ '^[0-9]{4}$' THEN TO_DATE("end_date", 'YYYY')
			ELSE NULL
		  END >= ${from}::date
		)
	  `);
	}

	// Conditions for human_dsg: all specified fields are NULL and custom is {}
	const humanDsgConditions = sql`
	  "human_dsg"."sex" IS NULL AND
	  "human_dsg"."age" IS NULL AND
	  "human_dsg"."disability" IS NULL AND
	  "human_dsg"."global_poverty_line" IS NULL AND
	  "human_dsg"."national_poverty_line" IS NULL AND
	  "human_dsg"."custom" = '{}'::jsonb
	`;

	// Combine all conditions into a single WHERE clause for the subquery
	const subqueryWhereClause = sql`WHERE ${and(
		...whereConditions
	)} AND ${humanDsgConditions}`;

	// Construct the full raw SQL query
	const rawQuery = sql`
	  WITH RECURSIVE division_hierarchy AS (
		SELECT id, parent_id, id AS level1_id
		FROM "division"
		WHERE parent_id IS NULL
		UNION ALL
		SELECT d.id, d.parent_id, dh.level1_id
		FROM "division" d
		INNER JOIN division_hierarchy dh ON d.parent_id = dh.id
	  )
	  SELECT 
		dh.level1_id::text AS division_id,
		COALESCE(SUM(ds.deaths), 0) AS total_deaths
	  FROM (
		SELECT 
		  "disaster_records"."id" AS record_id, 
		  jsonb_array_elements("disaster_records"."spatial_footprint")->'geojson'->'properties'->>'division_id' AS division_id,
		  "deaths"."deaths" AS deaths
		FROM "disaster_records"
		LEFT JOIN "human_dsg" ON "disaster_records"."id" = "human_dsg"."record_id"
		LEFT JOIN "deaths" ON "human_dsg"."id" = "deaths"."dsg_id"
		${subqueryWhereClause}
	  ) ds
	  LEFT JOIN division_hierarchy dh 
		ON ds.division_id = dh.id::text
	  WHERE ds.division_id IS NOT NULL
	  ${
			geographicLevelId
				? sql`AND dh.level1_id IN (
		SELECT level1_id 
		FROM division_hierarchy 
		WHERE id = ${geographicLevelId}
	  )`
				: sql``
		}
	  GROUP BY dh.level1_id
	`;

	// Execute the query
	const result = await dr.execute(rawQuery);

	return result.rows.map((row: any) => ({
		divisionId: row.division_id,
		totalDeaths: Number(row.total_deaths),
	}));
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

	// Build WHERE conditions for disaster_records as SQL objects
	const whereConditions: SQL[] = [];
	whereConditions.push(sql`"approvalStatus" = ${"published"}`);
	if (hazardTypeId) whereConditions.push(sql`"hip_type_id" = ${hazardTypeId}`);
	if (hazardClusterId)
		whereConditions.push(sql`"hip_cluster_id" = ${hazardClusterId}`);
	if (specificHazardId)
		whereConditions.push(sql`"hip_hazard_id" = ${specificHazardId}`);
	if (fromDate || toDate) {
		const from = fromDate || "0001-01-01";
		const to = toDate || "9999-12-31";
		whereConditions.push(sql`
		(
		  CASE 
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM-DD')
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM')
			WHEN "start_date" ~ '^[0-9]{4}$' THEN TO_DATE("start_date", 'YYYY')
			ELSE NULL
		  END IS NULL OR 
		  CASE 
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM-DD')
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM')
			WHEN "start_date" ~ '^[0-9]{4}$' THEN TO_DATE("start_date", 'YYYY')
			ELSE NULL
		  END <= ${to}::date
		) AND (
		  CASE 
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM-DD')
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM')
			WHEN "end_date" ~ '^[0-9]{4}$' THEN TO_DATE("end_date", 'YYYY')
			ELSE NULL
		  END IS NULL OR 
		  CASE 
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM-DD')
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM')
			WHEN "end_date" ~ '^[0-9]{4}$' THEN TO_DATE("end_date", 'YYYY')
			ELSE NULL
		  END >= ${from}::date
		)
	  `);
	}

	// Conditions for human_dsg: all specified fields are NULL and custom is {}
	const humanDsgConditions = sql`
	  "human_dsg"."sex" IS NULL AND
	  "human_dsg"."age" IS NULL AND
	  "human_dsg"."disability" IS NULL AND
	  "human_dsg"."global_poverty_line" IS NULL AND
	  "human_dsg"."national_poverty_line" IS NULL AND
	  "human_dsg"."custom" = '{}'::jsonb
	`;

	// Combine all conditions into a single WHERE clause for the subquery
	const subqueryWhereClause = sql`WHERE ${and(
		...whereConditions
	)} AND ${humanDsgConditions}`;

	// Construct the full raw SQL query
	const rawQuery = sql`
	  WITH RECURSIVE division_hierarchy AS (
		SELECT id, parent_id, id AS level1_id
		FROM "division"
		WHERE parent_id IS NULL
		UNION ALL
		SELECT d.id, d.parent_id, dh.level1_id
		FROM "division" d
		INNER JOIN division_hierarchy dh ON d.parent_id = dh.id
	  )
	  SELECT 
		dh.level1_id::text AS division_id,
		COALESCE(SUM(ds.total_affected), 0) AS total_affected
	  FROM (
		SELECT 
		  "disaster_records"."id" AS record_id, 
		  jsonb_array_elements("disaster_records"."spatial_footprint")->'geojson'->'properties'->>'division_id' AS division_id,
		  COALESCE("injured"."injured", 0) +
		  COALESCE("missing"."missing", 0) +
		  COALESCE("displaced"."displaced", 0) +
		  COALESCE("affected"."direct", 0) +
		  COALESCE("affected"."indirect", 0) AS total_affected
		FROM "disaster_records"
		LEFT JOIN "human_dsg" ON "disaster_records"."id" = "human_dsg"."record_id"
		LEFT JOIN "injured" ON "human_dsg"."id" = "injured"."dsg_id"
		LEFT JOIN "missing" ON "human_dsg"."id" = "missing"."dsg_id"
		LEFT JOIN "displaced" ON "human_dsg"."id" = "displaced"."dsg_id"
		LEFT JOIN "affected" ON "human_dsg"."id" = "affected"."dsg_id"
		${subqueryWhereClause}
	  ) ds
	  LEFT JOIN division_hierarchy dh 
		ON ds.division_id = dh.id::text
	  WHERE ds.division_id IS NOT NULL
	  ${
			geographicLevelId
				? sql`AND dh.level1_id IN (
		SELECT level1_id 
		FROM division_hierarchy 
		WHERE id = ${geographicLevelId}
	  )`
				: sql``
		}
	  GROUP BY dh.level1_id
	`;

	// Execute the query
	const result = await dr.execute(rawQuery);

	return result.rows.map((row: any) => ({
		divisionId: row.division_id,
		totalAffected: Number(row.total_affected),
	}));
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

	// Build WHERE conditions for disaster_event as SQL objects
	const whereConditions: SQL[] = [];
	whereConditions.push(sql`"approvalStatus" = ${"published"}`);
	if (hazardTypeId) whereConditions.push(sql`"hip_type_id" = ${hazardTypeId}`);
	if (hazardClusterId)
		whereConditions.push(sql`"hip_cluster_id" = ${hazardClusterId}`);
	if (specificHazardId)
		whereConditions.push(sql`"hip_hazard_id" = ${specificHazardId}`);
	if (fromDate || toDate) {
		const from = fromDate || "0001-01-01";
		const to = toDate || "9999-12-31";
		whereConditions.push(sql`
		(
		  CASE 
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM-DD')
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM')
			WHEN "start_date" ~ '^[0-9]{4}$' THEN TO_DATE("start_date", 'YYYY')
			ELSE NULL
		  END IS NULL OR 
		  CASE 
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM-DD')
			WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM')
			WHEN "start_date" ~ '^[0-9]{4}$' THEN TO_DATE("start_date", 'YYYY')
			ELSE NULL
		  END <= ${to}::date
		) AND (
		  CASE 
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM-DD')
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM')
			WHEN "end_date" ~ '^[0-9]{4}$' THEN TO_DATE("end_date", 'YYYY')
			ELSE NULL
		  END IS NULL OR 
		  CASE 
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM-DD')
			WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM')
			WHEN "end_date" ~ '^[0-9]{4}$' THEN TO_DATE("end_date", 'YYYY')
			ELSE NULL
		  END >= ${from}::date
		)
	  `);
	}

	// Combine conditions into a single WHERE clause for the subquery
	const subqueryWhereClause =
		whereConditions.length > 0 ? sql`WHERE ${and(...whereConditions)}` : sql``;

	// Construct the full raw SQL query
	const rawQuery = sql`
	  WITH RECURSIVE division_hierarchy AS (
		SELECT id, parent_id, id AS level1_id
		FROM "division"
		WHERE parent_id IS NULL
		UNION ALL
		SELECT d.id, d.parent_id, dh.level1_id
		FROM "division" d
		INNER JOIN division_hierarchy dh ON d.parent_id = dh.id
	  )
	  SELECT 
		dh.level1_id::text AS division_id,
		COUNT(DISTINCT ds.record_id) AS event_count
	  FROM (
		SELECT "id" AS record_id, jsonb_array_elements("spatial_footprint")->'geojson'->'properties'->>'division_id' AS division_id
		FROM "disaster_event"
		${subqueryWhereClause}
	  ) ds
	  LEFT JOIN division_hierarchy dh 
		ON ds.division_id = dh.id::text
	  WHERE ds.division_id IS NOT NULL
	  ${
			geographicLevelId
				? sql`AND dh.level1_id IN (
		SELECT level1_id 
		FROM division_hierarchy 
		WHERE id = ${geographicLevelId}
	  )`
				: sql``
		}
	  GROUP BY dh.level1_id
	`;

	// Execute the query
	const result = await dr.execute(rawQuery);

	return result.rows.map((row: any) => ({
		divisionId: row.division_id,
		eventCount: Number(row.event_count),
	}));
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

export async function getDisasterSummary(
	filters: HazardFilters
): Promise<DisasterSummary[]> {
	const {
		hazardTypeId,
		hazardClusterId,
		specificHazardId,
		geographicLevelId,
		fromDate,
		toDate,
	} = filters;

	// Build WHERE conditions for disaster_event
	const eventConditions = [eq(disasterEventTable.approvalStatus, "published")];

	if (hazardTypeId)
		eventConditions.push(eq(disasterEventTable.hipTypeId, hazardTypeId));
	if (hazardClusterId)
		eventConditions.push(eq(disasterEventTable.hipClusterId, hazardClusterId));
	if (specificHazardId)
		eventConditions.push(eq(disasterEventTable.hipHazardId, specificHazardId));
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
		.leftJoin(
			humanDsgTable,
			eq(disasterRecordsTable.id, humanDsgTable.recordId)
		)
		.leftJoin(missingTable, eq(humanDsgTable.id, missingTable.dsgId))
		.leftJoin(displacedTable, eq(humanDsgTable.id, displacedTable.dsgId))
		.leftJoin(injuredTable, eq(humanDsgTable.id, injuredTable.dsgId))
		.leftJoin(affectedTable, eq(humanDsgTable.id, affectedTable.dsgId))
		.where(
			and(
				eq(disasterRecordsTable.approvalStatus, "published"),
				humanDsgConditions
			)
		)
		.groupBy(disasterRecordsTable.disasterEventId)
		.as("affected_subquery");

	// Subquery for provinces
	const provincesSubquery = dr
		.select({
			disasterId: disasterEventTable.id,
			provinceName:
				sql<string>`jsonb_array_elements(${disasterEventTable.spatialFootprint})->'geojson'->'properties'->'name'->>'en'`.as(
					"province_name"
				),
		})
		.from(disasterEventTable)
		.where(and(...eventConditions))
		.as("provinces_subquery");

	const provincesAggQuery = dr
		.select({
			disasterId: provincesSubquery.disasterId,
			provinceAffected:
				sql<string>`string_agg(DISTINCT ${provincesSubquery.provinceName}, ', ')`.as(
					"province_affected"
				),
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
			totalDamages:
				sql<number>`COALESCE(SUM(${sectorDisasterRecordsRelationTable.damageCost}), 0)`.as(
					"total_damages"
				),
			totalLosses:
				sql<number>`COALESCE(SUM(${sectorDisasterRecordsRelationTable.lossesCost}), 0)`.as(
					"total_losses"
				),
			totalAffectedPeople:
				sql<number>`COALESCE(${affectedSubquery.totalAffected}, 0)`.as(
					"total_affected_people"
				),
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
			eq(
				disasterRecordsTable.id,
				sectorDisasterRecordsRelationTable.disasterRecordId
			)
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
