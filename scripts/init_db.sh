#!/bin/bash

# Prompt user for database name and username
read -p "Enter the database name: " db_name
read -p "Enter database username: " PGUSERNAME

echo "Creating database $db_name..."
if createdb -U "$PGUSERNAME" "$db_name"; then
  echo "Database $db_name created successfully."
  echo "Restoring schema into $db_name..."

  if psql -U "$PGUSERNAME" -d "$db_name" -f dts_database/dts_db_schema.sql &&
     psql -U "$PGUSERNAME" -d "$db_name" -f dts_database/20250629032135_populating_countries_table_data.sql &&
     psql -U "$PGUSERNAME" -d "$db_name" -f dts_database/20250630074515_update_countries_table_to_add_iso3.sql &&
     psql -U "$PGUSERNAME" -d "$db_name" -f dts_database/20250811095649_update_countries_table_add_flag_url_data.sql &&
     psql -U "$PGUSERNAME" -d "$db_name" -f dts_database/20250813075915_populate_category_asset_and_sector_data.sql &&
     psql -U "$PGUSERNAME" -d "$db_name" -f dts_database/20250814092113_populate_hips_data_into_db.sql &&
     psql -U "$PGUSERNAME" -d "$db_name" -f dts_database/20250908093239_init_dts_system_info.sql
  then
    echo "Schema restored successfully."
  else
    echo "Failed to restore schema."
  fi
else
  echo "Failed to create database $db_name."
fi
