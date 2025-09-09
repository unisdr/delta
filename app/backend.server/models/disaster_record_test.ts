// Load environment variables for tests
import 'dotenv/config'

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { dr, initDB, Tx } from '~/db.server'
import { sql } from 'drizzle-orm'

import {
	eventTable,
	hazardousEventTable,
	disasterEventTable,
	disasterRecordsTable,
	countryAccounts,
	countries
} from '~/drizzle/schema'

import { createTestData } from './hip_test'

import {
	disasterRecordsCreate,
	disasterRecordsById,
	disasterRecordsUpdate,
	disasterRecordsDeleteById,
	DisasterRecordsFields
} from './disaster_record'

// Initialize database connection before tests run
initDB()

// Test UUIDs for disaster records
export const testDisasterRecord1Id = "00000000-0000-0000-0000-000000000001"
export const testDisasterRecord2Id = "d85f02a4-5f39-45d8-9669-5089cfd49555"
export const testDisasterRecord3Id = "d85f02a4-5f39-45d8-9669-5089cfd49556"

// Helper function to create test disaster record fields
function testDisasterRecordFields(num: number): Partial<DisasterRecordsFields> {
	return {
		approvalStatus: "draft",
		startDate: new Date().toISOString().slice(0, 10),
		endDate: new Date().toISOString().slice(0, 10),
		disasterEventId: "", // Will be set during test
		primaryDataSource: `Test Disaster Record ${num} Data Source`
	}
}

// Helper function to create a hazardous event for testing
async function createTestHazardousEvent(countryAccountsId: string) {
	// Create a hazardous event with proper tenant context
	const eventResult = await dr.insert(eventTable)
		.values({} as typeof eventTable.$inferInsert)
		.returning({ id: eventTable.id })

	const eventId = eventResult[0].id

	// Insert hazardous event with tenant context
	await dr.insert(hazardousEventTable)
		.values({
			id: eventId,
			hipTypeId: "type1",
			startDate: new Date().toISOString().slice(0, 10),
			endDate: new Date().toISOString().slice(0, 10),
			countryAccountsId: countryAccountsId
		} as typeof hazardousEventTable.$inferInsert)
		.execute()

	return eventId
}

// Helper function to create a disaster event for testing
async function createTestDisasterEvent(hazardousEventId: string, countryAccountsId: string) {
	// Create a disaster event with proper tenant context
	const eventResult = await dr.insert(eventTable)
		.values({} as typeof eventTable.$inferInsert)
		.returning({ id: eventTable.id })

	const eventId = eventResult[0].id

	// Insert disaster event with tenant context
	await dr.insert(disasterEventTable)
		.values({
			id: eventId,
			hazardousEventId: hazardousEventId,
			countryAccountsId: countryAccountsId
		} as typeof disasterEventTable.$inferInsert)
		.execute()

	return eventId
}

// Setup function to clean database and create necessary test data
async function disasterRecordTestData() {
	// Then create HIP test data
	await createTestData()
	// Clear disaster record tables
	await dr.execute(sql`TRUNCATE ${disasterRecordsTable} CASCADE`)
	await dr.execute(sql`TRUNCATE ${disasterEventTable} CASCADE`)
	await dr.execute(sql`TRUNCATE ${hazardousEventTable} CASCADE`)
	await dr.execute(sql`TRUNCATE ${eventTable} CASCADE`)
}
export let testCountryId = "00000000-0000-0000-0000-000000000001"
export let testCountryAccountsId = "00000000-0000-0000-0000-000000000001"

export async function createTestCountryAccount(tx: Tx) {
	await dr.execute(sql`TRUNCATE ${countries}, ${countryAccounts} CASCADE`)

	await tx.insert(countries)
		.values({
			id: testCountryId,
			name: "test"
		})
	await tx.insert(countryAccounts)
		.values({
			id: testCountryAccountsId,
			shortDescription: "test",
			countryId: testCountryId
		})
}

export async function createTestDisasterRecord1(tx: Tx) {
	await createTestData()
	await createTestCountryAccount(tx)

	let res1 = await tx.insert(eventTable)
		.values({} as typeof eventTable.$inferInsert)
		.returning({ id: eventTable.id })
	let id1 = res1[0].id
	await tx.insert(hazardousEventTable)
		.values({
			id: id1,
			countryAccountsId: testCountryAccountsId,
			hipTypeId: "type1",
			startDate: new Date().toISOString().slice(0, 10),
			endDate: new Date().toISOString().slice(0, 10),
		} as typeof hazardousEventTable.$inferInsert)

	let res2 = await tx.insert(eventTable)
		.values({} as typeof eventTable.$inferInsert)
		.returning({ id: eventTable.id })
	let id2 = res2[0].id
	await tx.insert(disasterEventTable)
		.values({
			id: id2,
			hazardousEventId: id1,
			countryAccountsId: testCountryAccountsId,
		} as typeof disasterEventTable.$inferInsert)
	await tx.insert(disasterRecordsTable)
		.values({
			id: testDisasterRecord1Id,
			disasterEventId: id2,
			countryAccountsId: testCountryAccountsId,
		} as typeof disasterRecordsTable.$inferInsert)
		.returning({ id: disasterRecordsTable.id })
}

// Helper function to get disaster record by ID with tenant context
async function testDisasterRecordById(idStr: string) {
	return await disasterRecordsById(idStr)
}

// Main test cases
describe('Disaster Record Tenant Isolation Tests', async () => {
	// Setup test data before running tests
	await disasterRecordTestData()

	// Test case for creating disaster records with tenant isolation
	it('should create disaster records with tenant isolation', async () => {
		// Create hazardous events for each tenant
		const countryAccountsId = "123456"
		const hazardousEventId1 = await createTestHazardousEvent(countryAccountsId)
		const hazardousEventId2 = await createTestHazardousEvent(countryAccountsId)

		// Create disaster events for each tenant using their respective hazardous events
		const disasterEventId1 = await createTestDisasterEvent(hazardousEventId1, countryAccountsId)
		const disasterEventId2 = await createTestDisasterEvent(hazardousEventId2, countryAccountsId)

		// Create disaster record for tenant 1
		const disasterRecord1 = testDisasterRecordFields(1)
		disasterRecord1.disasterEventId = disasterEventId1

		const result1 = await disasterRecordsCreate(dr, disasterRecord1 as DisasterRecordsFields)
		assert.strictEqual(result1.ok, true, 'Disaster record creation for tenant 1 should succeed')
		const tenant1RecordId = result1.id

		// Create disaster record for tenant 2
		const disasterRecord2 = testDisasterRecordFields(2)
		disasterRecord2.disasterEventId = disasterEventId2

		const result2 = await disasterRecordsCreate(dr, disasterRecord2 as DisasterRecordsFields)
		assert.strictEqual(result2.ok, true, 'Disaster record creation for tenant 2 should succeed')
		const tenant2RecordId = result2.id

		// Try to create disaster record for tenant 1 with disaster event from tenant 2
		const disasterRecord3 = testDisasterRecordFields(3)
		disasterRecord3.disasterEventId = disasterEventId2 // Using tenant 2's disaster event

		const result3 = await disasterRecordsCreate(dr, disasterRecord3 as DisasterRecordsFields)
		assert.strictEqual(result3.ok, false, 'Disaster record creation with cross-tenant disaster event should fail')

		// Verify tenant 1 CANNOT access tenant 2's record
		const crossTenantAccess1 = await testDisasterRecordById(tenant2RecordId)
		assert.strictEqual(crossTenantAccess1, null, "Tenant 1 should NOT be able to access tenant 2's disaster record")

		// Verify tenant 2 CANNOT access tenant 1's record
		const crossTenantAccess2 = await testDisasterRecordById(tenant1RecordId)
		assert.strictEqual(crossTenantAccess2, null, "Tenant 2 should NOT be able to access tenant 1's disaster record")
	})

	// Test case for accessing disaster records with tenant isolation
	it('should enforce tenant isolation when accessing disaster records', async () => {
		const countryAccountsId = "12345"
		// Create hazardous event for tenant 1
		const hazardousEventId1 = await createTestHazardousEvent(countryAccountsId)

		// Create disaster event for tenant 1
		const disasterEventId1 = await createTestDisasterEvent(hazardousEventId1, countryAccountsId)

		// Create disaster record for tenant 1
		const disasterRecord1 = testDisasterRecordFields(4)
		disasterRecord1.disasterEventId = disasterEventId1

		const result1 = await disasterRecordsCreate(dr, disasterRecord1 as DisasterRecordsFields)
		assert.strictEqual(result1.ok, true, 'Disaster record creation for tenant 1 should succeed')
		const recordId = result1.id

		// Tenant 1 should be able to access their own disaster record
		const disasterRecord1Access = await testDisasterRecordById(recordId)
		assert.notStrictEqual(disasterRecord1Access, null, 'Tenant 1 should be able to access their own disaster record')

		// Tenant 2 should not be able to access tenant 1's disaster record
		const disasterRecord2Access = await testDisasterRecordById(recordId)
		assert.strictEqual(disasterRecord2Access, null, 'Tenant 2 should not be able to access tenant 1\'s disaster record')
	})
	
	// Test case for updating disaster records with tenant isolation
	it('should enforce tenant isolation when updating disaster records', async () => {
		const countryAccountsId ="1234"
		// Create hazardous event for tenant 1
		const hazardousEventId1 = await createTestHazardousEvent(countryAccountsId)

		// Create disaster event for tenant 1
		const disasterEventId1 = await createTestDisasterEvent(hazardousEventId1, countryAccountsId)

		// Create disaster record for tenant 1
		const disasterRecord1 = testDisasterRecordFields(5)
		disasterRecord1.disasterEventId = disasterEventId1

		const result1 = await disasterRecordsCreate(dr, disasterRecord1 as DisasterRecordsFields)
		assert.strictEqual(result1.ok, true, 'Disaster record creation for tenant 1 should succeed')
		const recordId = result1.id

		// Update the disaster record as tenant 1
		const updateFields = {
			primaryDataSource: 'Updated Primary Data Source',
			disasterEventId: disasterEventId1
		}

		const updateResult1 = await disasterRecordsUpdate(dr, recordId, updateFields, countryAccountsId)
		assert.strictEqual(updateResult1.ok, true, 'Tenant 1 should be able to update their own disaster record')

		// Try to update the disaster record as tenant 2
		const countryAccountsId2="3456";
		const updateResult2 = await disasterRecordsUpdate(dr, recordId, updateFields, countryAccountsId2)
		assert.strictEqual(updateResult2.ok, false, 'Tenant 2 should not be able to update tenant 1\'s disaster record')
	})
	
	// Test case for deleting disaster records with tenant isolation
	it('should enforce tenant isolation when deleting disaster records', async () => {
		const countryAccountsId="1234";
		// Create hazardous event for tenant 1
		const hazardousEventId1 = await createTestHazardousEvent(countryAccountsId)
		
		// Create disaster event for tenant 1
		const disasterEventId1 = await createTestDisasterEvent(hazardousEventId1, countryAccountsId)
		
		// Create disaster record for tenant 1
		const disasterRecord1 = testDisasterRecordFields(6)
		disasterRecord1.disasterEventId = disasterEventId1
		
		const result1 = await disasterRecordsCreate(dr, disasterRecord1 as DisasterRecordsFields)
		assert.strictEqual(result1.ok, true, 'Disaster record creation for tenant 1 should succeed')
		const recordId = result1.id

		// Try to delete the disaster record as tenant 2
		const countryAccountsId2="3456";
		const deleteResult1 = await disasterRecordsDeleteById(recordId, countryAccountsId2)
		assert.strictEqual(deleteResult1.ok, false, 'Tenant 2 should not be able to delete tenant 1\'s disaster record')

		// Delete the disaster record as tenant 1
		const deleteResult2 = await disasterRecordsDeleteById(recordId, countryAccountsId)
		assert.strictEqual(deleteResult2.ok, true, 'Tenant 1 should be able to delete their own disaster record')

		// Verify the disaster record is deleted
		const disasterRecord1Access = await testDisasterRecordById(recordId)
		assert.strictEqual(disasterRecord1Access, null, 'Disaster record should be deleted')
	})
})

