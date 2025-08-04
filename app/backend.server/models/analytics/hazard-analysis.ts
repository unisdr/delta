import { and, SQL, sql } from "drizzle-orm";
import { dr } from "~/db.server";
import createLogger from "~/utils/logger.server";

// Initialize logger for this module
const logger = createLogger("backend.server/models/analytics/hazard-analysis");

interface HazardFilters {
	countryAccountsId: string;
	hazardTypeId: string | null;
	hazardClusterId: string | null;
	specificHazardId: string | null;
	geographicLevelId: string | null;
	fromDate: string | null;
	toDate: string | null;
}

/**
 * Retrieves the count of disaster event records based on the provided filters.
 * @param filters - Object containing filter values from HazardFilters including tenant context
 * @returns Promise<number> - The count of matching disaster events
 */
export async function getDisasterEventCount(
	filters: HazardFilters
): Promise<number> {
	const {
		countryAccountsId,
		hazardTypeId,
		hazardClusterId,
		specificHazardId,
		geographicLevelId,
		fromDate,
		toDate,
	} = filters;

	logger.debug(`Getting disaster event count for tenant ${countryAccountsId}`);

	// Build WHERE conditions for disaster_event as SQL objects
	const whereConditions: SQL[] = [];
	whereConditions.push(sql`"approvalStatus" = ${"published"}`);
	whereConditions.push(sql`"country_accounts_id" = ${countryAccountsId}`);
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
	  ${geographicLevelId
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
		countryAccountsId,
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
	whereConditions.push(sql`"country_accounts_id" = ${countryAccountsId}`);
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
		countryAccountsId,
		hazardTypeId,
		hazardClusterId,
		specificHazardId,
		geographicLevelId,
		fromDate,
		toDate,
	} = filters;

	logger.debug(`Getting affected people by hazard filters for tenant ${countryAccountsId}`);

	// Build WHERE conditions for disaster_records as SQL objects
	const whereConditions: SQL[] = [];
	whereConditions.push(sql`"approvalStatus" = ${"published"}`);
	whereConditions.push(sql`"country_accounts_id" = ${countryAccountsId}`);
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

export async function getGenderTotalsByHazardFilters(filters: HazardFilters): Promise<GenderTotals> {
	const {
		countryAccountsId,
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
	whereConditions.push(sql`"country_accounts_id" = ${countryAccountsId}`);
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
		COALESCE(SUM(CASE WHEN hd.sex = 'm' THEN (
		  COALESCE(dth.deaths, 0) + 
		  COALESCE(mis.missing, 0) + 
		  COALESCE(aff.direct, 0) + 
		  COALESCE(aff.indirect, 0) + 
		  COALESCE(inj.injured, 0) + 
		  COALESCE(dsp.displaced, 0)
		) ELSE 0 END), 0) AS total_men,
		COALESCE(SUM(CASE WHEN hd.sex = 'f' THEN (
		  COALESCE(dth.deaths, 0) + 
		  COALESCE(mis.missing, 0) + 
		  COALESCE(aff.direct, 0) + 
		  COALESCE(aff.indirect, 0) + 
		  COALESCE(inj.injured, 0) + 
		  COALESCE(dsp.displaced, 0)
		) ELSE 0 END), 0) AS total_women,
		COALESCE(SUM(CASE WHEN hd.sex = 'o' THEN (
		  COALESCE(dth.deaths, 0) + 
		  COALESCE(mis.missing, 0) + 
		  COALESCE(aff.direct, 0) + 
		  COALESCE(aff.indirect, 0) + 
		  COALESCE(inj.injured, 0) + 
		  COALESCE(dsp.displaced, 0)
		) ELSE 0 END), 0) AS total_non_binary
	  FROM filtered_records fr
	  LEFT JOIN "human_dsg" hd 
		ON fr.record_id = hd.record_id
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
		totalMen: Number(row.total_men ?? 0),
		totalWomen: Number(row.total_women ?? 0),
		totalNonBinary: Number(row.total_non_binary ?? 0),
	};
}

interface AgeTotals {
	totalChildren: number;
	totalAdults: number;
	totalSeniors: number;
}

export async function getAgeTotalsByHazardFilters(filters: HazardFilters): Promise<AgeTotals> {
	const {
		countryAccountsId,
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
	whereConditions.push(sql`"country_accounts_id" = ${countryAccountsId}`);
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
		COALESCE(SUM(CASE WHEN hd.age = '0-14' THEN (
		  COALESCE(dth.deaths, 0) + 
		  COALESCE(mis.missing, 0) + 
		  COALESCE(aff.direct, 0) + 
		  COALESCE(aff.indirect, 0) + 
		  COALESCE(inj.injured, 0) + 
		  COALESCE(dsp.displaced, 0)
		) ELSE 0 END), 0) AS total_children,
		COALESCE(SUM(CASE WHEN hd.age = '15-64' THEN (
		  COALESCE(dth.deaths, 0) + 
		  COALESCE(mis.missing, 0) + 
		  COALESCE(aff.direct, 0) + 
		  COALESCE(aff.indirect, 0) + 
		  COALESCE(inj.injured, 0) + 
		  COALESCE(dsp.displaced, 0)
		) ELSE 0 END), 0) AS total_adults,
		COALESCE(SUM(CASE WHEN hd.age = '65+' THEN (
		  COALESCE(dth.deaths, 0) + 
		  COALESCE(mis.missing, 0) + 
		  COALESCE(aff.direct, 0) + 
		  COALESCE(aff.indirect, 0) + 
		  COALESCE(inj.injured, 0) + 
		  COALESCE(dsp.displaced, 0)
		) ELSE 0 END), 0) AS total_seniors
	  FROM filtered_records fr
	  LEFT JOIN "human_dsg" hd 
		ON fr.record_id = hd.record_id
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
		totalChildren: Number(row.total_children ?? 0),
		totalAdults: Number(row.total_adults ?? 0),
		totalSeniors: Number(row.total_seniors ?? 0),
	};
}

export async function getDisabilityTotalByHazardFilters(filters: HazardFilters): Promise<number> {
	const {
		countryAccountsId,
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
	whereConditions.push(sql`"country_accounts_id" = ${countryAccountsId}`);
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
		COALESCE(SUM(
		  COALESCE(dth.deaths, 0) + 
		  COALESCE(mis.missing, 0) + 
		  COALESCE(aff.direct, 0) + 
		  COALESCE(aff.indirect, 0) + 
		  COALESCE(inj.injured, 0) + 
		  COALESCE(dsp.displaced, 0)
		), 0) AS total_disability
	  FROM filtered_records fr
	  LEFT JOIN "human_dsg" hd 
		ON fr.record_id = hd.record_id
		AND hd.age IS NULL 
		AND hd.global_poverty_line IS NULL 
		AND hd.national_poverty_line IS NULL 
		AND hd.custom = '{}'::jsonb
		AND hd.disability IS NOT NULL 
		AND hd.disability != 'none'
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

	// Return the aggregated total
	const row = result.rows[0] || {};
	return Number(row.total_disability ?? 0);
}
export async function getInternationalPovertyTotalByHazardFilters(filters: HazardFilters): Promise<number> {
	const {
		countryAccountsId,
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
	whereConditions.push(sql`"country_accounts_id" = ${countryAccountsId}`);
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
		COALESCE(SUM(
		  COALESCE(deaths.deaths, 0) + 
		  COALESCE(missing.missing, 0) + 
		  COALESCE(affected.direct, 0) + 
		  COALESCE(affected.indirect, 0) + 
		  COALESCE(injured.injured, 0) + 
		  COALESCE(displaced.displaced, 0)
		), 0) AS total_poverty
	  FROM (
		SELECT "disaster_records"."id" AS record_id, 
			   jsonb_array_elements("disaster_records"."spatial_footprint")->'geojson'->'properties'->>'division_id' AS division_id
		FROM "disaster_records"
		${subqueryWhereClause}
	  ) ds
	  LEFT JOIN "human_dsg" hd 
		ON ds.record_id = hd.record_id
	  LEFT JOIN "deaths" deaths 
		ON hd.id = deaths.dsg_id
	  LEFT JOIN "missing" missing 
		ON hd.id = missing.dsg_id
	  LEFT JOIN "affected" affected 
		ON hd.id = affected.dsg_id
	  LEFT JOIN "injured" injured 
		ON hd.id = injured.dsg_id
	  LEFT JOIN "displaced" displaced 
		ON hd.id = displaced.dsg_id
	  LEFT JOIN division_hierarchy dh 
		ON ds.division_id = dh.id::text
	  WHERE ds.division_id IS NOT NULL
		AND hd.age IS NULL
		AND hd.disability IS NULL
		AND hd.national_poverty_line IS NULL
		AND hd.custom = '{}'::jsonb
		AND hd.global_poverty_line = 'below'
	  ${geographicLevelId ? sql`AND dh.level1_id IN (
		SELECT level1_id 
		FROM division_hierarchy 
		WHERE id = ${geographicLevelId}
	  )` : sql``}
	`;

	// Execute the query
	const result = await dr.execute(rawQuery);

	return Number(result.rows[0].total_poverty);
}

export async function getNationalPovertyTotalByHazardFilters(filters: HazardFilters): Promise<number> {
	const {
		countryAccountsId,
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
	whereConditions.push(sql`"country_accounts_id" = ${countryAccountsId}`);
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
		COALESCE(SUM(
		  COALESCE(deaths.deaths, 0) + 
		  COALESCE(missing.missing, 0) + 
		  COALESCE(affected.direct, 0) + 
		  COALESCE(affected.indirect, 0) + 
		  COALESCE(injured.injured, 0) + 
		  COALESCE(displaced.displaced, 0)
		), 0) AS total_poverty
	  FROM (
		SELECT "disaster_records"."id" AS record_id, 
			   jsonb_array_elements("disaster_records"."spatial_footprint")->'geojson'->'properties'->>'division_id' AS division_id
		FROM "disaster_records"
		${subqueryWhereClause}
	  ) ds
	  LEFT JOIN "human_dsg" hd 
		ON ds.record_id = hd.record_id
	  LEFT JOIN "deaths" deaths 
		ON hd.id = deaths.dsg_id
	  LEFT JOIN "missing" missing 
		ON hd.id = missing.dsg_id
	  LEFT JOIN "affected" affected 
		ON hd.id = affected.dsg_id
	  LEFT JOIN "injured" injured 
		ON hd.id = injured.dsg_id
	  LEFT JOIN "displaced" displaced 
		ON hd.id = displaced.dsg_id
	  LEFT JOIN division_hierarchy dh 
		ON ds.division_id = dh.id::text
	  WHERE ds.division_id IS NOT NULL
		AND hd.age IS NULL
		AND hd.disability IS NULL
		AND hd.global_poverty_line IS NULL
		AND hd.custom = '{}'::jsonb
		AND hd.national_poverty_line = 'below'
	  ${geographicLevelId ? sql`AND dh.level1_id IN (
		SELECT level1_id 
		FROM division_hierarchy 
		WHERE id = ${geographicLevelId}
	  )` : sql``}
	`;

	// Execute the query
	const result = await dr.execute(rawQuery);

	return Number(result.rows[0].total_poverty);
}

export async function getTotalDamagesByHazardFilters(
	filters: HazardFilters
): Promise<number> {
	const {
		countryAccountsId,
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
	whereConditions.push(sql`"country_accounts_id" = ${countryAccountsId}`);
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
	  ${geographicLevelId
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
		countryAccountsId,
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
	whereConditions.push(sql`"country_accounts_id" = ${countryAccountsId}`);
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
	  ${geographicLevelId
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
		countryAccountsId,
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
	whereConditions.push(sql`"country_accounts_id" = ${countryAccountsId}`);
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
	  ${geographicLevelId
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
		countryAccountsId,
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
	whereConditions.push(sql`"country_accounts_id" = ${countryAccountsId}`);
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
	  ${geographicLevelId
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
		countryAccountsId,
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
	whereConditions.push(sql`"country_accounts_id" = ${countryAccountsId}`);
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
	  ${geographicLevelId
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
		countryAccountsId,
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
	whereConditions.push(sql`"country_accounts_id" = ${countryAccountsId}`);
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
	  ${geographicLevelId
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
		countryAccountsId,
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
	whereConditions.push(sql`"country_accounts_id" = ${countryAccountsId}`);
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
	  ${geographicLevelId
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
		countryAccountsId,
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
	whereConditions.push(sql`"country_accounts_id" = ${countryAccountsId}`);
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
	  ${geographicLevelId
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
		countryAccountsId,
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
	whereConditions.push(sql`"country_accounts_id" = ${countryAccountsId}`);
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
	  ${geographicLevelId
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

export async function getDisasterSummary(filters: HazardFilters): Promise<DisasterSummary[]> {
	const {
		countryAccountsId,
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
	whereConditions.push(sql`"country_accounts_id" = ${countryAccountsId}`);
	if (hazardTypeId) whereConditions.push(sql`"hip_type_id" = ${hazardTypeId}`);
	if (hazardClusterId) whereConditions.push(sql`"hip_cluster_id" = ${hazardClusterId}`);
	if (specificHazardId) whereConditions.push(sql`"hip_hazard_id" = ${specificHazardId}`);
	if (fromDate || toDate) {
		const from = fromDate || "0001-01-01";
		const to = toDate || "9999-12-31";
		whereConditions.push(sql`"start_date" >= ${from} AND "end_date" <= ${to}`);
	}

	// Combine conditions for disaster_event (excluding geographicLevelId for now)
	const eventWhereClause = whereConditions.length > 0 ? sql`WHERE ${and(...whereConditions)}` : sql``;

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
	  filtered_events AS (
		SELECT DISTINCT de."id" AS disaster_id
		FROM "disaster_event" de
		CROSS JOIN jsonb_array_elements(de."spatial_footprint") AS sf
		LEFT JOIN division_hierarchy dh 
		  ON (sf->'geojson'->'properties'->>'division_id') = dh.id::text 
		  OR EXISTS (
			SELECT 1 
			FROM jsonb_array_elements_text(sf->'geojson'->'properties'->'division_ids') AS div_id 
			WHERE div_id = dh.id::text
		  )
		${eventWhereClause}
		${geographicLevelId ? sql`AND dh.level1_id IN (
		  SELECT level1_id 
		  FROM division_hierarchy 
		  WHERE id = ${geographicLevelId}
		)` : sql``}
	  ),
	  affected_people AS (
		SELECT 
		  dr."disaster_event_id",
		  COALESCE(SUM(
			COALESCE(mis.missing, 0) +
			COALESCE(dsp.displaced, 0) +
			COALESCE(inj.injured, 0) +
			COALESCE(aff.direct, 0)
		  ), 0) AS total_affected
		FROM "disaster_records" dr
		LEFT JOIN "human_dsg" hd 
		  ON dr."id" = hd."record_id"
		  AND hd."sex" IS NULL 
		  AND hd."age" IS NULL 
		  AND hd."disability" IS NULL 
		  AND hd."global_poverty_line" IS NULL 
		  AND hd."national_poverty_line" IS NULL 
		  AND hd."custom" = '{}'::jsonb
		LEFT JOIN "missing" mis 
		  ON hd."id" = mis."dsg_id"
		LEFT JOIN "displaced" dsp 
		  ON hd."id" = dsp."dsg_id"
		LEFT JOIN "injured" inj 
		  ON hd."id" = inj."dsg_id"
		LEFT JOIN "affected" aff 
		  ON hd."id" = aff."dsg_id"
		WHERE dr."approvalStatus" = 'published'
		GROUP BY dr."disaster_event_id"
	  ),
	  provinces AS (
		SELECT 
		  de."id" AS disaster_id,
		  STRING_AGG(DISTINCT (sf->'geojson'->'properties'->'name'->>'en'), ', ') AS province_affected
		FROM "disaster_event" de
		CROSS JOIN jsonb_array_elements(de."spatial_footprint") AS sf
		LEFT JOIN division_hierarchy dh 
		  ON (sf->'geojson'->'properties'->>'division_id') = dh.id::text 
		  OR EXISTS (
			SELECT 1 
			FROM jsonb_array_elements_text(sf->'geojson'->'properties'->'division_ids') AS div_id 
			WHERE div_id = dh.id::text
		  )
		${eventWhereClause}
		${geographicLevelId ? sql`AND dh.level1_id IN (
		  SELECT level1_id 
		  FROM division_hierarchy 
		  WHERE id = ${geographicLevelId}
		)` : sql``}
		GROUP BY de."id"
		HAVING STRING_AGG(DISTINCT (sf->'geojson'->'properties'->'name'->>'en'), ', ') IS NOT NULL
	  ),
	  filtered_records AS (
		SELECT 
		  dr."disaster_event_id",
		  dr."id" AS record_id
		FROM "disaster_records" dr
		CROSS JOIN jsonb_array_elements(dr."spatial_footprint") AS sf
		LEFT JOIN division_hierarchy dh 
		  ON (sf->'geojson'->'properties'->>'division_id') = dh.id::text
		WHERE dr."approvalStatus" = 'published'
		${geographicLevelId ? sql`AND dh.level1_id IN (
		  SELECT level1_id 
		  FROM division_hierarchy 
		  WHERE id = ${geographicLevelId}
		)` : sql``}
	  )
	  SELECT 
		de."id" AS disaster_id,
		COALESCE(de."name_national", 'Unnamed Disaster') AS disaster_name,
		de."start_date" AS start_date,
		de."end_date" AS end_date,
		COALESCE(pv."province_affected", '') AS province_affected,
		COALESCE(SUM(sdr."damage_cost"), 0) AS total_damages,
		COALESCE(SUM(sdr."losses_cost"), 0) AS total_losses,
		COALESCE(ap."total_affected", 0) AS total_affected_people
	  FROM filtered_events fe
	  INNER JOIN "disaster_event" de 
		ON fe."disaster_id" = de."id"
	  LEFT JOIN provinces pv 
		ON de."id" = pv."disaster_id"
	  LEFT JOIN filtered_records fr 
		ON de."id" = fr."disaster_event_id"
	  LEFT JOIN "sector_disaster_records_relation" sdr 
		ON fr."record_id" = sdr."disaster_record_id"
	  LEFT JOIN affected_people ap 
		ON de."id" = ap."disaster_event_id"
	  GROUP BY 
		de."id",
		de."name_national",
		de."start_date",
		de."end_date",
		pv."province_affected",
		ap."total_affected"
	`;

	// Execute the query
	const result = await dr.execute(rawQuery);

	// Map the result to DisasterSummary interface
	return result.rows.map((row) => ({
		disasterId: row.disaster_id as string,
		disasterName: row.disaster_name as string,
		startDate: row.start_date as string,
		endDate: row.end_date as string,
		provinceAffected: row.province_affected as string,
		totalDamages: Number(row.total_damages ?? 0),
		totalLosses: Number(row.total_losses ?? 0),
		totalAffectedPeople: Number(row.total_affected_people ?? 0),
	}));
}