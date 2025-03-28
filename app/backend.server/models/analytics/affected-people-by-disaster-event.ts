import {eq, sql, and, isNull, sum} from "drizzle-orm";
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
		deaths: await getTotalForDisasterEvent(tx, disasterEventId, deathsTable, deathsTable.deaths),
		injured: await getTotalForDisasterEvent(tx, disasterEventId, injuredTable, injuredTable.injured),
		missing: await getTotalForDisasterEvent(tx, disasterEventId, missingTable, missingTable.missing),
		directlyAffected: await getTotalForDisasterEvent(tx, disasterEventId, affectedTable, affectedTable.direct),
		displaced: await getTotalForDisasterEvent(tx, disasterEventId, displacedTable, displacedTable.displaced)
	}
	let total = res.deaths + res.injured + res.missing + res.directlyAffected + res.displaced
	return {
		total,
		...res
	}
}

// The code for deaths, injured, missing, displaced is exactly the same.
// For directlyAffected has a minor variation that a table has both direct and indirect columns, we only need direct from there.

async function getTotalForDisasterEvent(tx: Tx, disasterEventId: string, valTable: any, resCol: any): Promise<number> {
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
		AND hd.custom = '{}'::jsonb;
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
				sql`${hd.custom} = '{}'::jsonb`
			)
		)

	if (!res || !res.length) {
		return 0
	}

	return Number(res[0].sum)
}

