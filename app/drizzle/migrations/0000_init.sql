-- Ensure PostGIS extension exists
CREATE EXTENSION IF NOT EXISTS postgis;

-- Drop and recreate division table with new schema
DROP TABLE IF EXISTS "division" CASCADE;

CREATE TABLE "division" (
    "id" SERIAL PRIMARY KEY,
    "import_id" TEXT UNIQUE,
    "parent_id" BIGINT REFERENCES "division"("id"),
    "name" JSONB NOT NULL DEFAULT '{}',
    "geojson" JSONB,
    "level" BIGINT,
    
    -- Automatically convert `geojson` to a `geometry` column for faster spatial queries
    "geom" geometry(GEOMETRY, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakeValid(ST_GeomFromGeoJSON(geojson::text)), 4326)) STORED,
    
    -- Add bounding box for faster overlap queries
    "bbox" geometry(GEOMETRY, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_Envelope(ST_SetSRID(ST_MakeValid(ST_GeomFromGeoJSON(geojson::text)), 4326)), 4326)) STORED,
    
    -- Auto-generate spatial index
    "spatial_index" TEXT GENERATED ALWAYS AS (
        CASE 
            WHEN parent_id IS NULL THEN 'L1-' || id::TEXT
            ELSE 'L' || level::TEXT || '-' || parent_id::TEXT || '-' || id::TEXT
        END
    ) STORED
);

-- Create spatial indexes
CREATE INDEX "division_geom_idx" ON "division" USING GIST (geom);
CREATE INDEX "division_bbox_idx" ON "division" USING GIST (bbox);
CREATE INDEX "division_level_idx" ON "division" (level);
CREATE INDEX "parent_idx" ON "division" (parent_id);

-- Add geometry validation check
ALTER TABLE "division" 
    ADD CONSTRAINT "valid_geom_check" CHECK (ST_IsValid(geom));
	