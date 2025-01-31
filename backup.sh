#!/bin/bash

# Define database credentials
DB_NAME="dts_development"
DB_USER="postgres"
DB_HOST="localhost"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"

# Ensure backups directory exists
mkdir -p "$BACKUP_DIR"

# Create database backup
echo "Creating backup at $BACKUP_FILE..."
pg_dump -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -F c -f "$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "✅ Backup successful: $BACKUP_FILE"
else
    echo "❌ Backup failed. Exiting..."
    exit 1
fi

# Run Drizzle migrations safely
echo "Applying Drizzle migrations..."
yarn run drizzle-kit push

echo "✅ Database migration complete!"
