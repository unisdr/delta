# Division Import System Documentation

## For Developers

### Database Schema Overview

The `division` table is designed to store hierarchical geographic divisions with spatial data support:

```sql
Table: division
- id: Serial Primary Key
- importId: Text (Unique) - External identifier from import
- parentId: Bigint (Foreign Key) - Self-referencing parent relationship
- name: JSONB - Localized names in multiple languages
- geojson: JSONB - Original GeoJSON data
- level: Bigint - Hierarchy level (parent level + 1, or 1 for roots)
- geom: PostGIS Geometry - Spatial geometry (SRID: 4326)
- bbox: PostGIS Geometry - Bounding box
- spatial_index: Text - Spatial indexing field
```

Key Features:
- PostGIS integration with GIST indexes for spatial queries
- Automatic geometry validation via triggers
- Hierarchical structure with self-referencing relationships
- Multi-language support via JSONB

### Import Process Implementation

The import system is implemented in `division.ts` and consists of several key components:

1. **ZIP File Processing** (`importZip` function):
```typescript
async function importZip(zipBytes: Uint8Array): Promise<ImportRes>
```
- Accepts ZIP file as byte array
- Extracts and validates CSV and GeoJSON files
- Returns detailed import results

2. **Two-Phase Import**:
- Phase 1: Process root divisions (no parent)
- Phase 2: Process child divisions
- Uses batch processing for efficiency

3. **GeoJSON Handling**:
```typescript
const geoJsonFiles = new Map<string, string>();
// Maps normalized filenames to actual paths in ZIP
```
- Case-insensitive filename matching
- Flexible directory structure support
- Validates GeoJSON format

4. **Transaction Management**:
```typescript
await dr.transaction(async (tx) => {
  const result = await importDivision(tx, divisions, divisionId, idMap);
});
```
- Atomic operations
- Rollback on failure
- Proper error handling

### Key Functions

1. `importZip(zipBytes)`: Main entry point for ZIP imports
2. `importDivision(tx, divisions, divisionId, idMap)`: Processes individual divisions
3. `processGeoJSON(tx, divisionId, geoJsonContent)`: Handles GeoJSON validation and storage
4. `updateSpatialIndexes(tx)`: Updates PostGIS indexes

### Error Handling

The system includes comprehensive error handling:
- CSV validation (required columns, format)
- GeoJSON validation (format, coordinates)
- Parent-child relationship validation
- Database constraints
- Spatial data validation

## For Users

### ZIP File Structure Requirements

Your ZIP file should contain:

1. **CSV File** (required):
   ```csv
   id,parent,geodata,en,ar
   1001,,Region1.geojson,Region One,المنطقة الأولى
   1002,1001,SubRegion1.geojson,Sub Region One,المنطقة الفرعية الأولى
   ```
   - Must include columns: `id`, `parent`, `geodata`, and at least one language
   - `id`: Unique identifier for each division
   - `parent`: ID of parent division (empty for top-level)
   - `geodata`: Name of the GeoJSON file
   - Language columns (e.g., `en`, `ar`): Names in different languages

2. **GeoJSON Files** (required):
   - Must be valid GeoJSON format
   - File names must match the `geodata` column in CSV
   - Can be in any subdirectory within the ZIP
   - Example structure:
     ```
     divisions.zip
     ├── divisions.csv
     └── geodata/
         ├── Region1.geojson
         └── SubRegion1.geojson
     ```

### Import Process

1. Navigate to: `http://localhost:3000/settings/geography/upload`
2. Click "Choose File" and select your ZIP file
3. Click "Submit" to start the import

### Import Results

After upload, you'll see one of these messages:

1. Success:
   ```
   Successfully imported 53 records
   ```
   Or with failures:
   ```
   Successfully imported 50 records (3 records failed)
   ```

2. Error messages for common issues:
   - "No CSV file found in ZIP"
   - "Missing required columns: [column names]"
   - "GeoJSON file not found: [filename]"
   - "Invalid GeoJSON format"

### Best Practices

1. **CSV File**:
   - Use UTF-8 encoding
   - Include all required columns
   - Ensure parent IDs exist in the same file
   - Order matters: list parent divisions before their children

2. **GeoJSON Files**:
   - Use valid GeoJSON format
   - Keep file names consistent with CSV
   - Use WGS84 coordinates (EPSG:4326)

3. **General**:
   - Test with small datasets first
   - Verify parent-child relationships
   - Include translations for all required languages
   - Back up existing data before large imports
