-- Migration: Add composite unique constraints for api_import_id + country_accounts_id
-- This addresses GitHub issues #261 and #275 for tenant-scoped api_import_id uniqueness

-- Step 1: Drop existing global unique constraints on api_import_id
-- These constraints prevent the same api_import_id from being used across different tenants

DROP INDEX IF EXISTS "hazardous_event_apiImportId_unique";
DROP INDEX IF EXISTS "disaster_event_apiImportId_unique";  
DROP INDEX IF EXISTS "disaster_records_apiImportId_unique";
DROP INDEX IF EXISTS "asset_apiImportId_unique";
DROP INDEX IF EXISTS "dev_example1_apiImportId_unique";
DROP INDEX IF EXISTS "damages_apiImportId_unique";
DROP INDEX IF EXISTS "losses_apiImportId_unique";
DROP INDEX IF EXISTS "disruption_apiImportId_unique";
DROP INDEX IF EXISTS "noneco_losses_apiImportId_unique";
DROP INDEX IF EXISTS "sector_disaster_records_relation_apiImportId_unique";

-- Step 2: Create composite unique constraints for parent tables
-- These allow the same api_import_id across different tenants but enforce uniqueness within a tenant

-- Hazardous Event Table
CREATE UNIQUE INDEX "hazardous_event_api_import_id_tenant_unique" 
ON "hazardous_event" ("api_import_id", "country_accounts_id")
WHERE "api_import_id" IS NOT NULL AND "country_accounts_id" IS NOT NULL;

-- Disaster Event Table  
CREATE UNIQUE INDEX "disaster_event_api_import_id_tenant_unique"
ON "disaster_event" ("api_import_id", "country_accounts_id")
WHERE "api_import_id" IS NOT NULL AND "country_accounts_id" IS NOT NULL;

-- Disaster Records Table
CREATE UNIQUE INDEX "disaster_records_api_import_id_tenant_unique"
ON "disaster_records" ("api_import_id", "country_accounts_id") 
WHERE "api_import_id" IS NOT NULL AND "country_accounts_id" IS NOT NULL;

-- Asset Table
CREATE UNIQUE INDEX "asset_api_import_id_tenant_unique"
ON "asset" ("api_import_id", "country_accounts_id")
WHERE "api_import_id" IS NOT NULL AND "country_accounts_id" IS NOT NULL;

-- Dev Example Table
CREATE UNIQUE INDEX "dev_example1_api_import_id_tenant_unique"
ON "dev_example1" ("api_import_id", "country_accounts_id")
WHERE "api_import_id" IS NOT NULL AND "country_accounts_id" IS NOT NULL;

-- Step 3: Child tables inherit tenant context from parent, no composite constraints needed
-- damages, losses, disruption, noneco_losses, sector_disaster_records_relation
-- These tables get tenant context through their recordId/disasterRecordId foreign key

-- Note: The WHERE clauses ensure partial indexes that only apply when both fields are not null
-- This maintains backward compatibility while enabling tenant-scoped uniqueness
-- Removed CONCURRENTLY to allow running within transaction blocks during migrations
