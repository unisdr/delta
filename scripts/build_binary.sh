#!/bin/bash
set -e

# Total number of steps
TOTAL_STEPS=9

# Initialize step counter
STEP=0

# Function to print step progress
next_step() {
  STEP=$((STEP+1))
  echo "=== Step $STEP/$TOTAL_STEPS. $1 ==="
}

# Step 1: Create folder dts_shared_binary
next_step "Creating folder dts_shared_binary"
mkdir -p dts_shared_binary

# Step 2: Create folder dts_database inside dts_shared_binary
next_step "Creating folder dts_database inside dts_shared_binary"
mkdir -p dts_shared_binary/dts_database

# Step 3: Build Remix App
next_step "Build Remix App"
if ! yarn build; then
  echo "WARNING: yarn build failed, continuing anyway..."
fi

# Step 4: Copy build folder into dts_shared_binary
next_step "Copying build folder into dts_shared_binary"
cp -r build dts_shared_binary/

# Step 5: Copy package.json into dts_shared_binary
next_step "Copying package.json into dts_shared_binary"
cp -f package.json dts_shared_binary/package.json

# Step 6: Copy example.env into dts_shared_binary as .env
next_step "Copying example.env into dts_shared_binary as .env"
cp -f example.env dts_shared_binary/.env

# Step 7: Copy dts_db_schema.sql schema into dts_database
next_step "Copying dts_db_schema.sql schema into dts_database"
cp -f scripts/dts_db_schema.sql dts_shared_binary/dts_database/dts_db_schema.sql

# Step 8: Adding data initialization commands into dts_db_schema.sql
next_step "Adding data initialization commands into dts_db_schema.sql"
echo "" >> dts_shared_binary/dts_database/dts_db_schema.sql
cat app/drizzle/migrations/20250629032135_populating_countries_table_data.sql >> dts_shared_binary/dts_database/dts_db_schema.sql
echo "" >> dts_shared_binary/dts_database/dts_db_schema.sql
cat app/drizzle/migrations/20250630074515_update_countries_table_to_add_iso3.sql >> dts_shared_binary/dts_database/dts_db_schema.sql
echo "" >> dts_shared_binary/dts_database/dts_db_schema.sql
cat app/drizzle/migrations/20250811095649_update_countries_table_add_flag_url_data.sql >> dts_shared_binary/dts_database/dts_db_schema.sql
echo "" >> dts_shared_binary/dts_database/dts_db_schema.sql
cat app/drizzle/migrations/20250813075915_populate_category_asset_and_sector_data.sql >> dts_shared_binary/dts_database/dts_db_schema.sql
echo "" >> dts_shared_binary/dts_database/dts_db_schema.sql
cat app/drizzle/migrations/20250814092113_populate_hips_data_into_db.sql >> dts_shared_binary/dts_database/dts_db_schema.sql
echo "" >> dts_shared_binary/dts_database/dts_db_schema.sql
cat app/drizzle/migrations/20250908093239_init_dts_system_info.sql >> dts_shared_binary/dts_database/dts_db_schema.sql
echo "" >> dts_shared_binary/dts_database/dts_db_schema.sql
cat app/drizzle/migrations/20250909065957_populate_initial_super_admin_user.sql >> dts_shared_binary/dts_database/dts_db_schema.sql


# Step 9: Copy shell and batch scripts into dts_shared_binary
next_step "Copying shell scripts into dts_shared_binary"
cp -f scripts/init_db.bat dts_shared_binary/init_db.bat
cp -f scripts/init_db.sh dts_shared_binary/init_db.sh
cp -f scripts/init_website.bat dts_shared_binary/init_website.bat
cp -f scripts/init_website.sh dts_shared_binary/init_website.sh
cp -f scripts/start.bat dts_shared_binary/start.bat
cp -f scripts/start.bat dts_shared_binary/start.sh

echo "=== Done ==="