import {describe, it} from 'node:test'
import assert from 'node:assert/strict'
import {dr} from '~/db.server'
import {sql} from 'drizzle-orm'
import {hazardousEventCreate, hazardousEventById, HazardousEventFields, RelationCycleError, hazardousEventUpdate} from './event'
import {
	eventTable,
	hazardousEventTable,
} from '~/drizzle/schema'
import {createTestData} from '~/backend.server/models/hip_test'
import {FormError} from '~/frontend/form'

function testHazardFields(id: number) {
	let data: HazardousEventFields = {
		createdAt: new Date(),
		updatedAt: null,
		parent: "",
		hipClassId: "class1",
		hipClusterId: "cluster1",
		hipHazardId: "hazard1",
		startDate: "2024-12-30",
		endDate: "2024-12-31",
		description: `Test hazard event ${id}`,
		chainsExplanation: "Test explanation",
		magnitude: "Moderate",
		spatialFootprint: "todo",
		recordOriginator: "external-user",
		dataSource: "external",
		approvalStatus: "open"
	}
	return data
}

async function hazardousEventTestData() {
	await createTestData()
	await dr.execute(sql`TRUNCATE ${eventTable}, ${hazardousEventTable} CASCADE`)
}

describe("hazardous_event", async () => {
	// Check that the constraint errors from create are properly handled
	it("create contraint error", async () => {
		let data = testHazardFields(1)
		data.hipClassId = "xxx"
		data.hipClusterId = "xxx"
		data.hipHazardId = "xxx"
		let res = await hazardousEventCreate(dr, data)
		console.log(res)
		assert(!res.ok)
		let errs = res.errors.fields?.hipHazardId
		assert.equal(errs?.length, 1)
		let err = errs[0] as FormError
		assert(err.code, "constraint")
		assert(err.data, "reference")
	})

	// Check that basic update works.
	it("update success", async () => {
		await hazardousEventTestData()

		let data = testHazardFields(1)
		let id: string
		{
			let res = await hazardousEventCreate(dr, data)
			console.log("res", JSON.stringify(res))
			assert(res.ok)
			id = res.id
		}
		{
			data.endDate = "2025-01-01"
			let res = await hazardousEventUpdate(dr, id, data)
			assert(res.ok)
			let got = await hazardousEventById(id)
			assert(got)
			assert(got.endDate! == data.endDate)
		}
	})

	// Check that the constraint errors from update are properly handled
	it("update constraint error", async () => {
		let data = testHazardFields(1)
		let id: string = ""
		{
			let res = await hazardousEventCreate(dr, data)
			assert(res.ok)
			id = res.id
		}
		{
			data.hipClassId = "xxx"
			data.hipClusterId = "xxx"
			data.hipHazardId = "xxx"
			let res = await hazardousEventUpdate(dr, id, data)
			assert(!res.ok)
			let errs = res.errors.fields?.hipHazardId
			assert.equal(errs?.length, 1)
			let err = errs[0] as FormError
			assert(err.code, "constraint")
			assert(err.data, "reference")
		}
	})

	// Check that update that creates a relation cycle is not allowed.
	it("update link cycle", async () => {
		await hazardousEventTestData()

		let data = testHazardFields(1)
		let id: string
		{
			let res = await hazardousEventCreate(dr, data)
			assert(res.ok)
			id = res.id
		}
		{
			data.parent = id
			let res = await hazardousEventUpdate(dr, id, data)
			assert(!res.ok)
			let err = res.errors.fields?.["parent"]?.[0] as FormError
			assert(err?.code === RelationCycleError.code)

			let got = await hazardousEventById(id)
			assert(got)
		}
	})

	// Check that partial update works
	it("partial update", async () => {
		await hazardousEventTestData()

		let data = testHazardFields(1)

		let event1: string
		{
			let res = await hazardousEventCreate(dr, data)
			assert(res.ok)
			event1 = res.id
		}

		let event2: string
		{
			let data = testHazardFields(2)
			data.parent = event1
			let res = await hazardousEventCreate(dr, data)
			assert(res.ok)
			event2 = res.id
		}

		{
			let update: Partial<HazardousEventFields> = {}
			update.description = "updated"
			let res = await hazardousEventUpdate(dr, event2, update)
			assert(res.ok)
		}

		let got = await hazardousEventById(event2)
		assert.equal(got?.description, "updated", "Description should be updated")
		assert.equal(got?.event.ps.length, 1, "Expecting 1 parent")
		assert.equal(got?.event.ps[0].p.id, event1, "Parent ID should match event1")
	})

})
