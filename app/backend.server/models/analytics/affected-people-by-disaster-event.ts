import { eq, and, sum } from "drizzle-orm";
import { Tx } from "~/db.server";
import {
	disasterRecordsTable,
	disasterEventTable,
	humanCategoryPresenceTable,
} from "~/drizzle/schema";


type Affected = {
	total: number
	deaths: number
	injured: number
	missing: number
	directlyAffected: number
	displaced: number
}

export async function getAffectedByDisasterEvent(tx: Tx, disasterEventId: string): Promise<Affected> {
	let res = {
		deaths: await getTotalForDisasterEvent(tx, disasterEventId, humanCategoryPresenceTable.deathsTotal),
		injured: await getTotalForDisasterEvent(tx, disasterEventId, humanCategoryPresenceTable.injuredTotal),
		missing: await getTotalForDisasterEvent(tx, disasterEventId, humanCategoryPresenceTable.missingTotal),
		directlyAffected: await getTotalForDisasterEvent(tx, disasterEventId, humanCategoryPresenceTable.affectedDirectTotal),
		displaced: await getTotalForDisasterEvent(tx, disasterEventId, humanCategoryPresenceTable.displacedTotal)
	}
	let total = res.deaths + res.injured + res.missing + res.directlyAffected + res.displaced
	return {
		total,
		...res
	}
}

// The code for deaths, injured, missing, displaced is exactly the same.
// For directlyAffected has a minor variation that a table has both direct and indirect columns, we only need direct from there.

async function getTotalForDisasterEvent(tx: Tx, disasterEventId: string, valCol: any): Promise<number> {
	/*
	SELECT sum(hcp.deaths_total)
	FROM disaster_event de
	JOIN disaster_records dr ON de.id = dr.disaster_event_id
	JOIN human_category_presence hcp on dr.id = hcp.record_id 
	WHERE de.id = '641495e5-1ece-4376-ab31-40b6861ac001'
	*/

	let de = disasterEventTable
	let dr = disasterRecordsTable
	let hcp = humanCategoryPresenceTable

	let res = await tx
		.select({
			sum: sum(valCol),
		})
		.from(de)
		.innerJoin(dr, eq(de.id, dr.disasterEventId))
		.innerJoin(hcp, eq(dr.id, hcp.recordId))
		.where(
			and(
				eq(de.id, disasterEventId),
				eq(dr.approvalStatus, "published")
			)
		)

	if (!res || !res.length) {
		return 0
	}

	return Number(res[0].sum)
}

