import {eq} from "drizzle-orm";
import {Tx} from "~/db.server";
import {
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
			let value = await queryValueIfPresent(tx, def.presenceTotalCol, def.presenceCol, recId)
			return [def.code, value]
		})
	)
	return Object.fromEntries(entries) as Affected
}

async function queryValueIfPresent(
	tx: Tx,
	valCol: any,
	presenceCol: any,
	recId: string
): Promise<number | true | false> {
	let hcp = humanCategoryPresenceTable

	let [res] = await tx
		.select({present: presenceCol, value: valCol})
		.from(hcp)
		.where(eq(hcp.recordId, recId))
	if (!res){
		return false
	}
	if (!res.present){
		return false
	}
	return Number(res.value)
}

