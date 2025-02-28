import {Tx} from '~/db.server'
import {
	eventTable,
	hazardousEventTable,
	disasterEventTable,
	disasterRecordsTable
} from '~/drizzle/schema'
import {createTestData} from './hip_test'

export const testDisasterRecord1Id = "d85f02a4-5f39-45d8-9669-5089cfd49554"

export async function createTestDisasterRecord1(tx: Tx) {

	await createTestData()

	let res1 = await tx.insert(eventTable)
		.values({})
		.returning({id: eventTable.id})
	let id1 = res1[0].id
	await tx.insert(hazardousEventTable)
		.values({
			id: id1,
			hipTypeId: "type1",
			startDate: new Date(),
			endDate: new Date(),
		})

	let res2 = await tx.insert(eventTable)
		.values({})
		.returning({id: eventTable.id})
	let id2 = res2[0].id
	await tx.insert(disasterEventTable)
		.values({
			id: id2,
			hazardousEventId: id1
		})
	await tx.insert(disasterRecordsTable)
		.values({
			id: testDisasterRecord1Id,
			disasterEventId: id2
		})
		.returning({id: disasterRecordsTable.id})
}
