// Load environment variables for tests
import 'dotenv/config'

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { dr, initDB } from '~/db.server'
import { sql } from 'drizzle-orm'
import { hazardousEventCreate, hazardousEventById, HazardousEventFields, hazardousEventUpdate, hazardousEventDelete } from './event'
import {
	eventTable,
	hazardousEventTable,
} from '~/drizzle/schema'
import { createTestData } from '~/backend.server/models/hip_test'
import { FormError } from '~/frontend/form'
import { TenantContext } from '~/util/tenant'
// Import country test data and functions
import {
	createTestCountryAccounts
} from './country_test'

// Country and country account IDs from the database
const TEST_COUNTRY_ID_DRC = '123e4567-e89b-12d3-a456-426614174001'
const TEST_COUNTRY_ID_YEM = '123e4567-e89b-12d3-a456-426614174002'
const TEST_COUNTRY_ID_PHL = '123e4567-e89b-12d3-a456-426614174003'

const TEST_COUNTRY_ACCOUNT_ID_DRC = '123e4567-e89b-12d3-a456-426614174011'
const TEST_COUNTRY_ACCOUNT_ID_YEM = '123e4567-e89b-12d3-a456-426614174012'
const TEST_COUNTRY_ACCOUNT_ID_PHL = '123e4567-e89b-12d3-a456-426614174013'

// Error codes for hazardous event validation
const SelfReferenceError = {
	code: "ErrSelfReference",
	message: "Cannot set an event as its own parent"
}

// Initialize database connection before tests run
initDB()

function testHazardFields(id: number) {
	let data: HazardousEventFields = {
		createdAt: new Date(),
		updatedAt: null,
		parent: "",
		hipTypeId: "type1",
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
		approvalStatus: "draft"
	}
	return data
}

// Mock tenant contexts for testing with valid UUIDs from country test data
const mockTenantContext: TenantContext = {
	countryAccountId: TEST_COUNTRY_ACCOUNT_ID_DRC, // DRC account ID
	countryId: TEST_COUNTRY_ID_DRC, // DRC country ID
	countryName: "Democratic Republic of the Congo",
	iso3: "COD"
}

// Second tenant context for isolation testing
const mockTenantContext2: TenantContext = {
	countryAccountId: TEST_COUNTRY_ACCOUNT_ID_YEM, // Yemen account ID
	countryId: TEST_COUNTRY_ID_YEM, // Yemen country ID
	countryName: "Yemen",
	iso3: "YEM"
}

// Third tenant context using Philippines data (for future tests if needed)
// Export it for potential future use in other test files
export const mockTenantContext3: TenantContext = {
	countryAccountId: TEST_COUNTRY_ACCOUNT_ID_PHL, // Philippines account ID
	countryId: TEST_COUNTRY_ID_PHL, // Philippines country ID
	countryName: "Philippines",
	iso3: "PHL"
}

async function hazardousEventTestData() {
	// Create country and country account test data first
	await createTestCountryAccounts()
	// Then create HIP test data
	await createTestData()
	// Clear hazardous event tables
	await dr.execute(sql`TRUNCATE ${eventTable}, ${hazardousEventTable} CASCADE`)
}

describe("hazardous_event", async () => {
	// Check that the constraint errors from create are properly handled
	it("create contraint error", async () => {
		let data = testHazardFields(1)
		data.hipTypeId = "xxx"
		data.hipClusterId = "xxx"
		data.hipHazardId = "xxx"
		let res = await hazardousEventCreate(dr, data, mockTenantContext)
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
			let res = await hazardousEventCreate(dr, data, mockTenantContext)
			console.log("res", JSON.stringify(res))
			assert(res.ok)
			id = res.id
		}
		{
			data.endDate = "2025-01-01"
			let res = await hazardousEventUpdate(dr, id, data, mockTenantContext)
			assert(res.ok)
			let got = await hazardousEventById(id, mockTenantContext)
			assert(got)
			assert(got.endDate! == data.endDate)
		}
	})

	// Check that the constraint errors from update are properly handled
	it("update constraint error", async () => {
		let data = testHazardFields(1)
		let id: string = ""
		{
			let res = await hazardousEventCreate(dr, data, mockTenantContext)
			assert(res.ok)
			id = res.id
		}
		{
			data.hipTypeId = "xxx"
			data.hipClusterId = "xxx"
			data.hipHazardId = "xxx"
			let res = await hazardousEventUpdate(dr, id, data, mockTenantContext)
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
			let res = await hazardousEventCreate(dr, data, mockTenantContext)
			assert(res.ok)
			id = res.id
		}
		{
			// Setting an event as its own parent should fail with ErrSelfReference
			data.parent = id
			let res = await hazardousEventUpdate(dr, id, data, mockTenantContext)

			// The update should fail
			assert(!res.ok, "Expected update to fail when creating a self-reference")

			// Check for the correct error code
			let err = res.errors?.fields?.["parent"]?.[0] as FormError
			assert(err?.code === SelfReferenceError.code, `Expected error code ${SelfReferenceError.code} but got ${err?.code}`)

			// Verify the event still exists and wasn't modified
			let got = await hazardousEventById(id, mockTenantContext)
			assert(got)
		}
	})

	// Check that partial update works
	it("partial update", async () => {
		await hazardousEventTestData()

		let data = testHazardFields(1)

		let event1: string
		{
			let res = await hazardousEventCreate(dr, data, mockTenantContext)
			assert(res.ok)
			event1 = res.id
		}

		let event2: string
		{
			let data = testHazardFields(2)
			data.parent = event1
			let res = await hazardousEventCreate(dr, data, mockTenantContext)
			assert(res.ok)
			event2 = res.id
		}

		{
			let update: Partial<HazardousEventFields> = {}
			update.description = "updated"
			let res = await hazardousEventUpdate(dr, event2, update, mockTenantContext)
			assert(res.ok)
		}

		let got = await hazardousEventById(event2, mockTenantContext)
		assert.equal(got?.description, "updated", "Description should be updated")
		assert.equal(got?.event.ps.length, 1, "Expecting 1 parent")
		assert.equal(got?.event.ps[0].p.id, event1, "Parent ID should match event1")
	})

	// Test tenant isolation - verify that records are properly isolated between tenants
	it("tenant isolation", async () => {
		await hazardousEventTestData()

		// Create an event for tenant 1
		const tenant1Data = testHazardFields(1)
		tenant1Data.description = "Tenant 1 Event"
		let tenant1EventId: string
		{
			const res = await hazardousEventCreate(dr, tenant1Data, mockTenantContext)
			assert(res.ok, "Should successfully create event for tenant 1")
			tenant1EventId = res.id
		}

		// Create an event for tenant 2
		const tenant2Data = testHazardFields(2)
		tenant2Data.description = "Tenant 2 Event"
		let tenant2EventId: string
		{
			const res = await hazardousEventCreate(dr, tenant2Data, mockTenantContext2)
			assert(res.ok, "Should successfully create event for tenant 2")
			tenant2EventId = res.id
		}

		// Verify tenant 1 can access their own event
		{
			const event = await hazardousEventById(tenant1EventId, mockTenantContext)
			assert(event, "Tenant 1 should be able to access their own event")
			assert.equal(event.description, "Tenant 1 Event", "Event should have correct description")
		}

		// Verify tenant 2 can access their own event
		{
			const event = await hazardousEventById(tenant2EventId, mockTenantContext2)
			assert(event, "Tenant 2 should be able to access their own event")
			assert.equal(event.description, "Tenant 2 Event", "Event should have correct description")
		}

		// Verify tenant 1 CANNOT access tenant 2's event
		{
			const event = await hazardousEventById(tenant2EventId, mockTenantContext)
			assert(!event, "Tenant 1 should NOT be able to access tenant 2's event")
		}

		// Verify tenant 2 CANNOT access tenant 1's event
		{
			const event = await hazardousEventById(tenant1EventId, mockTenantContext2)
			assert(!event, "Tenant 2 should NOT be able to access tenant 1's event")
		}

		// Verify tenant 1 CAN update their own event
		{
			const updateData = { description: "Updated Tenant 1 Event" }
			const res = await hazardousEventUpdate(dr, tenant1EventId, updateData, mockTenantContext)
			assert(res.ok, "Tenant 1 should be able to update their own event")

			// Verify tenant 1's data is updated
			const event = await hazardousEventById(tenant1EventId, mockTenantContext)
			assert(event, "Tenant 1's event should still exist")
			assert.equal(event.description, "Updated Tenant 1 Event", "Event description should be updated")
		}

		// Verify tenant 2 CAN update their own event
		{
			const updateData = { description: "Updated Tenant 2 Event" }
			const res = await hazardousEventUpdate(dr, tenant2EventId, updateData, mockTenantContext2)
			assert(res.ok, "Tenant 2 should be able to update their own event")

			// Verify tenant 2's data is updated
			const event = await hazardousEventById(tenant2EventId, mockTenantContext2)
			assert(event, "Tenant 2's event should still exist")
			assert.equal(event.description, "Updated Tenant 2 Event", "Event description should be updated")
		}

		// Verify tenant 1 CANNOT update tenant 2's event
		{
			const updateData = { description: "Attempted update from tenant 1" }
			const res = await hazardousEventUpdate(dr, tenant2EventId, updateData, mockTenantContext)
			assert(!res.ok, "Tenant 1 should NOT be able to update tenant 2's event")

			// Verify tenant 2's data remains unchanged
			const event = await hazardousEventById(tenant2EventId, mockTenantContext2)
			assert(event, "Tenant 2's event should still exist")
			assert.equal(event.description, "Updated Tenant 2 Event", "Event description should remain unchanged")
		}

		// Verify tenant 2 CANNOT update tenant 1's event
		{
			const updateData = { description: "Attempted update from tenant 2" }
			const res = await hazardousEventUpdate(dr, tenant1EventId, updateData, mockTenantContext2)
			assert(!res.ok, "Tenant 2 should NOT be able to update tenant 1's event")

			// Verify tenant 1's data remains unchanged
			const event = await hazardousEventById(tenant1EventId, mockTenantContext)
			assert(event, "Tenant 1's event should still exist")
			assert.equal(event.description, "Updated Tenant 1 Event", "Event description should remain unchanged")
		}

		// Create a third event for tenant 1 to test deletion
		let tenant1EventToDeleteId: string
		{
			const deleteTestData = testHazardFields(3)
			deleteTestData.description = "Tenant 1 Event To Delete"
			const res = await hazardousEventCreate(dr, deleteTestData, mockTenantContext)
			assert(res.ok, "Should successfully create event for tenant 1 to delete")
			tenant1EventToDeleteId = res.id

			// Verify it exists
			const event = await hazardousEventById(tenant1EventToDeleteId, mockTenantContext)
			assert(event, "Tenant 1's event to delete should exist")
		}

		// Create a fourth event for tenant 2 to test cross-tenant deletion attempts
		let tenant2EventToDeleteId: string
		{
			const deleteTestData = testHazardFields(4)
			deleteTestData.description = "Tenant 2 Event To Delete"
			const res = await hazardousEventCreate(dr, deleteTestData, mockTenantContext2)
			assert(res.ok, "Should successfully create event for tenant 2 to delete")
			tenant2EventToDeleteId = res.id

			// Verify it exists
			const event = await hazardousEventById(tenant2EventToDeleteId, mockTenantContext2)
			assert(event, "Tenant 2's event to delete should exist")
		}

		// Verify tenant 2 CANNOT delete tenant 1's event
		{
			// Attempt to delete tenant 1's event using tenant 2's context
			const res = await hazardousEventDelete(tenant1EventToDeleteId, mockTenantContext2)
			assert(!res.ok, "Tenant 2 should NOT be able to delete tenant 1's event")
			assert.equal(res.error, "Record not found or access denied", "Should get access denied error")

			// Verify tenant 1's event still exists
			const event = await hazardousEventById(tenant1EventToDeleteId, mockTenantContext)
			assert(event, "Tenant 1's event should still exist after tenant 2's deletion attempt")
		}

		// Verify tenant 1 CANNOT delete tenant 2's event
		{
			// Attempt to delete tenant 2's event using tenant 1's context
			const res = await hazardousEventDelete(tenant2EventToDeleteId, mockTenantContext)
			assert(!res.ok, "Tenant 1 should NOT be able to delete tenant 2's event")
			assert.equal(res.error, "Record not found or access denied", "Should get access denied error")

			// Verify tenant 2's event still exists
			const event = await hazardousEventById(tenant2EventToDeleteId, mockTenantContext2)
			assert(event, "Tenant 2's event should still exist after tenant 1's deletion attempt")
		}

		// Verify tenant 1 CAN delete their own event
		{
			// Delete tenant 1's event using tenant 1's context
			const res = await hazardousEventDelete(tenant1EventToDeleteId, mockTenantContext)
			assert(res.ok, "Tenant 1 should be able to delete their own event")

			// Verify tenant 1's event no longer exists
			const event = await hazardousEventById(tenant1EventToDeleteId, mockTenantContext)
			assert(!event, "Tenant 1's event should be deleted")
		}

		// Verify tenant 2 CAN delete their own event
		{
			// Delete tenant 2's event using tenant 2's context
			const res = await hazardousEventDelete(tenant2EventToDeleteId, mockTenantContext2)
			assert(res.ok, "Tenant 2 should be able to delete their own event")

			// Verify tenant 2's event no longer exists
			const event = await hazardousEventById(tenant2EventToDeleteId, mockTenantContext2)
			assert(!event, "Tenant 2's event should be deleted")
		}
	})
})
