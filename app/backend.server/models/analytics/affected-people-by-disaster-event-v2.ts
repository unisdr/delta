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
} from "~/drizzle/schema";


export async function getAffected(tx: Tx, disasterEventId: string) {
	let res = {
		noDisaggregations: await totalsForEachTable(tx, disasterEventId),
		disaggregations: await byColAndTableTotalsOnlyForFrontend(tx, disasterEventId)
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

const totalsTablesAndCols = [
	{code: "deaths", table: deathsTable, col: deathsTable.deaths},
	{code: "injured", table: injuredTable, col: injuredTable.injured},
	{code: "missing", table: missingTable, col: missingTable.missing},
	{code: "directlyAffected", table: affectedTable, col: affectedTable.direct},
	{code: "displaced", table: displacedTable, col: displacedTable.displaced}
]


async function totalsForEachTable(tx: Tx, disasterEventId: string): Promise<Total> {
	let vars: any = {}
	let total = 0
	for (let a of totalsTablesAndCols) {
		let v = await totalsForOneTable(tx, disasterEventId, a.table, a.col)
		vars[a.code] = v
		total += v
	}
	return {total, tables: vars} as Total
}


// The code for deaths, injured, missing, displaced is exactly the same.
// For directlyAffected has a minor variation that a table has both direct and indirect columns, we only need direct from there.

async function totalsForOneTable(tx: Tx, disasterEventId: string, valTable: any, resCol: any): Promise<number> {
	/*
	SELECT SUM(d.deaths)
	FROM disaster_event de
	JOIN disaster_records dr ON de.id = dr.disaster_event_id
	JOIN human_dsg hd ON dr.id = hd.record_id
	JOIN deaths d ON hd.id = d.dsg_id
	WHERE de.id = 'f41bd013-23cc-41ba-91d2-4e325f785171'
		AND dr."approvalStatus" = 'published'
		AND hd.sex IS NULL
		AND hd.age IS NULL
		AND hd.disability IS NULL
		AND hd.global_poverty_line IS NULL
		AND hd.national_poverty_line IS NULL
		AND (hd.custom IS NULL
			OR hd.custom = '{}'::jsonb
		)
	*/

	let de = disasterEventTable
	let dr = disasterRecordsTable
	let hd = humanDsgTable
	let vt = valTable

	const res = await tx
		.select({
			sum: sum(resCol),
		})
		.from(de)
		.innerJoin(dr, eq(de.id, dr.disasterEventId))
		.innerJoin(hd, eq(dr.id, hd.recordId))
		.innerJoin(vt, eq(hd.id, vt.dsgId))
		.where(
			and(
				eq(de.id, disasterEventId),
				eq(dr.approvalStatus, "published"),
				isNull(hd.sex),
				isNull(hd.age),
				isNull(hd.disability),
				isNull(hd.globalPovertyLine),
				isNull(hd.nationalPovertyLine),
				sql`(
					${hd.custom} IS NULL
					OR ${hd.custom} = '{}'::jsonb
				)`
			)
		)

	if (!res || !res.length) {
		return 0
	}

	return Number(res[0].sum)
}



const tables = [
	{code: "sex", col: humanDsgTable.sex},
	{code: "age", col: humanDsgTable.age},
	{code: "disability", col: humanDsgTable.disability},
	{code: "globalPovertyLine", col: humanDsgTable.globalPovertyLine},
	{code: "nationalPovertyLine", col: humanDsgTable.nationalPovertyLine},
]

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
}

type ByColAndTableTotalsOnly = {
	sex: Map<string, number>
	age: Map<string, number>
	disability: Map<string, number>
	globalPovertyLine: Map<string, number>
	nationalPovertyLine: Map<string, number>
}

async function byColAndTableTotalsOnly(tx: Tx, disasterEventId: string): Promise<ByColAndTableTotalsOnly> {
	let res: any = {}
	for (let t of tables) {
		let v = await byTable(tx, disasterEventId, t.col)
		res[t.code] = v.total
	}
	return res as ByColAndTableTotalsOnly
}

type KeyValue = {k: string, v: number}

type ByColAndTableTotalsOnlyForFrontend = {
	sex: KeyValue[],
	age: KeyValue[],
	disability: KeyValue[],
	globalPovertyLine: KeyValue[],
	nationalPovertyLine: KeyValue[],
}

async function byColAndTableTotalsOnlyForFrontend(tx: Tx, disasterEventId: string): Promise<ByColAndTableTotalsOnlyForFrontend> {
	let res: any = {}
	let r = await byColAndTableTotalsOnly(tx, disasterEventId)

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
		res[k] = Array.from(v.entries()).map(([k, v]) => ({k, v}))
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

async function byTable(tx: Tx, disasterEventId: string, dsgCol: any): Promise<ByTable> {
	let tables: any = {}
	let total = new Map<string, number>()
	for (let a of totalsTablesAndCols) {
		let vv = await countsForOneTable(tx, disasterEventId, a.table, a.col, dsgCol)
		tables[a.code] = vv
		for (let [k, v] of vv.entries()) {
			let a = total.get(k) || 0
			a += v
			total.set(k, a)
		}
	}
	console.log("data by table", total, tables)
	return {total, tables} as ByTable
}

async function countsForOneTable(tx: Tx, disasterEventId: string, valTable: any, resCol: any, groupBy: any): Promise<Map<string, number>> {
	/*
		SELECT hd.sex, SUM(d.deaths)
	FROM disaster_event de
	JOIN disaster_records dr ON de.id = dr.disaster_event_id
	JOIN human_dsg hd ON dr.id = hd.record_id
	JOIN deaths d ON hd.id = d.dsg_id
	WHERE de.id = 'f41bd013-23cc-41ba-91d2-4e325f785171'
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
	GROUP BY hd.sex
	*/

	let de = disasterEventTable
	let dr = disasterRecordsTable
	let hd = humanDsgTable
	let vt = valTable

	if (![hd.sex, hd.age, hd.disability, hd.globalPovertyLine, hd.nationalPovertyLine].includes(groupBy)){
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
		.where(
			and(
				eq(de.id, disasterEventId),
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
				)`
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

