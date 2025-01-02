import { dr } from '~/db.server'
import {sql} from 'drizzle-orm'

import { hipClassTable, hipClusterTable, hipHazardTable } from '~/drizzle/schema'

export async function createTestData() {
	await dr.execute(sql`TRUNCATE ${hipClassTable}, ${hipClusterTable}, ${hipHazardTable} CASCADE`)

	let id = 0

	const [cls] = await dr
		.insert(hipClassTable)
		.values({ id: 1, nameEn: 'Test Class' })
		.onConflictDoUpdate({
			target: hipClassTable.id,
			set: { nameEn: 'Test Class' },
		})
		.returning({ id: hipClassTable.id })

	for (let i = 1; i <= 2; i++) {
		const [cluster] = await dr
			.insert(hipClusterTable)
			.values({
				id: i,
				classId: cls.id,
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

