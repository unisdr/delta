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
	disasterRecordsTable
} from '~/drizzle/schema'

import { TenantContext } from '~/util/tenant'
import { createTestData } from './hip_test'

import {
	disasterRecordsCreate,
	disasterRecordsById,
	disasterRecordsUpdate,
	disasterRecordsDeleteById,
	DisasterRecordsFields
} from './disaster_record'

// Import test data setup from country_test.ts and event_test.ts
import {
	TEST_COUNTRY_ID_DRC,
	TEST_COUNTRY_ID_YEM,
	TEST_COUNTRY_ACCOUNT_ID_DRC,
	TEST_COUNTRY_ACCOUNT_ID_YEM,
	createTestCountryAccounts
} from './country_test'

// Initialize database connection before tests run
initDB()

// Test UUIDs for disaster records
const testDisasterRecord1Id = "00000000-0000-0000-0000-000000000001"
export const testDisasterRecord2Id = "d85f02a4-5f39-45d8-9669-5089cfd49555"
export const testDisasterRecord3Id = "d85f02a4-5f39-45d8-9669-5089cfd49556"

// First tenant context for isolation testing (DRC)
const TEST_TENANT_CONTEXT_COD: TenantContext = {
	countryAccountId: TEST_COUNTRY_ACCOUNT_ID_DRC,
	countryId: TEST_COUNTRY_ID_DRC,
	countryName: "Democratic Republic of the Congo",
	iso3: "COD"
}

// Second tenant context for isolation testing (Yemen)
const TEST_TENANT_CONTEXT_YEM: TenantContext = {
	countryAccountId: TEST_COUNTRY_ACCOUNT_ID_YEM,
	countryId: TEST_COUNTRY_ID_YEM,
	countryName: "Yemen",
	iso3: "YEM"
}

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
async function createTestHazardousEvent(tenantContext: TenantContext) {
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
			countryAccountsId: tenantContext.countryAccountId // Set tenant context
		} as typeof hazardousEventTable.$inferInsert)
		.execute()

	return eventId
}

// Helper function to create a disaster event for testing
async function createTestDisasterEvent(hazardousEventId: string, tenantContext: TenantContext) {
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
			countryAccountsId: tenantContext.countryAccountId // Set tenant context
		} as typeof disasterEventTable.$inferInsert)
		.execute()

	return eventId
}

// Setup function to clean database and create necessary test data
async function disasterRecordTestData() {
	// Create country and country account test data first
	await createTestCountryAccounts()
	// Then create HIP test data
	await createTestData()
	// Clear disaster record tables
	await dr.execute(sql`TRUNCATE ${disasterRecordsTable} CASCADE`)
	await dr.execute(sql`TRUNCATE ${disasterEventTable} CASCADE`)
	await dr.execute(sql`TRUNCATE ${hazardousEventTable} CASCADE`)
	await dr.execute(sql`TRUNCATE ${eventTable} CASCADE`)
}

// Legacy function for backward compatibility
export async function createTestDisasterRecord1(tx: Tx) {
	await createTestData()

	let res1 = await tx.insert(eventTable)
		.values({} as typeof eventTable.$inferInsert)
		.returning({ id: eventTable.id })
	let id1 = res1[0].id
	await tx.insert(hazardousEventTable)
		.values({
			id: id1,
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
			hazardousEventId: id1
		} as typeof disasterEventTable.$inferInsert)
	await tx.insert(disasterRecordsTable)
		.values({
			id: testDisasterRecord1Id,
			disasterEventId: id2
		} as typeof disasterRecordsTable.$inferInsert)
		.returning({ id: disasterRecordsTable.id })
}

// Helper function to get disaster record by ID with tenant context
async function testDisasterRecordById(idStr: string, tenantContext: TenantContext) {
	return await disasterRecordsById(idStr, tenantContext)
}

// Main test cases
describe('Disaster Record Tenant Isolation Tests', async () => {
	// Setup test data before running tests
	await disasterRecordTestData()

	// Test case for creating disaster records with tenant isolation
	it('should create disaster records with tenant isolation', async () => {
		// Create hazardous events for each tenant
		const hazardousEventId1 = await createTestHazardousEvent(TEST_TENANT_CONTEXT_COD)
		const hazardousEventId2 = await createTestHazardousEvent(TEST_TENANT_CONTEXT_YEM)

		// Create disaster events for each tenant using their respective hazardous events
		const disasterEventId1 = await createTestDisasterEvent(hazardousEventId1, TEST_TENANT_CONTEXT_COD)
		const disasterEventId2 = await createTestDisasterEvent(hazardousEventId2, TEST_TENANT_CONTEXT_YEM)

		// Create disaster record for tenant 1
		const disasterRecord1 = testDisasterRecordFields(1)
		disasterRecord1.disasterEventId = disasterEventId1

		const result1 = await disasterRecordsCreate(dr, disasterRecord1 as DisasterRecordsFields, TEST_TENANT_CONTEXT_COD)
		assert.strictEqual(result1.ok, true, 'Disaster record creation for tenant 1 should succeed')
		const tenant1RecordId = result1.id

		// Create disaster record for tenant 2
		const disasterRecord2 = testDisasterRecordFields(2)
		disasterRecord2.disasterEventId = disasterEventId2

		const result2 = await disasterRecordsCreate(dr, disasterRecord2 as DisasterRecordsFields, TEST_TENANT_CONTEXT_YEM)
		assert.strictEqual(result2.ok, true, 'Disaster record creation for tenant 2 should succeed')
		const tenant2RecordId = result2.id

		// Try to create disaster record for tenant 1 with disaster event from tenant 2
		const disasterRecord3 = testDisasterRecordFields(3)
		disasterRecord3.disasterEventId = disasterEventId2 // Using tenant 2's disaster event

		const result3 = await disasterRecordsCreate(dr, disasterRecord3 as DisasterRecordsFields, TEST_TENANT_CONTEXT_COD)
		assert.strictEqual(result3.ok, false, 'Disaster record creation with cross-tenant disaster event should fail')

		// Verify tenant 1 CANNOT access tenant 2's record
		const crossTenantAccess1 = await testDisasterRecordById(tenant2RecordId, TEST_TENANT_CONTEXT_COD)
		assert.strictEqual(crossTenantAccess1, null, "Tenant 1 should NOT be able to access tenant 2's disaster record")

		// Verify tenant 2 CANNOT access tenant 1's record
		const crossTenantAccess2 = await testDisasterRecordById(tenant1RecordId, TEST_TENANT_CONTEXT_YEM)
		assert.strictEqual(crossTenantAccess2, null, "Tenant 2 should NOT be able to access tenant 1's disaster record")
	})

	// Test case for accessing disaster records with tenant isolation
	it('should enforce tenant isolation when accessing disaster records', async () => {
		// Create hazardous event for tenant 1
		const hazardousEventId1 = await createTestHazardousEvent(TEST_TENANT_CONTEXT_COD)

		// Create disaster event for tenant 1
		const disasterEventId1 = await createTestDisasterEvent(hazardousEventId1, TEST_TENANT_CONTEXT_COD)

		// Create disaster record for tenant 1
		const disasterRecord1 = testDisasterRecordFields(4)
		disasterRecord1.disasterEventId = disasterEventId1

		const result1 = await disasterRecordsCreate(dr, disasterRecord1 as DisasterRecordsFields, TEST_TENANT_CONTEXT_COD)
		assert.strictEqual(result1.ok, true, 'Disaster record creation for tenant 1 should succeed')
		const recordId = result1.id

		// Tenant 1 should be able to access their own disaster record
		const disasterRecord1Access = await testDisasterRecordById(recordId, TEST_TENANT_CONTEXT_COD)
		assert.notStrictEqual(disasterRecord1Access, null, 'Tenant 1 should be able to access their own disaster record')

		// Tenant 2 should not be able to access tenant 1's disaster record
		const disasterRecord2Access = await testDisasterRecordById(recordId, TEST_TENANT_CONTEXT_YEM)
		assert.strictEqual(disasterRecord2Access, null, 'Tenant 2 should not be able to access tenant 1\'s disaster record')
	})

	// Test case for updating disaster records with tenant isolation
	it('should enforce tenant isolation when updating disaster records', async () => {
		// Create hazardous event for tenant 1
		const hazardousEventId1 = await createTestHazardousEvent(TEST_TENANT_CONTEXT_COD)

		// Create disaster event for tenant 1
		const disasterEventId1 = await createTestDisasterEvent(hazardousEventId1, TEST_TENANT_CONTEXT_COD)

		// Create disaster record for tenant 1
		const disasterRecord1 = testDisasterRecordFields(5)
		disasterRecord1.disasterEventId = disasterEventId1

		const result1 = await disasterRecordsCreate(dr, disasterRecord1 as DisasterRecordsFields, TEST_TENANT_CONTEXT_COD)
		assert.strictEqual(result1.ok, true, 'Disaster record creation for tenant 1 should succeed')
		const recordId = result1.id

		// Update the disaster record as tenant 1
		const updateFields = {
			primaryDataSource: 'Updated Primary Data Source',
			disasterEventId: disasterEventId1
		}

		const updateResult1 = await disasterRecordsUpdate(dr, recordId, updateFields, TEST_TENANT_CONTEXT_COD)
		assert.strictEqual(updateResult1.ok, true, 'Tenant 1 should be able to update their own disaster record')

		// Try to update the disaster record as tenant 2
		const updateResult2 = await disasterRecordsUpdate(dr, recordId, updateFields, TEST_TENANT_CONTEXT_YEM)
		assert.strictEqual(updateResult2.ok, false, 'Tenant 2 should not be able to update tenant 1\'s disaster record')
	})

	// Test case for deleting disaster records with tenant isolation
	it('should enforce tenant isolation when deleting disaster records', async () => {
		// Create hazardous event for tenant 1
		const hazardousEventId1 = await createTestHazardousEvent(TEST_TENANT_CONTEXT_COD)

		// Create disaster event for tenant 1
		const disasterEventId1 = await createTestDisasterEvent(hazardousEventId1, TEST_TENANT_CONTEXT_COD)

		// Create disaster record for tenant 1
		const disasterRecord1 = testDisasterRecordFields(6)
		disasterRecord1.disasterEventId = disasterEventId1

		const result1 = await disasterRecordsCreate(dr, disasterRecord1 as DisasterRecordsFields, TEST_TENANT_CONTEXT_COD)
		assert.strictEqual(result1.ok, true, 'Disaster record creation for tenant 1 should succeed')
		const recordId = result1.id

		// Try to delete the disaster record as tenant 2
		const deleteResult1 = await disasterRecordsDeleteById(recordId, TEST_TENANT_CONTEXT_YEM)
		assert.strictEqual(deleteResult1.ok, false, 'Tenant 2 should not be able to delete tenant 1\'s disaster record')

		// Delete the disaster record as tenant 1
		const deleteResult2 = await disasterRecordsDeleteById(recordId, TEST_TENANT_CONTEXT_COD)
		assert.strictEqual(deleteResult2.ok, true, 'Tenant 1 should be able to delete their own disaster record')

		// Verify the disaster record is deleted
		const disasterRecord1Access = await testDisasterRecordById(recordId, TEST_TENANT_CONTEXT_COD)
		assert.strictEqual(disasterRecord1Access, null, 'Disaster record should be deleted')
	})
})
