#!/bin/bash

# Prompt user for database name and username
read -p "Enter the database name: " db_name
read -p "Enter database username: " PGUSERNAME

echo "Creating database $db_name..."
if createdb -U "$PGUSERNAME" "$db_name"; then
  echo "Database $db_name created successfully."
  echo "Restoring schema into $db_name..."

  if psql -U "$PGUSERNAME" -d "$db_name" -f dts_database/dts_db_schema.sql
  then
    echo "Schema restored successfully."
  else
    echo "Failed to restore schema."
  fi
else
  echo "Failed to create database $db_name."
fi
