import {eq, sql, and, isNull, sum, isNotNull} from "drizzle-orm";
import {Tx} from "~/db.server";
import {
	disasterRecordsTable,
	humanDsgTable,
	missingTable,
	injuredTable,
	deathsTable,
	affectedTable,
	displacedTable,
	disasterEventTable,
	humanCategoryPresenceTable,
} from "~/drizzle/schema";


interface Conditions {
	divisionId?: number
}

export async function getAffected(tx: Tx, disasterEventId: string, conditions?: Conditions) {
	let res = {
		noDisaggregations: await totalsForEachTable(tx, disasterEventId, conditions),
		disaggregations: await byColAndTableTotalsOnlyForFrontend(tx, disasterEventId, conditions)
	}
	return res
}

type Total = {
	total: number
	tables: {
		deaths: number
		injured: number
		missing: number
		directlyAffected: number
		displaced: number
	}
}

type humanEffectsDataCode = "deaths"|"injured"|"missing"|"directlyAffected"|"indirectlyAffected"|"displaced"

const totalsTablesAndCols = [
	{code: "deaths", table: deathsTable, col: deathsTable.deaths, presenceCol: humanCategoryPresenceTable.deaths},
	{code: "injured", table: injuredTable, col: injuredTable.injured, presenceCol: humanCategoryPresenceTable.injured},
	{code: "missing", table: missingTable, col: missingTable.missing, presenceCol: humanCategoryPresenceTable.missing},
	{code: "directlyAffected", table: affectedTable, col: affectedTable.direct, presenceCol: humanCategoryPresenceTable.affectedDirect},
	{code: "indirectlyAffected", table: affectedTable, col: affectedTable.indirect, presenceCol: humanCategoryPresenceTable.affectedIndirect},
	{code: "displaced", table: displacedTable, col: displacedTable.displaced, presenceCol: humanCategoryPresenceTable.displaced}
]


async function totalsForEachTable(tx: Tx, disasterEventId: string, conditions?: Conditions): Promise<Total> {
	let vars: any = {}
	let total = 0
	for (let a of totalsTablesAndCols) {
		let v = await totalsForOneTable(tx, disasterEventId, a.table, a.col, a.presenceCol, conditions)
		vars[a.code] = v
		total += v
	}
	return {total, tables: vars} as Total
}


// The code for deaths, injured, missing, displaced is exactly the same.
// For directlyAffected has a minor variation that a table has both direct and indirect columns, we only need direct from there.

async function totalsForOneTable(tx: Tx, disasterEventId: string, valTable: any, resCol: any, presenceCol: any, conditions?: Conditions): Promise<number> {
	/*
	SELECT SUM(d.deaths)
	FROM disaster_event de
	JOIN disaster_records dr ON de.id = dr.disaster_event_id
	JOIN human_dsg hd ON dr.id = hd.record_id
	JOIN deaths d ON hd.id = d.dsg_id
	JOIN human_category_presence hcp ON hd.record_id = hcp.record_id
	WHERE de.id = 'f41bd013-23cc-41ba-91d2-4e325f785171'
			AND hcp.deaths IS TRUE
		AND dr."approvalStatus" = 'published'
		AND hd.sex IS NULL
		AND hd.age IS NULL
		AND hd.disability IS NULL
		AND hd.global_poverty_line IS NULL
		AND hd.national_poverty_line IS NULL
		AND (hd.custom IS NULL
			OR hd.custom = '{}'::jsonb
			OR (
				SELECT COUNT(*)
				FROM jsonb_each(hd.custom)
				WHERE jsonb_typeof(value) != 'null'
			) = 0
		AND EXISTS (
			SELECT 1
			FROM jsonb_array_elements(dr.spatial_footprint) AS elem
			WHERE elem->'geojson'->'features'->0->'properties'->>'division_id' = '74'
			OR elem->'geojson'->'features'->0->'properties'->'division_ids' @> '74'::jsonb
		)
	*/

	let de = disasterEventTable
	let dr = disasterRecordsTable
	let hd = humanDsgTable
	let vt = valTable
	let hcp = humanCategoryPresenceTable

	const res = await tx
		.select({
			sum: sum(resCol),
		})
		.from(de)
		.innerJoin(dr, eq(de.id, dr.disasterEventId))
		.innerJoin(hd, eq(dr.id, hd.recordId))
		.innerJoin(vt, eq(hd.id, vt.dsgId))
		.innerJoin(hcp, eq(hd.recordId, hcp.recordId))
		.where(
			and(
				eq(de.id, disasterEventId),
				eq(presenceCol, true),
				eq(dr.approvalStatus, "published"),
				isNull(hd.sex),
				isNull(hd.age),
				isNull(hd.disability),
				isNull(hd.globalPovertyLine),
				isNull(hd.nationalPovertyLine),
				sql`(
					${hd.custom} IS NULL
					OR ${hd.custom} = '{}'::jsonb
					OR (
						SELECT COUNT(*)
						FROM jsonb_each(${hd.custom})
						WHERE jsonb_typeof(value) != 'null'
					) = 0
				)`,
				conditions?.divisionId ? sql`EXISTS (
					SELECT 1
					FROM jsonb_array_elements(${dr.spatialFootprint}) AS elem
					WHERE elem->'geojson'->'properties'->>'division_id' = ${conditions.divisionId}
					OR elem->'geojson'->'properties'->'division_ids' @> ${conditions.divisionId}::jsonb
				)` : undefined
			)
		)

	if (!res || !res.length) {
		return 0
	}

	return Number(res[0].sum)
}


export async function totalsRecordsForTypeCol(tx: Tx, dataCode: humanEffectsDataCode, disasterEventId: string){
	let record = totalsTablesAndCols.find(d => d.code == dataCode)
	if (!record) throw new Error("invalid dataCode: " + dataCode)
	return await totalsForOneTableRecords(tx, disasterEventId, record.table, record.col, record.presenceCol)
}

async function totalsForOneTableRecords(tx: Tx, disasterEventId: string, valTable: any, resCol: any, presenceCol: any) {
	/*
	SELECT dr.id, d.deaths
	FROM disaster_event de
	JOIN disaster_records dr ON de.id = dr.disaster_event_id
	JOIN human_dsg hd ON dr.id = hd.record_id
	JOIN deaths d ON hd.id = d.dsg_id
	JOIN human_category_presence hcp ON hd.record_id = hcp.record_id
	WHERE de.id = 'f41bd013-23cc-41ba-91d2-4e325f785171'
			AND hcp.deaths IS TRUE
		AND dr."approvalStatus" = 'published'
		AND hd.sex IS NULL
		AND hd.age IS NULL
		AND hd.disability IS NULL
		AND hd.global_poverty_line IS NULL
		AND hd.national_poverty_line IS NULL
		AND (hd.custom IS NULL
			OR hd.custom = '{}'::jsonb
			OR (
				SELECT COUNT(*)
				FROM jsonb_each(hd.custom)
				WHERE jsonb_typeof(value) != 'null'
			) = 0
		AND EXISTS (
			SELECT 1
			FROM jsonb_array_elements(dr.spatial_footprint) AS elem
			WHERE elem->'geojson'->'features'->0->'properties'->>'division_id' = '74'
			OR elem->'geojson'->'features'->0->'properties'->'division_ids' @> '74'::jsonb
		)
	*/

	let de = disasterEventTable
	let dr = disasterRecordsTable
	let hd = humanDsgTable
	let vt = valTable
	let hcp = humanCategoryPresenceTable

	const res = await tx
		.select({
			drId: disasterRecordsTable.id,
			value: resCol,
		})
		.from(de)
		.innerJoin(dr, eq(de.id, dr.disasterEventId))
		.innerJoin(hd, eq(dr.id, hd.recordId))
		.innerJoin(vt, eq(hd.id, vt.dsgId))
		.innerJoin(hcp, eq(hd.recordId, hcp.recordId))
		.where(
			and(
				eq(de.id, disasterEventId),
				eq(presenceCol, true),
				eq(dr.approvalStatus, "published"),
				isNull(hd.sex),
				isNull(hd.age),
				isNull(hd.disability),
				isNull(hd.globalPovertyLine),
				isNull(hd.nationalPovertyLine),
				sql`(
					${hd.custom} IS NULL
					OR ${hd.custom} = '{}'::jsonb
					OR (
						SELECT COUNT(*)
						FROM jsonb_each(${hd.custom})
						WHERE jsonb_typeof(value) != 'null'
					) = 0
				)`,
			)
		)

	if (!res || !res.length) {
		return 0
	}

	return res
}



const tables = [
	{code: "sex", col: humanDsgTable.sex},
	{code: "age", col: humanDsgTable.age},
	{code: "disability", col: humanDsgTable.disability},
	{code: "globalPovertyLine", col: humanDsgTable.globalPovertyLine},
	{code: "nationalPovertyLine", col: humanDsgTable.nationalPovertyLine},
]

/*
type ByColAndTable = {
	sex: ByTable
	age: ByTable
	disability: ByTable
	globalPovertyLine: ByTable
	nationalPovertyLine: ByTable
}

async function byColAndTable(tx: Tx, disasterEventId: string): Promise<ByColAndTable> {
	let res: any = {}
	for (let t of tables) {
		res[t.code] = await byTable(tx, disasterEventId, t.col)
	}
	return res as ByColAndTable
}*/

type ByColAndTableTotalsOnly = {
	sex: Map<string, number>
	age: Map<string, number>
	disability: Map<string, number>
	globalPovertyLine: Map<string, number>
	nationalPovertyLine: Map<string, number>
}

async function byColAndTableTotalsOnly(tx: Tx, disasterEventId: string, conditions?: Conditions): Promise<ByColAndTableTotalsOnly> {
	let res: any = {}
	for (let t of tables) {
		let v = await byTable(tx, disasterEventId, t.col, conditions)
		res[t.code] = v.total
	}
	return res as ByColAndTableTotalsOnly
}


type ByColAndTableTotalsOnlyForFrontend = {
	sex: Record<string, number>
	age: Record<string, number>
	disability: Record<string, number>
	globalPovertyLine: Record<string, number>
	nationalPovertyLine: Record<string, number>
}

async function byColAndTableTotalsOnlyForFrontend(tx: Tx, disasterEventId: string, conditions?: Conditions): Promise<ByColAndTableTotalsOnlyForFrontend> {
	let res: any = {}
	let r = await byColAndTableTotalsOnly(tx, disasterEventId, conditions)

	// adjust results for disabilities to only group by no/has disabilities
	let dis = new Map<string, number>()
	for (let [k, v] of r.disability.entries()) {
		let k2 = ""
		if (k == "none") {
			k2 = "none"
		} else {
			k2 = "disability"
		}
		let a = dis.get(k2) || 0
		a += v
		dis.set(k2, a)
	}
	r.disability = dis

	for (let [k, v] of Object.entries(r)) {
		res[k] = Object.fromEntries(v.entries())
	}
	return res as ByColAndTableTotalsOnlyForFrontend
}

type ByTable = {
	total: Map<string, number>
	tables: {
		deaths: Map<string, number>
		injured: Map<string, number>
		missing: Map<string, number>
		directlyAffected: Map<string, number>
		displaced: Map<string, number>
	}
}

async function byTable(tx: Tx, disasterEventId: string, dsgCol: any, conditions?: Conditions): Promise<ByTable> {
	let tables: any = {}
	let total = new Map<string, number>()
	for (let a of totalsTablesAndCols) {
		let vv = await countsForOneTable(tx, disasterEventId, a.table, a.col, dsgCol, a.presenceCol, conditions)
		tables[a.code] = vv
		for (let [k, v] of vv.entries()) {
			let a = total.get(k) || 0
			a += v
			total.set(k, a)
		}
	}
	return {total, tables} as ByTable
}

async function countsForOneTable(tx: Tx, disasterEventId: string, valTable: any, resCol: any, groupBy: any, presenceCol: any, conditions?: Conditions): Promise<Map<string, number>> {
	/*
		SELECT hd.sex, SUM(d.deaths)
	FROM disaster_event de
	JOIN disaster_records dr ON de.id = dr.disaster_event_id
	JOIN human_dsg hd ON dr.id = hd.record_id
	JOIN deaths d ON hd.id = d.dsg_id
		JOIN human_category_presence hcp ON hd.record_id = hcp.record_id
	WHERE de.id = 'f41bd013-23cc-41ba-91d2-4e325f785171'
			AND hcp.deaths IS TRUE
		AND dr."approvalStatus" = 'published'
		AND hd.sex IS NOT NULL
		AND hd.age IS NULL
		AND hd.disability IS NULL
		AND hd.global_poverty_line IS NULL
		AND hd.national_poverty_line IS NULL
		AND (hd.custom IS NULL
			OR hd.custom = '{}'::jsonb
			OR (
				SELECT COUNT(*)
				FROM jsonb_each(hd.custom)
				WHERE jsonb_typeof(value) != 'null'
			) = 0
		)
			AND EXISTS (
			SELECT 1
			FROM jsonb_array_elements(dr.spatial_footprint) AS elem
			WHERE elem->'geojson'->'features'->0->'properties'->>'division_id' = '74'
			OR elem->'geojson'->'features'->0->'properties'->'division_ids' @> '74'::jsonb
		)
	GROUP BY hd.sex
	*/

	let de = disasterEventTable
	let dr = disasterRecordsTable
	let hd = humanDsgTable
	let vt = valTable
	let hcp = humanCategoryPresenceTable

	if (![hd.sex, hd.age, hd.disability, hd.globalPovertyLine, hd.nationalPovertyLine].includes(groupBy)) {
		console.log("groupBy", groupBy)
		throw new Error("unknown group by column")
	}

	const res = await tx
		.select({
			key: groupBy,
			sum: sum(resCol),
		})
		.from(de)
		.innerJoin(dr, eq(de.id, dr.disasterEventId))
		.innerJoin(hd, eq(dr.id, hd.recordId))
		.innerJoin(vt, eq(hd.id, vt.dsgId))
		.innerJoin(hcp, eq(hd.recordId, hcp.recordId))
		.where(
			and(
				eq(de.id, disasterEventId),
				eq(presenceCol, true),
				eq(dr.approvalStatus, "published"),
				groupBy == hd.sex ? isNotNull(hd.sex) : isNull(hd.sex),
				groupBy == hd.age ? isNotNull(hd.age) : isNull(hd.age),
				groupBy == hd.disability ? isNotNull(hd.disability) : isNull(hd.disability),
				groupBy == hd.globalPovertyLine ? isNotNull(hd.globalPovertyLine) : isNull(hd.globalPovertyLine),
				groupBy == hd.nationalPovertyLine ? isNotNull(hd.nationalPovertyLine) : isNull(hd.nationalPovertyLine),
				sql`(
					${hd.custom} IS NULL
					OR ${hd.custom} = '{}'::jsonb
					OR (
						SELECT COUNT(*)
						FROM jsonb_each(${hd.custom})
						WHERE jsonb_typeof(value) != 'null'
					) = 0
				)`,
				conditions?.divisionId ? sql`EXISTS (
					SELECT 1
					FROM jsonb_array_elements(${dr.spatialFootprint}) AS elem
					WHERE elem->'geojson'->'features'->0->'properties'->>'division_id' = ${conditions.divisionId}
					OR elem->'geojson'->'features'->0->'properties'->'division_ids' @> ${conditions.divisionId}::jsonb
				)` : undefined
			)
		)
		.groupBy(groupBy)

	let m = new Map<string, number>()
	if (!res || !res.length) {
		return m
	}
	for (let r of res) {
		m.set(r.key, Number(r.sum))
	}
	return m
}


