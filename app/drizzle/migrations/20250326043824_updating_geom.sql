-- Custom SQL migration file, put your code below! ---- Check and add 'geom' column if it does not exist, or recreate with data preservation if it already exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='division' AND column_name='geom') THEN
        ALTER TABLE "division" 
        ADD COLUMN "geom" geometry(GEOMETRY, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakeValid(ST_GeomFromGeoJSON(geojson::text)), 4326)) STORED;
    ELSE
        -- Rename the existing geom column to preserve data
        ALTER TABLE "division" 
        RENAME COLUMN "geom" TO "geom_old";
        -- Add the new generated geom column
        ALTER TABLE "division" 
        ADD COLUMN "geom" geometry(GEOMETRY, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakeValid(ST_GeomFromGeoJSON(geojson::text)), 4326)) STORED;
        -- Drop the old column after successful migration
        ALTER TABLE "division" 
        DROP COLUMN "geom_old";
    END IF;
END$$;

-- Check and add 'bbox' column if it does not exist, or recreate with data preservation if it already exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='division' AND column_name='bbox') THEN
        ALTER TABLE "division"
        ADD COLUMN "bbox" geometry(GEOMETRY, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_Envelope(ST_SetSRID(ST_MakeValid(ST_GeomFromGeoJSON(geojson::text)), 4326)), 4326)) STORED;
    ELSE
        -- Rename the existing bbox column to preserve data
        ALTER TABLE "division" 
        RENAME COLUMN "bbox" TO "bbox_old";
        -- Add the new generated bbox column
        ALTER TABLE "division"
        ADD COLUMN "bbox" geometry(GEOMETRY, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_Envelope(ST_SetSRID(ST_MakeValid(ST_GeomFromGeoJSON(geojson::text)), 4326)), 4326)) STORED;
        -- Drop the old column after successful migration
        ALTER TABLE "division" 
        DROP COLUMN "bbox_old";
    END IF;
END$$;

-- Check and add 'spatial_index' column if it does not exist, or recreate with data preservation if it already exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='division' AND column_name='spatial_index') THEN
        ALTER TABLE "division" 
        ADD COLUMN "spatial_index" TEXT GENERATED ALWAYS AS (
            CASE 
                WHEN parent_id IS NULL THEN 'L1-' || id::TEXT
                ELSE 'L' || level::TEXT || '-' || parent_id::TEXT || '-' || id::TEXT
            END
        ) STORED;
    ELSE
        -- Rename the existing spatial_index column to preserve data
        ALTER TABLE "division" 
        RENAME COLUMN "spatial_index" TO "spatial_index_old";
        -- Add the new generated spatial_index column
        ALTER TABLE "division" 
        ADD COLUMN "spatial_index" TEXT GENERATED ALWAYS AS (
            CASE 
                WHEN parent_id IS NULL THEN 'L1-' || id::TEXT
                ELSE 'L' || level::TEXT || '-' || parent_id::TEXT || '-' || id::TEXT
            END
        ) STORED;
        -- Drop the old column after successful migration
        ALTER TABLE "division" 
        DROP COLUMN "spatial_index_old";
    END IF;
END$$;

-- Create or recreate indexes if they do not exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'division' AND indexname = 'division_geom_idx') THEN
        CREATE INDEX "division_geom_idx" ON "division" USING GIST (geom);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'division' AND indexname = 'division_bbox_idx') THEN
        CREATE INDEX "division_bbox_idx" ON "division" USING GIST (bbox);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'division' AND indexname = 'division_level_idx') THEN
        CREATE INDEX "division_level_idx" ON "division" (level);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'division' AND indexname = 'parent_idx') THEN
        CREATE INDEX "parent_idx" ON "division" (parent_id);
    END IF;
END$$;

-- Add or validate the constraint if it does not exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE table_name = 'division' AND constraint_name = 'valid_geom_check') THEN
        ALTER TABLE "division" 
        ADD CONSTRAINT "valid_geom_check" CHECK (ST_IsValid(geom));
    END IF;
END$$;

