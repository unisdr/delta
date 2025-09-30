/**
 * Test suite for tenant-aware API import ID functionality
 * Addresses GitHub issues #261 and #275
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { dr } from "~/db.server";
import {
	assetTable,
	disasterEventTable,
	hazardousEventTable,
	disasterRecordsTable,
	countryAccounts
} from "~/drizzle/schema";
import { upsertRecord as upsertAsset } from "./asset";
import { eq, and, sql } from "drizzle-orm";

describe("Tenant-aware API Import ID", () => {
	const tenant1Id = "caa0c3c3-f50c-4594-857c-1ef6c90947a5";
	const tenant2Id = "02b76dde-9d91-478c-b979-f7b5c526ce5b";
	const testApiImportId = "TEST_IMPORT_123";

	beforeEach(async () => {
		// Clean up test data
		await dr.delete(assetTable).where(eq(assetTable.apiImportId, testApiImportId));
		await dr.delete(disasterEventTable).where(eq(disasterEventTable.apiImportId, testApiImportId));
		await dr.delete(hazardousEventTable).where(eq(hazardousEventTable.apiImportId, testApiImportId));
		await dr.delete(disasterRecordsTable).where(eq(disasterRecordsTable.apiImportId, testApiImportId));

		// Ensure test tenants exist (need to create countries first)
		const country1Id = "11111111-1111-1111-1111-111111111111";
		const country2Id = "22222222-2222-2222-2222-222222222222";

		await dr.execute(sql`
			INSERT INTO countries (id, name, iso3, flag_url) VALUES 
			(${country1Id}, 'Test Country 1', 'TC1', 'https://example.com/flag1.png'),
			(${country2Id}, 'Test Country 2', 'TC2', 'https://example.com/flag2.png')
			ON CONFLICT (id) DO NOTHING
		`);

		await dr.insert(countryAccounts).values([
			{
				id: tenant1Id,
				shortDescription: "Test Tenant 1",
				countryId: country1Id,
				status: 1, // ACTIVE
				type: "official"
			},
			{
				id: tenant2Id,
				shortDescription: "Test Tenant 2",
				countryId: country2Id,
				status: 1, // ACTIVE
				type: "training"
			}
		]).onConflictDoNothing();
	});

	describe("Cross-tenant scenarios", () => {
		it("should allow same apiImportId across different tenants", async () => {
			// Create asset in tenant 1
			const asset1 = {
				apiImportId: testApiImportId,
				name: "Test Asset Tenant 1",
				sectorIds: "sector1",
				isBuiltIn: false,
				countryAccountsId: tenant1Id,
			};

			// Create asset in tenant 2 with same apiImportId
			const asset2 = {
				apiImportId: testApiImportId,
				name: "Test Asset Tenant 2",
				sectorIds: "sector2",
				isBuiltIn: false,
				countryAccountsId: tenant2Id,
			};

			// Both should succeed without conflict
			await upsertAsset(asset1);
			await upsertAsset(asset2);

			// Verify both records exist
			const tenant1Assets = await dr
				.select()
				.from(assetTable)
				.where(
					and(
						eq(assetTable.apiImportId, testApiImportId),
						eq(assetTable.countryAccountsId, tenant1Id)
					)
				);

			const tenant2Assets = await dr
				.select()
				.from(assetTable)
				.where(
					and(
						eq(assetTable.apiImportId, testApiImportId),
						eq(assetTable.countryAccountsId, tenant2Id)
					)
				);

			assert.equal(tenant1Assets.length, 1);
			assert.equal(tenant2Assets.length, 1);
			assert.equal(tenant1Assets[0].name, "Test Asset Tenant 1");
			assert.equal(tenant2Assets[0].name, "Test Asset Tenant 2");
		});
	});

	describe("Within-tenant scenarios", () => {
		it("should prevent duplicate apiImportId within same tenant", async () => {
			// Create first asset
			const asset1 = {
				apiImportId: testApiImportId,
				name: "Original Asset",
				sectorIds: "sector1",
				isBuiltIn: false,
				countryAccountsId: tenant1Id,
			};

			await upsertAsset(asset1);

			// Try to create another asset with same apiImportId in same tenant
			const asset2 = {
				apiImportId: testApiImportId,
				name: "Updated Asset",
				sectorIds: "sector2",
				isBuiltIn: true,
				countryAccountsId: tenant1Id,
			};

			// This should update the existing record, not create a new one
			await upsertAsset(asset2);

			// Verify only one record exists and it was updated
			const assets = await dr
				.select()
				.from(assetTable)
				.where(
					and(
						eq(assetTable.apiImportId, testApiImportId),
						eq(assetTable.countryAccountsId, tenant1Id)
					)
				);

			assert.equal(assets.length, 1);
			assert.equal(assets[0].name, "Updated Asset");
			assert.equal(assets[0].sectorIds, "sector2");
			assert.equal(assets[0].isBuiltIn, true);
		});

		it("should handle upsert correctly within tenant", async () => {
			const asset = {
				apiImportId: testApiImportId,
				name: "Initial Asset",
				sectorIds: "sector1",
				isBuiltIn: false,
				countryAccountsId: tenant1Id,
			};

			// First upsert - creates record
			await upsertAsset(asset);

			let assets = await dr
				.select()
				.from(assetTable)
				.where(
					and(
						eq(assetTable.apiImportId, testApiImportId),
						eq(assetTable.countryAccountsId, tenant1Id)
					)
				);

			assert.equal(assets.length, 1);
			assert.equal(assets[0].name, "Initial Asset");

			// Second upsert - updates existing record
			asset.name = "Updated Asset";
			asset.sectorIds = "sector2";
			await upsertAsset(asset);

			assets = await dr
				.select()
				.from(assetTable)
				.where(
					and(
						eq(assetTable.apiImportId, testApiImportId),
						eq(assetTable.countryAccountsId, tenant1Id)
					)
				);

			assert.equal(assets.length, 1);
			assert.equal(assets[0].name, "Updated Asset");
			assert.equal(assets[0].sectorIds, "sector2");
		});
	});

	describe("Database constraint verification", () => {
		it("should have composite unique constraints in place", async () => {
			// This test verifies that the database constraints are working
			// by attempting to insert duplicate records directly via SQL

			const testRecord1 = {
				apiImportId: testApiImportId,
				name: "Test Asset 1",
				sectorIds: "sector1",
				isBuiltIn: false,
				countryAccountsId: tenant1Id,
			};

			const testRecord2 = {
				apiImportId: testApiImportId,
				name: "Test Asset 2",
				sectorIds: "sector2",
				isBuiltIn: false,
				countryAccountsId: tenant1Id,
			};

			// Insert first record - should succeed
			await dr.insert(assetTable).values(testRecord1);

			// Try to insert duplicate in same tenant - should fail
			try {
				await dr.insert(assetTable).values(testRecord2);
				assert.fail("Expected constraint violation");
			} catch (error) {
				// Should get constraint violation error
				assert(error instanceof Error);
				assert(error.message.includes("unique") || error.message.includes("duplicate"));
			}

			// Insert same apiImportId in different tenant - should succeed
			const testRecord3 = {
				...testRecord2,
				countryAccountsId: tenant2Id,
			};

			await dr.insert(assetTable).values(testRecord3);

			// Verify we have records in both tenants
			const tenant1Count = await dr
				.select({ count: assetTable.id })
				.from(assetTable)
				.where(
					and(
						eq(assetTable.apiImportId, testApiImportId),
						eq(assetTable.countryAccountsId, tenant1Id)
					)
				);

			const tenant2Count = await dr
				.select({ count: assetTable.id })
				.from(assetTable)
				.where(
					and(
						eq(assetTable.apiImportId, testApiImportId),
						eq(assetTable.countryAccountsId, tenant2Id)
					)
				);

			assert.equal(tenant1Count.length, 1);
			assert.equal(tenant2Count.length, 1);
		});
	});
});
