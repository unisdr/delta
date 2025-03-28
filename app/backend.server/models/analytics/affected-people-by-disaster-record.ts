import {eq, sql, and, isNull} from "drizzle-orm";
import {Tx} from "~/db.server";
import {
	humanDsgTable,
	humanCategoryPresenceTable,
} from "~/drizzle/schema";
import {affectedTablesAndCols} from "./affected-people-tables";

type AffectedValue = boolean | number

interface Affected {
	deaths: AffectedValue
	injured: AffectedValue
	missing: AffectedValue
	directlyAffected: AffectedValue
	indirectlyAffected: AffectedValue
	displaced: AffectedValue
}

export async function getAffectedByDisasterRecord(tx: Tx, recId: string): Promise<Affected> {
	let entries = await Promise.all(
		affectedTablesAndCols.map(async def => {
			let value = await queryValueIfPresent(tx, def.table, def.col, def.presenceCol, recId)
			return [def.code, value]
		})
	)
	return Object.fromEntries(entries) as Affected
}

async function queryValueIfPresent(
	tx: Tx,
	valTable: any,
	valCol: any,
	presenceCol: any,
	recId: string
): Promise<number | true | false> {
	let hcp = humanCategoryPresenceTable

	let [presence] = await tx
		.select({present: presenceCol})
		.from(hcp)
		.where(eq(hcp.recordId, recId))

	if (!presence?.present) return false

	let hd = humanDsgTable

	let conditions = and(
		eq(hd.recordId, recId),
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
		)`
	)

	let [row] = await tx
		.select({value: valCol})
		.from(hd)
		.innerJoin(valTable, eq(hd.id, valTable.dsgId))
		.where(conditions)

	if (!row) return true
	if (row.value == null) return true
	return Number(row.value)
}

