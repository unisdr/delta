// Load environment variables for tests
import 'dotenv/config'

import {describe, it} from 'node:test'
import assert from 'node:assert/strict'
import {dr, initDB} from '~/db.server'
import {sql} from 'drizzle-orm'

import {
    countries,
    countryAccounts
} from '~/drizzle/schema'

// Initialize database connection before tests run
initDB()

// Test UUIDs for consistent testing - using real country data for disaster relief scenarios
const TEST_COUNTRY_ID_DRC = '123e4567-e89b-12d3-a456-426614174001' // Democratic Republic of the Congo
const TEST_COUNTRY_ID_YEM = '123e4567-e89b-12d3-a456-426614174002' // Yemen
const TEST_COUNTRY_ID_PHL = '123e4567-e89b-12d3-a456-426614174003' // Philippines

const TEST_COUNTRY_ACCOUNT_ID_DRC = '123e4567-e89b-12d3-a456-426614174011'
const TEST_COUNTRY_ACCOUNT_ID_YEM = '123e4567-e89b-12d3-a456-426614174012'
const TEST_COUNTRY_ACCOUNT_ID_PHL = '123e4567-e89b-12d3-a456-426614174013'

// Clean up test data before tests
async function cleanupTestData() {
    // Truncate tables in the correct order to respect foreign key constraints
    await dr.execute(sql`TRUNCATE ${countryAccounts} CASCADE`)
    await dr.execute(sql`TRUNCATE ${countries} CASCADE`)
}

// Create test data for countries and country accounts
async function createTestCountries() {
    await cleanupTestData()
    
    // Insert test countries - using real country data for disaster relief scenarios
    await dr
        .insert(countries)
        .values([
            { 
                id: TEST_COUNTRY_ID_DRC,
                name: 'Democratic Republic of the Congo',
                iso3: 'COD'
            },
            {
                id: TEST_COUNTRY_ID_YEM,
                name: 'Yemen',
                iso3: 'YEM'
            },
            {
                id: TEST_COUNTRY_ID_PHL,
                name: 'Philippines',
                iso3: 'PHL'
            }
        ])
        .onConflictDoNothing()
}

// Create test data for country accounts
async function createTestCountryAccounts() {
    // Make sure countries exist first
    await createTestCountries()
    
    // Insert test country accounts for disaster relief scenarios
    await dr
        .insert(countryAccounts)
        .values([
            {
                id: TEST_COUNTRY_ACCOUNT_ID_DRC,
                countryId: TEST_COUNTRY_ID_DRC,
                status: 1
            },
            {
                id: TEST_COUNTRY_ACCOUNT_ID_YEM,
                countryId: TEST_COUNTRY_ID_YEM,
                status: 1
            },
            {
                id: TEST_COUNTRY_ACCOUNT_ID_PHL,
                countryId: TEST_COUNTRY_ID_PHL,
                status: 1
            }
        ])
        .onConflictDoNothing()
}

describe('countries', () => {
    // Test creating countries
    it('create countries', async () => {
        await cleanupTestData()
        
        await createTestCountries()
        
        // Verify countries were created
        const result = await dr.select().from(countries)
        assert.equal(result.length, 3, 'Should have created 3 countries')
        
        const drc = result.find(c => c.id === TEST_COUNTRY_ID_DRC)
        assert(drc, 'DRC should exist')
        assert.equal(drc.name, 'Democratic Republic of the Congo')
        assert.equal(drc.iso3, 'COD')
        
        const yemen = result.find(c => c.id === TEST_COUNTRY_ID_YEM)
        assert(yemen, 'Yemen should exist')
        assert.equal(yemen.name, 'Yemen')
        assert.equal(yemen.iso3, 'YEM')
        
        const philippines = result.find(c => c.id === TEST_COUNTRY_ID_PHL)
        assert(philippines, 'Philippines should exist')
        assert.equal(philippines.name, 'Philippines')
        assert.equal(philippines.iso3, 'PHL')
    })
    
    // Test creating country accounts
    it('create country accounts', async () => {
        await cleanupTestData()
        
        await createTestCountryAccounts()
        
        // Verify country accounts were created
        const result = await dr.select().from(countryAccounts)
        assert.equal(result.length, 3, 'Should have created 3 country accounts')
        
        const drcAccount = result.find(a => a.id === TEST_COUNTRY_ACCOUNT_ID_DRC)
        assert(drcAccount, 'DRC Country Account should exist')
        assert.equal(drcAccount.countryId, TEST_COUNTRY_ID_DRC)
        
        const yemenAccount = result.find(a => a.id === TEST_COUNTRY_ACCOUNT_ID_YEM)
        assert(yemenAccount, 'Yemen Country Account should exist')
        assert.equal(yemenAccount.countryId, TEST_COUNTRY_ID_YEM)
        
        const philippinesAccount = result.find(a => a.id === TEST_COUNTRY_ACCOUNT_ID_PHL)
        assert(philippinesAccount, 'Philippines Country Account should exist')
        assert.equal(philippinesAccount.countryId, TEST_COUNTRY_ID_PHL)
    })
})

// Export test data creation functions for use in other tests
export {
    TEST_COUNTRY_ID_DRC,
    TEST_COUNTRY_ID_YEM,
    TEST_COUNTRY_ID_PHL,
    TEST_COUNTRY_ACCOUNT_ID_DRC,
    TEST_COUNTRY_ACCOUNT_ID_YEM,
    TEST_COUNTRY_ACCOUNT_ID_PHL,
    createTestCountries,
    createTestCountryAccounts,
    cleanupTestData
}
