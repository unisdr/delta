import { dr } from '~/db.server'
import {sql} from 'drizzle-orm'

import { hipTypeTable, hipClusterTable, hipHazardTable } from '~/drizzle/schema'

export async function createTestData() {
	await dr.execute(sql`TRUNCATE ${hipTypeTable}, ${hipClusterTable}, ${hipHazardTable} CASCADE`)

	let id = 0

	const [tp] = await dr
		.insert(hipTypeTable)
		.values({ id: "type1", nameEn: 'Test Type' })
		.onConflictDoUpdate({
			target: hipTypeTable.id,
			set: { nameEn: 'Test Type' },
		})
		.returning({ id: hipTypeTable.id })

	for (let i = 1; i <= 2; i++) {
		const [cluster] = await dr
			.insert(hipClusterTable)
			.values({
				id: "cluster" + i,
				typeId: tp.id,
				nameEn: `Test Cluster ${i}`,
			})
			.returning({ id: hipClusterTable.id })

		for (let j = 1; j <= 3; j++) {
			id++
			await dr
				.insert(hipHazardTable)
				.values({
					id: `hazard${id}`,
					clusterId: cluster.id,
					nameEn: `Test Hazard ${i}-${j}`,
					descriptionEn: `Description for Hazard ${i}-${j}`,
				})
		}
	}
}

