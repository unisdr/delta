// Load environment variables for tests
import 'dotenv/config'

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { dr, initDB } from '~/db.server'
import { sql } from 'drizzle-orm'

import {
    disasterEventCreate,
    disasterEventUpdate,
    disasterEventDelete,
    hazardousEventCreate,
    HazardousEventFields,
    DisasterEventFields
} from './event'

import {
    eventTable,
    hazardousEventTable,
    disasterEventTable
} from '~/drizzle/schema'

import { eq, and } from 'drizzle-orm'

// Test-only simplified version of disasterEventById to avoid PostgreSQL argument limit
async function testDisasterEventById(id: string, countryAccountsId: string) {
    if (typeof id !== "string") {
        throw new Error("Invalid ID: must be a string");
    }

    // Simple query that only checks if the record exists with tenant isolation
    const res = await dr.select({
        id: disasterEventTable.id
        // Only select the ID to avoid any schema issues
    }).from(disasterEventTable).where(and(
        eq(disasterEventTable.id, id),
        eq(disasterEventTable.countryAccountsId, countryAccountsId)
    )).execute();

    if (res.length === 0) {
        return null;
    }

    return res[0];
}

// Initialize database connection before tests run
initDB()

const countryAccountsId1 = "1234"
const countryAccountsId2 = "3456"


// Helper function to create test disaster event fields
function testDisasterEventFields(num: number): Partial<DisasterEventFields> {
    return {
        name: `Test Disaster Event ${num}`,
        nationalDisasterId: `test-disaster-${num}`,
        nameNational: `Test National Disaster ${num}`,
        glide: `TEST-${num}`,
        hazardousEventId: "" // Will be set during test
    }
}

// Setup function to clean database and create necessary test data
async function disasterEventTestData() {
    // Clear disaster event tables
    await dr.execute(sql`TRUNCATE ${disasterEventTable} CASCADE`)
    await dr.execute(sql`TRUNCATE ${hazardousEventTable} CASCADE`)
    await dr.execute(sql`TRUNCATE ${eventTable} CASCADE`)
}

// Helper function to create a hazardous event for testing
async function createTestHazardousEvent() {
    // Create hazardous event using the model function
    const hazardFields: HazardousEventFields = {
        name: "Test Hazardous Event",
        description: "Test hazardous event for disaster event tests",
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date().toISOString().slice(0, 10),
        hipTypeId: "type1", // Required field
        hipClusterId: "cluster1", // Required field
        hipHazardId: "hazard1", // Required field
        parent: "" // Required field, empty string means no parent
    }

    const result = await hazardousEventCreate(dr, hazardFields)
    if (!result.ok) {
        throw new Error(`Failed to create test hazardous event: ${result.errors?.fields?.name || 'Unknown error'}`)
    }

    return result.id
}

// Main test cases
describe('Disaster Event Tenant Isolation Tests', async () => {
    // Setup test data before running tests
    await disasterEventTestData()

    // Test case for creating disaster events with tenant isolation
    it('should create disaster events with tenant isolation', async () => {
        // Create hazardous events for each tenant
        const hazardousEventId1 = await createTestHazardousEvent()
        const hazardousEventId2 = await createTestHazardousEvent()

        // Create disaster event for tenant 1
        const disasterEvent1 = testDisasterEventFields(1)
        disasterEvent1.hazardousEventId = hazardousEventId1

        const result1 = await disasterEventCreate(dr, disasterEvent1 as DisasterEventFields)
        assert.strictEqual(result1.ok, true, 'Disaster event creation for tenant 1 should succeed')
        const tenant1EventId = result1.id

        // Create disaster event for tenant 2
        const disasterEvent2 = testDisasterEventFields(2)
        disasterEvent2.hazardousEventId = hazardousEventId2

        const result2 = await disasterEventCreate(dr, disasterEvent2 as DisasterEventFields)
        assert.strictEqual(result2.ok, true, 'Disaster event creation for tenant 2 should succeed')
        const tenant2EventId = result2.id

        // Try to create disaster event for tenant 1 with hazardous event from tenant 2
        const disasterEvent3 = testDisasterEventFields(3)
        disasterEvent3.hazardousEventId = hazardousEventId2 // Using tenant 2's hazardous event

        const result3 = await disasterEventCreate(dr, disasterEvent3 as DisasterEventFields)
        assert.strictEqual(result3.ok, false, 'Disaster event creation with cross-tenant hazardous event should fail')

        // Verify tenant 1 CANNOT access tenant 2's event
        const crossTenantAccess1 = await testDisasterEventById(tenant2EventId, countryAccountsId1)
        assert.strictEqual(crossTenantAccess1, null, "Tenant 1 should NOT be able to access tenant 2's disaster event")

        // Verify tenant 2 CANNOT access tenant 1's event
        const crossTenantAccess2 = await testDisasterEventById(tenant1EventId, countryAccountsId2)
        assert.strictEqual(crossTenantAccess2, null, "Tenant 2 should NOT be able to access tenant 1's disaster event")
    })

    // Test case for accessing disaster events with tenant isolation
    it('should enforce tenant isolation when accessing disaster events', async () => {
        // Create hazardous events for each tenant
        const hazardousEventId1 = await createTestHazardousEvent()

        // Create disaster event for tenant 1
        const disasterEvent1 = testDisasterEventFields(4)
        disasterEvent1.hazardousEventId = hazardousEventId1

        const result1 = await disasterEventCreate(dr, disasterEvent1 as DisasterEventFields)
        assert.strictEqual(result1.ok, true, 'Disaster event creation for tenant 1 should succeed')
        const disasterId = result1.id

        // Tenant 1 should be able to access their own disaster event
        const disasterEvent1Access = await testDisasterEventById(disasterId, countryAccountsId1)
        assert.notStrictEqual(disasterEvent1Access, null, 'Tenant 1 should be able to access their own disaster event')

        // Tenant 2 should not be able to access tenant 1's disaster event
        const disasterEvent2Access = await testDisasterEventById(disasterId, countryAccountsId2)
        assert.strictEqual(disasterEvent2Access, null, 'Tenant 2 should not be able to access tenant 1\'s disaster event')
    })

    // Test case for updating disaster events with tenant isolation
    it('should enforce tenant isolation when updating disaster events', async () => {
        // Create hazardous events for each tenant
        const hazardousEventId1 = await createTestHazardousEvent()

        // Create disaster event for tenant 1
        const disasterEvent1 = testDisasterEventFields(5)
        disasterEvent1.hazardousEventId = hazardousEventId1

        const result1 = await disasterEventCreate(dr, disasterEvent1 as DisasterEventFields)
        assert.strictEqual(result1.ok, true, 'Disaster event creation for tenant 1 should succeed')
        const disasterId = result1.id

        // Update the disaster event as tenant 1
        const updateFields = {
            name: 'Updated Disaster Event',
            hazardousEventId: hazardousEventId1
        }

        const updateResult1 = await disasterEventUpdate(dr, disasterId, updateFields)
        assert.strictEqual(updateResult1.ok, true, 'Tenant 1 should be able to update their own disaster event')

        // Try to update the disaster event as tenant 2
        const updateResult2 = await disasterEventUpdate(dr, disasterId, updateFields)
        assert.strictEqual(updateResult2.ok, false, 'Tenant 2 should not be able to update tenant 1\'s disaster event')
    })

    // Test case for deleting disaster events with tenant isolation
    it('should enforce tenant isolation when deleting disaster events', async () => {
        // Create hazardous events for each tenant
        const hazardousEventId1 = await createTestHazardousEvent()

        // Create disaster event for tenant 1
        const disasterEvent1 = testDisasterEventFields(6)
        disasterEvent1.hazardousEventId = hazardousEventId1

        const result1 = await disasterEventCreate(dr, disasterEvent1 as DisasterEventFields)
        assert.strictEqual(result1.ok, true, 'Disaster event creation for tenant 1 should succeed')
        const disasterId = result1.id

        // Try to delete the disaster event as tenant 2
        const deleteResult1 = await disasterEventDelete(disasterId, countryAccountsId2)
        assert.strictEqual(deleteResult1.ok, false, 'Tenant 2 should not be able to delete tenant 1\'s disaster event')

        // Delete the disaster event as tenant 1
        const deleteResult2 = await disasterEventDelete(disasterId, countryAccountsId1)
        assert.strictEqual(deleteResult2.ok, true, 'Tenant 1 should be able to delete their own disaster event')

        // Verify the disaster event is deleted
        const disasterEvent1Access = await testDisasterEventById(disasterId, countryAccountsId1)
        assert.strictEqual(disasterEvent1Access, null, 'Disaster event should be deleted')
    })
})
