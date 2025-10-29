import { and, eq, gte, lte, SQL, sql } from 'drizzle-orm';
import { dr } from '~/db.server';
import { disasterEventTable } from '~/drizzle/schema';

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
export async function getDisasterEventCount(filters: HazardFilters): Promise<number> {
	const {
		countryAccountsId,
		hazardTypeId,
		hazardClusterId,
		specificHazardId,
		geographicLevelId,
		fromDate,
		toDate,
	} = filters;

	const conditions: any[] = [
		eq(disasterEventTable.countryAccountsId, countryAccountsId),
		eq(disasterEventTable.approvalStatus, 'published'),
	];

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
			sql`jsonb_path_exists(
          ${disasterEventTable.spatialFootprint},
          concat(
            '$[*].geojson.properties.division_id ? (@ == "',
            ${geographicLevelId}::text,
            '")'
          )::jsonpath
        )`
		);
	}

	if (fromDate) {
		conditions.push(gte(disasterEventTable.startDate, fromDate));
	}

	if (toDate) {
		conditions.push(lte(disasterEventTable.endDate, toDate));
	}

	const result = await dr
		.select({
			disaster_count: sql<number>`count(*)`,
		})
		.from(disasterEventTable)
		.where(and(...conditions));

	return Number(result[0]?.disaster_count ?? 0);
}

export interface YearlyDisasterCount {
	year: number;
	count: number;
}

export async function getDisasterEventCountByYear(
	filters: HazardFilters
): Promise<YearlyDisasterCount[]> {
	const {
		countryAccountsId,
		hazardTypeId,
		hazardClusterId,
		specificHazardId,
		geographicLevelId,
		fromDate,
		toDate,
	} = filters;

	const conditions: any[] = [
		eq(disasterEventTable.countryAccountsId, countryAccountsId),
		eq(disasterEventTable.approvalStatus, 'published'),
	];

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
			sql`jsonb_path_exists(
        ${disasterEventTable.spatialFootprint},
        concat(
          '$[*].geojson.properties.division_id ? (@ == "',
          ${geographicLevelId}::text,
          '")'
        )::jsonpath
      )`
		);
	}

	if (fromDate) {
		conditions.push(gte(disasterEventTable.startDate, fromDate));
	}

	if (toDate) {
		conditions.push(lte(disasterEventTable.endDate, toDate));
	}

	const yearExpr = sql<number>`
  COALESCE(
    EXTRACT(YEAR FROM TO_DATE(
      ${disasterEventTable.endDate},
      CASE
        WHEN ${disasterEventTable.endDate} ~ '^[0-9]{4}$' THEN 'YYYY'
        WHEN ${disasterEventTable.endDate} ~ '^[0-9]{4}-[0-9]{2}$' THEN 'YYYY-MM'
        WHEN ${disasterEventTable.endDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN 'YYYY-MM-DD'
        ELSE NULL
      END
    )),
    0
  )
`;

	const result = await dr
		.select({
			year: yearExpr,
			disaster_count: sql<number>`COUNT(*)`,
		})
		.from(disasterEventTable)
		.where(and(...conditions))
		.groupBy(yearExpr)
		.orderBy(yearExpr);

	return result.map((r) => ({
		year: Number(r.year),
		count: Number(r.disaster_count),
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
		countryAccountsId,
		hazardTypeId,
		hazardClusterId,
		specificHazardId,
		geographicLevelId,
		fromDate,
		toDate,
	} = filters;

	const whereConditions: SQL[] = [];
	whereConditions.push(sql`"approvalStatus" = ${'published'}`);
	whereConditions.push(sql`"country_accounts_id" = ${countryAccountsId}`);

	if (hazardTypeId) whereConditions.push(sql`"hip_type_id" = ${hazardTypeId}`);
	if (hazardClusterId) whereConditions.push(sql`"hip_cluster_id" = ${hazardClusterId}`);
	if (specificHazardId) whereConditions.push(sql`"hip_hazard_id" = ${specificHazardId}`);

	if (fromDate || toDate) {
		const from = fromDate || '0001-01-01';
		const to = toDate || '9999-12-31';
		whereConditions.push(sql`
      (
        CASE 
          WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM-DD')
          WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM')
          WHEN "start_date" ~ '^[0-9]{4}$' THEN TO_DATE("start_date", 'YYYY')
          ELSE NULL
        END <= ${to}::date
      )
      AND (
        CASE 
          WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM-DD')
          WHEN "end_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("end_date", 'YYYY-MM')
          WHEN "end_date" ~ '^[0-9]{4}$' THEN TO_DATE("end_date", 'YYYY')
          ELSE NULL
        END >= ${from}::date
      )
    `);
	}

	const allConditions = [...whereConditions];
	if (geographicLevelId) {
		allConditions.push(sql`
      dh.level1_id IN (
        SELECT level1_id 
        FROM division_hierarchy 
        WHERE id = ${geographicLevelId}
      )
    `);
	}

	const combinedWhereClause =
		allConditions.length > 0 ? sql`WHERE ${and(...allConditions)}` : sql``;

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
      LEFT JOIN LATERAL (
        SELECT jsonb_array_elements(dr."spatial_footprint") AS sf
      ) sf_data ON TRUE
      LEFT JOIN division_hierarchy dh 
        ON (sf_data.sf->'geojson'->'properties'->>'division_id') = dh.id::text 
        OR EXISTS (
          SELECT 1 
          FROM jsonb_array_elements_text(sf_data.sf->'geojson'->'properties'->'division_ids') AS div_id 
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

	const result = await dr.execute(rawQuery);
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
	whereConditions.push(sql`"approvalStatus" = ${'published'}`);
	whereConditions.push(sql`"country_accounts_id" = ${countryAccountsId}`);
	if (hazardTypeId) whereConditions.push(sql`"hip_type_id" = ${hazardTypeId}`);
	if (hazardClusterId) whereConditions.push(sql`"hip_cluster_id" = ${hazardClusterId}`);
	if (specificHazardId) whereConditions.push(sql`"hip_hazard_id" = ${specificHazardId}`);
	if (fromDate || toDate) {
		const from = fromDate || '0001-01-01';
		const to = toDate || '9999-12-31';
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
	const combinedWhereClause =
		allConditions.length > 0 ? sql`WHERE ${and(...allConditions)}` : sql``;

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
	whereConditions.push(sql`"approvalStatus" = ${'published'}`);
	whereConditions.push(sql`"country_accounts_id" = ${countryAccountsId}`);
	if (hazardTypeId) whereConditions.push(sql`"hip_type_id" = ${hazardTypeId}`);
	if (hazardClusterId) whereConditions.push(sql`"hip_cluster_id" = ${hazardClusterId}`);
	if (specificHazardId) whereConditions.push(sql`"hip_hazard_id" = ${specificHazardId}`);
	if (fromDate || toDate) {
		const from = fromDate || '0001-01-01';
		const to = toDate || '9999-12-31';
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
	const combinedWhereClause =
		allConditions.length > 0 ? sql`WHERE ${and(...allConditions)}` : sql``;

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
	whereConditions.push(sql`"approvalStatus" = ${'published'}`);
	whereConditions.push(sql`"country_accounts_id" = ${countryAccountsId}`);
	if (hazardTypeId) whereConditions.push(sql`"hip_type_id" = ${hazardTypeId}`);
	if (hazardClusterId) whereConditions.push(sql`"hip_cluster_id" = ${hazardClusterId}`);
	if (specificHazardId) whereConditions.push(sql`"hip_hazard_id" = ${specificHazardId}`);
	if (fromDate || toDate) {
		const from = fromDate || '0001-01-01';
		const to = toDate || '9999-12-31';
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
	const combinedWhereClause =
		allConditions.length > 0 ? sql`WHERE ${and(...allConditions)}` : sql``;

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
export async function getInternationalPovertyTotalByHazardFilters(
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
	whereConditions.push(sql`"approvalStatus" = ${'published'}`);
	whereConditions.push(sql`"country_accounts_id" = ${countryAccountsId}`);
	if (hazardTypeId) whereConditions.push(sql`"hip_type_id" = ${hazardTypeId}`);
	if (hazardClusterId) whereConditions.push(sql`"hip_cluster_id" = ${hazardClusterId}`);
	if (specificHazardId) whereConditions.push(sql`"hip_hazard_id" = ${specificHazardId}`);
	if (fromDate || toDate) {
		const from = fromDate || '0001-01-01';
		const to = toDate || '9999-12-31';
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

	return Number(result.rows[0].total_poverty);
}

export async function getNationalPovertyTotalByHazardFilters(
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
	whereConditions.push(sql`"approvalStatus" = ${'published'}`);
	whereConditions.push(sql`"country_accounts_id" = ${countryAccountsId}`);
	if (hazardTypeId) whereConditions.push(sql`"hip_type_id" = ${hazardTypeId}`);
	if (hazardClusterId) whereConditions.push(sql`"hip_cluster_id" = ${hazardClusterId}`);
	if (specificHazardId) whereConditions.push(sql`"hip_hazard_id" = ${specificHazardId}`);
	if (fromDate || toDate) {
		const from = fromDate || '0001-01-01';
		const to = toDate || '9999-12-31';
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

	return Number(result.rows[0].total_poverty);
}

export async function getTotalDamagesByHazardFilters(filters: HazardFilters): Promise<number> {
	const disasterRecords = (await getFilteredDisasterRecords(filters)) as Array<{ id: string }>;
	if (!disasterRecords.length) return 0;

	const disasterIds: string[] = disasterRecords.map((d) => d.id);
	const disasterIdsList = disasterIds.map((id) => `'${id}'`).join(',');

	// Fetch all SDR rows for these disaster records
	const sdrRes = await dr.execute(sql`
    SELECT disaster_record_id, sector_id, damage_cost
    FROM sector_disaster_records_relation
    WHERE disaster_record_id = ANY(ARRAY[${sql.raw(disasterIdsList)}]::uuid[])
  `);

	const sdrRows = sdrRes.rows as Array<{
		disaster_record_id: string;
		sector_id: string;
		damage_cost: string | number | null;
	}>;

	// Group SDR rows by disaster_record_id
	const sdrByRecord = new Map<string, Array<{ sector_id: string; damage_cost: number | null }>>();
	for (const row of sdrRows) {
		const list = sdrByRecord.get(row.disaster_record_id) ?? [];
		list.push({
			sector_id: row.sector_id,
			damage_cost:
				row.damage_cost == null || row.damage_cost === '' ? null : Number(row.damage_cost),
		});
		sdrByRecord.set(row.disaster_record_id, list);
	}

	let totalDamages = 0;

	for (const record of disasterRecords) {
		const sdrList = sdrByRecord.get(String(record.id)) ?? [];

		for (const sdr of sdrList) {
			if (sdr.damage_cost != null) {
				totalDamages += sdr.damage_cost;
			} else {
				// Fallback: sum damages.total_repair_replacement for this disaster_record_id and sector_id
				const damagesRes = await dr.execute(sql`
          SELECT total_repair_replacement
          FROM damages
          WHERE record_id = ${record.id} AND sector_id = ${sdr.sector_id}
        `);

				const damagesRows = damagesRes.rows as Array<{
					total_repair_replacement: string | number | null;
				}>;
				for (const d of damagesRows) {
					if (d.total_repair_replacement != null) {
						totalDamages += Number(d.total_repair_replacement);
					}
				}
			}
		}
	}

	return totalDamages;
}

export async function getFilteredDisasterRecords(filters: HazardFilters) {
	const { countryAccountsId, hazardTypeId, hazardClusterId, specificHazardId, fromDate, toDate } =
		filters;

	// Build WHERE conditions
	const whereConditions: SQL[] = [
		sql`"approvalStatus" = ${'published'}`,
		sql`"country_accounts_id" = ${countryAccountsId}`,
	];

	if (hazardTypeId) whereConditions.push(sql`"hip_type_id" = ${hazardTypeId}`);
	if (hazardClusterId) whereConditions.push(sql`"hip_cluster_id" = ${hazardClusterId}`);
	if (specificHazardId) whereConditions.push(sql`"hip_hazard_id" = ${specificHazardId}`);

	if (fromDate || toDate) {
		const from = fromDate || '0001-01-01';
		const to = toDate || '9999-12-31';
		whereConditions.push(sql`
      (
        CASE 
          WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE("start_date", 'YYYY-MM-DD')
          WHEN "start_date" ~ '^[0-9]{4}-[0-9]{2}$' THEN TO_DATE("start_date" || '-01', 'YYYY-MM-DD')
          WHEN "start_date" ~ '^[0-9]{4}$' THEN TO_DATE("start_date" || '-01-01', 'YYYY-MM-DD')
          ELSE NULL
        END 
        BETWEEN ${from}::date AND ${to}::date
      )
    `);
	}

	const whereClause = whereConditions.length ? sql`WHERE ${and(...whereConditions)}` : sql``;

	// Fetch matching disaster_records
	const query = sql`
    SELECT id, spatial_footprint, hip_type_id, hip_cluster_id, hip_hazard_id, start_date, end_date
    FROM disaster_records
    ${whereClause}
  `;

	const result = await dr.execute(query);

	// Return array of disaster_records
	return result.rows;
}

export async function getTotalLossesByHazardFilters(filters: HazardFilters): Promise<number> {
	const disasterRecords = (await getFilteredDisasterRecords(filters)) as Array<{ id: string }>;
	if (!disasterRecords.length) return 0;

	const disasterIds: string[] = disasterRecords.map((d) => d.id);
	const disasterIdsList = disasterIds.map((id) => `'${id}'`).join(',');

	// Fetch all SDR rows for these disaster records
	const sdrRes = await dr.execute(sql`
    SELECT disaster_record_id, sector_id, losses_cost
    FROM sector_disaster_records_relation
    WHERE disaster_record_id = ANY(ARRAY[${sql.raw(disasterIdsList)}]::uuid[])
  `);

	const sdrRows = sdrRes.rows as Array<{
		disaster_record_id: string;
		sector_id: string;
		losses_cost: string | number | null;
	}>;

	// Group SDR rows by disaster_record_id
	const sdrByRecord = new Map<string, Array<{ sector_id: string; losses_cost: number | null }>>();
	for (const row of sdrRows) {
		const list = sdrByRecord.get(row.disaster_record_id) ?? [];
		list.push({
			sector_id: row.sector_id,
			losses_cost:
				row.losses_cost == null || row.losses_cost === '' ? null : Number(row.losses_cost),
		});
		sdrByRecord.set(row.disaster_record_id, list);
	}

	let totalLosses = 0;

	for (const record of disasterRecords) {
		const sdrList = sdrByRecord.get(String(record.id)) ?? [];

		for (const sdr of sdrList) {
			if (sdr.losses_cost != null) {
				totalLosses += sdr.losses_cost;
			} else {
				// Fallback: sum losses.public_cost_total + losses.private_cost_total for this disaster_record_id and sector_id
				const lossesRes = await dr.execute(sql`
          SELECT COALESCE(public_cost_total, 0) AS public_cost_total,
                 COALESCE(private_cost_total, 0) AS private_cost_total
          FROM losses
          WHERE record_id = ${record.id} AND sector_id = ${sdr.sector_id}
        `);

				const lossesRows = lossesRes.rows as Array<{
					public_cost_total: string | number;
					private_cost_total: string | number;
				}>;
				for (const l of lossesRows) {
					totalLosses += Number(l.public_cost_total) + Number(l.private_cost_total);
				}
			}
		}
	}

	return totalLosses;
}

export interface DamageByYear {
	year: number;
	totalDamages: number;
}

export interface DamageByYear {
	year: number;
	totalDamages: number;
}

export async function getTotalDamagesByYear(filters: HazardFilters): Promise<DamageByYear[]> {
	const raw = await getFilteredDisasterRecords(filters);
	const disasterRecords = (raw as unknown as Array<Record<string, any>>).filter(
		(r) => r && (typeof r.id === 'string' || typeof r.id === 'number')
	);

	if (!disasterRecords.length) return [];

	const disasterIds: string[] = disasterRecords.map((d) => String(d.id));
	const disasterIdsList = disasterIds.map((id) => `'${id}'`).join(',');

	// Fetch all SDR rows for these disasters
	const sdrRes = await dr.execute(sql`
    SELECT disaster_record_id, sector_id, damage_cost
    FROM sector_disaster_records_relation
    WHERE disaster_record_id = ANY(ARRAY[${sql.raw(disasterIdsList)}]::uuid[])
  `);
	const sdrRows = sdrRes.rows as Array<{
		disaster_record_id: string;
		sector_id: string;
		damage_cost: string | number | null;
	}>;

	const sdrByRecord = new Map<string, Array<{ sector_id: string; damage_cost: number | null }>>();
	const fallbackPairs = new Set<string>();

	for (const row of sdrRows) {
		const rid = String(row.disaster_record_id);
		const sector = String(row.sector_id);
		const cost = row.damage_cost == null || row.damage_cost === '' ? null : Number(row.damage_cost);
		const list = sdrByRecord.get(rid) ?? [];
		list.push({ sector_id: sector, damage_cost: cost });
		sdrByRecord.set(rid, list);
		if (cost == null) fallbackPairs.add(`${rid}|${sector}`);
	}

	// ✅ FIX: Cast record_id and sector_id to UUID explicitly
	const fallbackMap = new Map<string, number>();
	if (fallbackPairs.size > 0) {
		const valuesList = Array.from(fallbackPairs)
			.map((pair) => {
				const [rid, sector] = pair.split('|');
				return `('${rid}'::uuid, '${sector}'::uuid)`;
			})
			.join(',');

		const damagesRes = await dr.execute(sql`
      SELECT record_id, sector_id,
             COALESCE(SUM(COALESCE(total_repair_replacement, 0)), 0)
             AS total_repair_replacement_sum
      FROM damages
      WHERE (record_id, sector_id) IN (VALUES ${sql.raw(valuesList)})
      GROUP BY record_id, sector_id
    `);

		for (const r of damagesRes.rows as Array<{
			record_id: string;
			sector_id: string;
			total_repair_replacement_sum: string | number;
		}>) {
			fallbackMap.set(
				`${String(r.record_id)}|${String(r.sector_id)}`,
				Number(r.total_repair_replacement_sum) || 0
			);
		}
	}

	const totalsByYear = new Map<number, number>();

	for (const rec of disasterRecords) {
		const id = String(rec.id);
		const rawStart = rec.start_date ?? rec.startDate ?? '';
		const m = String(rawStart).match(/^(\d{4})/);
		if (!m) continue;
		const year = Number(m[1]);
		if (!Number.isFinite(year)) continue;

		const sdrList = sdrByRecord.get(id) ?? [];

		let recordSum = 0;
		for (const sdr of sdrList) {
			if (sdr.damage_cost != null) {
				recordSum += sdr.damage_cost;
			} else {
				recordSum += fallbackMap.get(`${id}|${sdr.sector_id}`) ?? 0;
			}
		}

		totalsByYear.set(year, (totalsByYear.get(year) ?? 0) + recordSum);
	}

	return Array.from(totalsByYear.entries())
		.map(([year, totalDamages]) => ({ year, totalDamages }))
		.sort((a, b) => a.year - b.year);
}

export interface LossByYear {
	year: number;
	totalLosses: number;
}

export async function getTotalLossesByYear(filters: HazardFilters): Promise<LossByYear[]> {
	const raw = await getFilteredDisasterRecords(filters);
	const disasterRecords = (raw as unknown as Array<Record<string, any>>).filter(
		(r) => r && (typeof r.id === 'string' || typeof r.id === 'number')
	);

	if (!disasterRecords.length) return [];

	const disasterIds: string[] = disasterRecords.map((d) => String(d.id));
	const disasterIdsList = disasterIds.map((id) => `'${id}'`).join(',');

	// Fetch all SDR rows for these disasters
	const sdrRes = await dr.execute(sql`
    SELECT disaster_record_id, sector_id, losses_cost
    FROM sector_disaster_records_relation
    WHERE disaster_record_id = ANY(ARRAY[${sql.raw(disasterIdsList)}]::uuid[])
  `);

	const sdrRows = sdrRes.rows as Array<{
		disaster_record_id: string;
		sector_id: string;
		losses_cost: string | number | null;
	}>;

	const sdrByRecord = new Map<string, Array<{ sector_id: string; losses_cost: number | null }>>();
	const fallbackPairs = new Set<string>();

	for (const row of sdrRows) {
		const rid = String(row.disaster_record_id);
		const sector = String(row.sector_id);
		const cost = row.losses_cost == null || row.losses_cost === '' ? null : Number(row.losses_cost);
		const list = sdrByRecord.get(rid) ?? [];
		list.push({ sector_id: sector, losses_cost: cost });
		sdrByRecord.set(rid, list);
		if (cost == null) fallbackPairs.add(`${rid}|${sector}`);
	}

	// ✅ Get fallback from losses table
	const fallbackMap = new Map<string, number>();
	if (fallbackPairs.size > 0) {
		const valuesList = Array.from(fallbackPairs)
			.map((pair) => {
				const [rid, sector] = pair.split('|');
				return `('${rid}'::uuid, '${sector}'::uuid)`;
			})
			.join(',');

		const lossesRes = await dr.execute(sql`
      SELECT record_id, sector_id,
             COALESCE(SUM(COALESCE(public_cost_total, 0) + COALESCE(private_cost_total, 0)), 0)
             AS total_loss_sum
      FROM losses
      WHERE (record_id, sector_id) IN (VALUES ${sql.raw(valuesList)})
      GROUP BY record_id, sector_id
    `);

		for (const r of lossesRes.rows as Array<{
			record_id: string;
			sector_id: string;
			total_loss_sum: string | number;
		}>) {
			fallbackMap.set(
				`${String(r.record_id)}|${String(r.sector_id)}`,
				Number(r.total_loss_sum) || 0
			);
		}
	}

	const totalsByYear = new Map<number, number>();

	for (const rec of disasterRecords) {
		const id = String(rec.id);
		const rawStart = rec.start_date ?? rec.startDate ?? '';
		const m = String(rawStart).match(/^(\d{4})/);
		if (!m) continue;
		const year = Number(m[1]);
		if (!Number.isFinite(year)) continue;

		const sdrList = sdrByRecord.get(id) ?? [];

		let recordSum = 0;
		for (const sdr of sdrList) {
			if (sdr.losses_cost != null) {
				recordSum += sdr.losses_cost;
			} else {
				recordSum += fallbackMap.get(`${id}|${sdr.sector_id}`) ?? 0;
			}
		}

		totalsByYear.set(year, (totalsByYear.get(year) ?? 0) + recordSum);
	}

	return Array.from(totalsByYear.entries())
		.map(([year, totalLosses]) => ({ year, totalLosses }))
		.sort((a, b) => a.year - b.year);
}

interface DamageByDivision {
	divisionId: string;
	totalDamages: number;
}

export async function getTotalDamagesByDivision(
	filters: HazardFilters
): Promise<DamageByDivision[]> {
	// 1. Get all disaster records matching filters
	const raw = await getFilteredDisasterRecords(filters);
	const disasterRecords = (raw as unknown as Array<Record<string, any>>).filter(
		(r) => r && typeof r.id === 'string'
	);

	if (!disasterRecords.length) return [];

	// 2. Extract all disaster IDs
	const disasterIds: string[] = disasterRecords.map((d) => d.id);
	const disasterIdsList = disasterIds.map((id) => `'${id}'`).join(',');

	// 3. Get all sector_disaster_records_relation rows for these disasters
	const sdrRes = await dr.execute(sql`
    SELECT disaster_record_id, sector_id, damage_cost
    FROM sector_disaster_records_relation
    WHERE disaster_record_id = ANY(ARRAY[${sql.raw(disasterIdsList)}]::uuid[])
  `);
	const sdrRows = sdrRes.rows as Array<{
		disaster_record_id: string;
		sector_id: string;
		damage_cost: string | number | null;
	}>;

	// Group SDRs by disaster_record_id
	const sdrByRecord = new Map<string, Array<{ sector_id: string; damage_cost: number | null }>>();
	const fallbackPairs = new Set<string>();

	for (const row of sdrRows) {
		const rid = String(row.disaster_record_id);
		const sector = String(row.sector_id);
		const cost = row.damage_cost == null || row.damage_cost === '' ? null : Number(row.damage_cost);
		const list = sdrByRecord.get(rid) ?? [];
		list.push({ sector_id: sector, damage_cost: cost });
		sdrByRecord.set(rid, list);
		if (cost == null) fallbackPairs.add(`${rid}|${sector}`);
	}

	// 4. Fetch fallback damage totals from "damages" table
	const fallbackMap = new Map<string, number>();
	if (fallbackPairs.size > 0) {
		const valuesList = Array.from(fallbackPairs)
			.map((pair) => {
				const [rid, sector] = pair.split('|');
				return `('${rid}'::uuid, '${sector}'::uuid)`;
			})
			.join(',');

		const damagesRes = await dr.execute(sql`
      SELECT record_id, sector_id,
             COALESCE(SUM(COALESCE(total_repair_replacement, 0)), 0)
             AS total_repair_replacement_sum
      FROM damages
      WHERE (record_id, sector_id) IN (VALUES ${sql.raw(valuesList)})
      GROUP BY record_id, sector_id
    `);

		for (const r of damagesRes.rows as Array<{
			record_id: string;
			sector_id: string;
			total_repair_replacement_sum: string | number;
		}>) {
			fallbackMap.set(
				`${String(r.record_id)}|${String(r.sector_id)}`,
				Number(r.total_repair_replacement_sum) || 0
			);
		}
	}

	// 5. Accumulate totals by division
	const divisionTotals = new Map<string, number>();

	for (const record of disasterRecords) {
		// Extract division IDs from spatial_footprint
		const divisions: string[] = [];

		try {
			const spatial = record.spatial_footprint;
			if (spatial && Array.isArray(spatial)) {
				for (const feature of spatial) {
					const divId =
						feature?.geojson?.properties?.division_id ?? feature?.properties?.division_id;
					if (divId) divisions.push(String(divId));
				}
			} else if (typeof spatial === 'object') {
				const divId = spatial?.geojson?.properties?.division_id ?? spatial?.properties?.division_id;
				if (divId) divisions.push(String(divId));
			}
		} catch {
			// ignore malformed spatial data
		}

		if (!divisions.length) continue;

		const sdrList = sdrByRecord.get(record.id) ?? [];

		// Sum total damage for this record
		let recordDamage = 0;
		for (const sdr of sdrList) {
			if (sdr.damage_cost != null) {
				recordDamage += sdr.damage_cost;
			} else {
				recordDamage += fallbackMap.get(`${record.id}|${sdr.sector_id}`) ?? 0;
			}
		}

		// Distribute total damage equally across divisions for this record
		const perDivisionDamage = divisions.length > 0 ? recordDamage / divisions.length : 0;

		for (const divId of divisions) {
			divisionTotals.set(divId, (divisionTotals.get(divId) ?? 0) + perDivisionDamage);
		}
	}

	// 6. Return final result as array
	return Array.from(divisionTotals.entries())
		.map(([divisionId, totalDamages]) => ({
			divisionId,
			totalDamages,
		}))
		.sort((a, b) => a.divisionId.localeCompare(b.divisionId));
}

interface LossByDivision {
	divisionId: string;
	totalLosses: number;
}

export async function getTotalLossesByDivision(filters: HazardFilters): Promise<LossByDivision[]> {
	// 1. Get all disaster records matching filters
	const raw = await getFilteredDisasterRecords(filters);
	const disasterRecords = (raw as unknown as Array<Record<string, any>>).filter(
		(r) => r && typeof r.id === 'string'
	);

	if (!disasterRecords.length) return [];

	// 2. Extract all disaster IDs
	const disasterIds: string[] = disasterRecords.map((d) => d.id);
	const disasterIdsList = disasterIds.map((id) => `'${id}'`).join(',');

	// 3. Get all sector_disaster_records_relation rows for these disasters
	const sdrRes = await dr.execute(sql`
    SELECT disaster_record_id, sector_id, losses_cost
    FROM sector_disaster_records_relation
    WHERE disaster_record_id = ANY(ARRAY[${sql.raw(disasterIdsList)}]::uuid[])
  `);
	const sdrRows = sdrRes.rows as Array<{
		disaster_record_id: string;
		sector_id: string;
		losses_cost: string | number | null;
	}>;

	// Group SDRs by disaster_record_id
	const sdrByRecord = new Map<string, Array<{ sector_id: string; losses_cost: number | null }>>();
	const fallbackPairs = new Set<string>();

	for (const row of sdrRows) {
		const rid = String(row.disaster_record_id);
		const sector = String(row.sector_id);
		const cost = row.losses_cost == null || row.losses_cost === '' ? null : Number(row.losses_cost);
		const list = sdrByRecord.get(rid) ?? [];
		list.push({ sector_id: sector, losses_cost: cost });
		sdrByRecord.set(rid, list);
		if (cost == null) fallbackPairs.add(`${rid}|${sector}`);
	}

	// 4. Fetch fallback loss totals from "losses" table
	const fallbackMap = new Map<string, number>();
	if (fallbackPairs.size > 0) {
		const valuesList = Array.from(fallbackPairs)
			.map((pair) => {
				const [rid, sector] = pair.split('|');
				return `('${rid}'::uuid, '${sector}'::uuid)`;
			})
			.join(',');

		const lossesRes = await dr.execute(sql`
      SELECT record_id, sector_id,
             COALESCE(SUM(COALESCE(public_cost_total, 0) + COALESCE(private_cost_total, 0)), 0)
             AS total_loss_sum
      FROM losses
      WHERE (record_id, sector_id) IN (VALUES ${sql.raw(valuesList)})
      GROUP BY record_id, sector_id
    `);

		for (const r of lossesRes.rows as Array<{
			record_id: string;
			sector_id: string;
			total_loss_sum: string | number;
		}>) {
			fallbackMap.set(
				`${String(r.record_id)}|${String(r.sector_id)}`,
				Number(r.total_loss_sum) || 0
			);
		}
	}

	// 5. Accumulate totals by division
	const divisionTotals = new Map<string, number>();

	for (const record of disasterRecords) {
		// Extract division IDs from spatial_footprint
		const divisions: string[] = [];

		try {
			const spatial = record.spatial_footprint;
			if (spatial && Array.isArray(spatial)) {
				for (const feature of spatial) {
					const divId =
						feature?.geojson?.properties?.division_id ?? feature?.properties?.division_id;
					if (divId) divisions.push(String(divId));
				}
			} else if (typeof spatial === 'object') {
				const divId = spatial?.geojson?.properties?.division_id ?? spatial?.properties?.division_id;
				if (divId) divisions.push(String(divId));
			}
		} catch {
			// ignore malformed spatial data
		}

		if (!divisions.length) continue;

		const sdrList = sdrByRecord.get(record.id) ?? [];

		// Sum total losses for this record
		let recordLosses = 0;
		for (const sdr of sdrList) {
			if (sdr.losses_cost != null) {
				recordLosses += sdr.losses_cost;
			} else {
				recordLosses += fallbackMap.get(`${record.id}|${sdr.sector_id}`) ?? 0;
			}
		}

		// Distribute total losses equally across divisions for this record
		const perDivisionLoss = divisions.length > 0 ? recordLosses / divisions.length : 0;

		for (const divId of divisions) {
			divisionTotals.set(divId, (divisionTotals.get(divId) ?? 0) + perDivisionLoss);
		}
	}

	// 6. Return final result as array
	return Array.from(divisionTotals.entries())
		.map(([divisionId, totalLosses]) => ({
			divisionId,
			totalLosses,
		}))
		.sort((a, b) => a.divisionId.localeCompare(b.divisionId));
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
	whereConditions.push(sql`"approvalStatus" = ${'published'}`);
	whereConditions.push(sql`"country_accounts_id" = ${countryAccountsId}`);
	if (hazardTypeId) whereConditions.push(sql`"hip_type_id" = ${hazardTypeId}`);
	if (hazardClusterId) whereConditions.push(sql`"hip_cluster_id" = ${hazardClusterId}`);
	if (specificHazardId) whereConditions.push(sql`"hip_hazard_id" = ${specificHazardId}`);
	if (fromDate || toDate) {
		const from = fromDate || '0001-01-01';
		const to = toDate || '9999-12-31';
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
	const subqueryWhereClause = sql`WHERE ${and(...whereConditions)} AND ${humanDsgConditions}`;

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
	whereConditions.push(sql`"approvalStatus" = ${'published'}`);
	whereConditions.push(sql`"country_accounts_id" = ${countryAccountsId}`);
	if (hazardTypeId) whereConditions.push(sql`"hip_type_id" = ${hazardTypeId}`);
	if (hazardClusterId) whereConditions.push(sql`"hip_cluster_id" = ${hazardClusterId}`);
	if (specificHazardId) whereConditions.push(sql`"hip_hazard_id" = ${specificHazardId}`);
	if (fromDate || toDate) {
		const from = fromDate || '0001-01-01';
		const to = toDate || '9999-12-31';
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
	const subqueryWhereClause = sql`WHERE ${and(...whereConditions)} AND ${humanDsgConditions}`;

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
		  COALESCE("affected"."direct", 0) AS total_affected
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
	whereConditions.push(sql`"approvalStatus" = ${'published'}`);
	whereConditions.push(sql`"country_accounts_id" = ${countryAccountsId}`);
	if (hazardTypeId) whereConditions.push(sql`"hip_type_id" = ${hazardTypeId}`);
	if (hazardClusterId) whereConditions.push(sql`"hip_cluster_id" = ${hazardClusterId}`);
	if (specificHazardId) whereConditions.push(sql`"hip_hazard_id" = ${specificHazardId}`);
	if (fromDate || toDate) {
		const from = fromDate || '0001-01-01';
		const to = toDate || '9999-12-31';
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

export async function getDisasterSummary(filters: HazardFilters): Promise<DisasterSummary[]> {
	const {
		countryAccountsId,
		hazardTypeId,
		hazardClusterId,
		specificHazardId,
		// geographicLevelId,
		fromDate,
		toDate,
	} = filters;

	// ---- Step 1: Get all disaster events that match filters ----
	const whereConditions: SQL[] = [];
	whereConditions.push(sql`"approvalStatus" = ${'published'}`);
	whereConditions.push(sql`"country_accounts_id" = ${countryAccountsId}`);
	if (hazardTypeId) whereConditions.push(sql`"hip_type_id" = ${hazardTypeId}`);
	if (hazardClusterId) whereConditions.push(sql`"hip_cluster_id" = ${hazardClusterId}`);
	if (specificHazardId) whereConditions.push(sql`"hip_hazard_id" = ${specificHazardId}`);
	if (fromDate || toDate) {
		const from = fromDate || '0001-01-01';
		const to = toDate || '9999-12-31';
		whereConditions.push(sql`"start_date" >= ${from} AND "end_date" <= ${to}`);
	}

	const whereClause = whereConditions.length > 0 ? sql`WHERE ${and(...whereConditions)}` : sql``;

	const disasterEventsRes = await dr.execute(sql`
    SELECT id, name_national, start_date, end_date, spatial_footprint
    FROM disaster_event
    ${whereClause}
  `);

	const disasterEvents = disasterEventsRes.rows as Array<{
		id: string;
		name_national: string | null;
		start_date: string;
		end_date: string;
		spatial_footprint: any;
	}>;

	if (!disasterEvents.length) return [];

	// ---- Step 2: Fetch all related disaster records ----
	const eventIds = disasterEvents.map((e) => e.id);
	const eventIdsList = eventIds.map((id) => `'${id}'`).join(',');

	const recordsRes = await dr.execute(sql`
    SELECT id, disaster_event_id
    FROM disaster_records
    WHERE disaster_event_id = ANY(ARRAY[${sql.raw(eventIdsList)}]::uuid[])
    AND "approvalStatus" = 'published'
  `);
	const disasterRecords = recordsRes.rows as Array<{
		id: string;
		disaster_event_id: string;
	}>;

	if (!disasterRecords.length)
		return disasterEvents.map((e) => ({
			disasterId: e.id,
			disasterName: e.name_national ?? 'Unnamed Disaster',
			startDate: e.start_date,
			endDate: e.end_date,
			provinceAffected: '',
			totalDamages: 0,
			totalLosses: 0,
			totalAffectedPeople: 0,
		}));

	// ---- Step 3: Get all sector_disaster_records_relation entries ----
	const recordIdsList = disasterRecords.map((r) => `'${r.id}'`).join(',');
	const sdrRes = await dr.execute(sql`
    SELECT disaster_record_id, sector_id, damage_cost, losses_cost
    FROM sector_disaster_records_relation
    WHERE disaster_record_id = ANY(ARRAY[${sql.raw(recordIdsList)}]::uuid[])
  `);
	const sdrRows = sdrRes.rows as Array<{
		disaster_record_id: string;
		sector_id: string;
		damage_cost: string | number | null;
		losses_cost: string | number | null;
	}>;

	const sdrByRecord = new Map<
		string,
		Array<{ sector_id: string; damage_cost: number | null; losses_cost: number | null }>
	>();
	const missingDamagePairs = new Set<string>();
	const missingLossPairs = new Set<string>();

	for (const sdr of sdrRows) {
		const rid = String(sdr.disaster_record_id);
		const sid = String(sdr.sector_id);
		const damage =
			sdr.damage_cost != null && sdr.damage_cost !== '' ? Number(sdr.damage_cost) : null;
		const loss = sdr.losses_cost != null && sdr.losses_cost !== '' ? Number(sdr.losses_cost) : null;

		const list = sdrByRecord.get(rid) ?? [];
		list.push({ sector_id: sid, damage_cost: damage, losses_cost: loss });
		sdrByRecord.set(rid, list);

		if (damage == null) missingDamagePairs.add(`${rid}|${sid}`);
		if (loss == null) missingLossPairs.add(`${rid}|${sid}`);
	}

	// ---- Step 4: Get fallback damages ----
	const damageFallback = new Map<string, number>();
	if (missingDamagePairs.size > 0) {
		const pairs = Array.from(missingDamagePairs)
			.map((p) => {
				const [rid, sid] = p.split('|');
				return `('${rid}'::uuid, '${sid}'::uuid)`;
			})
			.join(',');
		const fallbackRes = await dr.execute(sql`
      SELECT record_id, sector_id, COALESCE(SUM(total_repair_replacement), 0) AS total
      FROM damages
      WHERE (record_id, sector_id) IN (VALUES ${sql.raw(pairs)})
      GROUP BY record_id, sector_id
    `);
		for (const r of fallbackRes.rows as Array<{
			record_id: string;
			sector_id: string;
			total: number;
		}>) {
			damageFallback.set(`${r.record_id}|${r.sector_id}`, Number(r.total) || 0);
		}
	}

	// ---- Step 5: Get fallback losses ----
	const lossFallback = new Map<string, number>();
	if (missingLossPairs.size > 0) {
		const pairs = Array.from(missingLossPairs)
			.map((p) => {
				const [rid, sid] = p.split('|');
				return `('${rid}'::uuid, '${sid}'::uuid)`;
			})
			.join(',');
		const fallbackRes = await dr.execute(sql`
      SELECT record_id, sector_id,
             COALESCE(SUM(COALESCE(public_cost_total, 0) + COALESCE(private_cost_total, 0)), 0) AS total
      FROM losses
      WHERE (record_id, sector_id) IN (VALUES ${sql.raw(pairs)})
      GROUP BY record_id, sector_id
    `);
		for (const r of fallbackRes.rows as Array<{
			record_id: string;
			sector_id: string;
			total: number;
		}>) {
			lossFallback.set(`${r.record_id}|${r.sector_id}`, Number(r.total) || 0);
		}
	}

	// ---- Step 6: Aggregate totals per disaster_event ----
	const totalsByEvent = new Map<string, { damages: number; losses: number }>();
	for (const rec of disasterRecords) {
		const sdrs = sdrByRecord.get(rec.id) ?? [];
		let damageSum = 0;
		let lossSum = 0;
		for (const sdr of sdrs) {
			const d = sdr.damage_cost ?? damageFallback.get(`${rec.id}|${sdr.sector_id}`) ?? 0;
			const l = sdr.losses_cost ?? lossFallback.get(`${rec.id}|${sdr.sector_id}`) ?? 0;
			damageSum += d;
			lossSum += l;
		}
		const eventTotals = totalsByEvent.get(rec.disaster_event_id) ?? { damages: 0, losses: 0 };
		eventTotals.damages += damageSum;
		eventTotals.losses += lossSum;
		totalsByEvent.set(rec.disaster_event_id, eventTotals);
	}

	// ---- Step 7: Get affected people ----
	const affectedRes = await dr.execute(sql`
    SELECT dr."disaster_event_id",
           COALESCE(SUM(
             COALESCE(mis.missing, 0) +
             COALESCE(dsp.displaced, 0) +
             COALESCE(inj.injured, 0) +
             COALESCE(aff.direct, 0)
           ), 0) AS total_affected
    FROM "disaster_records" dr
    LEFT JOIN "human_dsg" hd ON dr."id" = hd."record_id"
    LEFT JOIN "missing" mis ON hd."id" = mis."dsg_id"
    LEFT JOIN "displaced" dsp ON hd."id" = dsp."dsg_id"
    LEFT JOIN "injured" inj ON hd."id" = inj."dsg_id"
    LEFT JOIN "affected" aff ON hd."id" = aff."dsg_id"
    WHERE dr."approvalStatus" = 'published'
    GROUP BY dr."disaster_event_id"
  `);
	const affectedByEvent = new Map<string, number>();
	for (const r of affectedRes.rows as Array<{
		disaster_event_id: string;
		total_affected: number;
	}>) {
		affectedByEvent.set(r.disaster_event_id, Number(r.total_affected) || 0);
	}

	// ---- Step 8: Map everything to DisasterSummary ----
	return disasterEvents.map((e) => {
		const totals = totalsByEvent.get(e.id) ?? { damages: 0, losses: 0 };
		const totalAffected = affectedByEvent.get(e.id) ?? 0;
		return {
			disasterId: e.id,
			disasterName: e.name_national ?? 'Unnamed Disaster',
			startDate: e.start_date,
			endDate: e.end_date,
			provinceAffected: '', // optional: you can compute this later as before
			totalDamages: totals.damages,
			totalLosses: totals.losses,
			totalAffectedPeople: totalAffected,
		};
	});
}
