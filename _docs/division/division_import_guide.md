# Division Import System Documentation

## For Developers

### Database Schema Overview

The `division` table is designed to store hierarchical geographic divisions with spatial data support:

```sql
Table: division
- id: UUID Primary Key
- importId: Text (Unique within tenant) - External identifier from import
- nationalId: Text - National identifier (optional)
- parentId: UUID (Foreign Key) - Self-referencing parent relationship
- name: JSONB - Localized names in multiple languages
- geojson: JSONB - Original GeoJSON data
- level: Integer - Hierarchy level (parent level + 1, or 1 for roots)
- geom: PostGIS Geometry - Spatial geometry (SRID: 4326)
- bbox: PostGIS Geometry - Bounding box
- spatial_index: Text - Spatial indexing field
- countryAccountsId: UUID (Foreign Key) - Reference to country_accounts table for tenant isolation
```

Key Features:
- PostGIS integration with GIST indexes for spatial queries
- Automatic geometry validation via triggers
- Hierarchical structure with self-referencing relationships
- Multi-language support via JSONB
- National ID support for external system integration
- Multi-tenancy support with tenant isolation
- Robust validation for duplicate prevention and hierarchy integrity

### Import Process Implementation

The import system is implemented in `division.ts` and consists of several key components:

1. **ZIP File Processing** (`importZip` function):
```typescript
async function importZip(zipBytes: Uint8Array, countryAccountsId: string): Promise<ImportRes>
```
- Accepts ZIP file as byte array and country accounts ID for tenant isolation
- Extracts and validates CSV and GeoJSON files
- Enforces tenant isolation during import
- Returns detailed import results with counts of imported and failed records
- Provides specific error messages for each failed record

2. **Two-Phase Import**:
- Phase 1: Process root divisions (no parent)
- Phase 2: Process child divisions (with parent references)
- Uses transaction management for data integrity

3. **GeoJSON Handling**:
```typescript
async function processGeoJSON(tx: Tx, divisionId: string, geoJsonContent: string): Promise<void>
```
- Validates GeoJSON format and structure
- Converts GeoJSON to PostGIS geometry
- Updates spatial indexes and bounding boxes
- Case-insensitive filename matching with flexible directory structure
- Supports both individual geometries and FeatureCollections
- Extracts properties from GeoJSON when available

4. **Validation Logic**:
```typescript
async function validateDivisionData(tx: Tx, data: DivisionInsert, countryAccountsId: string, existingId?: string)
```
- Validates parent-child relationships
- Prevents duplicate divisions within the same tenant
- Detects and prevents circular references
- Ensures proper level calculation based on parent's level
- Validates importId and nationalId uniqueness within tenant context
- Returns detailed validation errors with specific messages
- Supports both creation and update validation scenarios

5. **Transaction Management**:
```typescript
await dr.transaction(async (tx) => {
  // Process divisions within transaction for atomicity
});
```
- Atomic operations ensure data consistency
- Rollback on failure prevents partial imports
- Error tracking with detailed messages
- Tenant isolation enforced throughout transaction

### Key Functions

1. `importZip(zipBytes, countryAccountsId)`: Main entry point for ZIP file imports
2. `parseCSV(csvContent)`: Parses and validates CSV content
3. `importDivision(tx, division, countryAccountsId)`: Processes individual division records
4. `processGeoJSON(tx, divisionId, geoJsonContent)`: Handles GeoJSON validation and storage
5. `updateSpatialIndexes(tx)`: Updates PostGIS spatial indexes
6. `validateDivisionData(tx, data, countryAccountsId, existingId)`: Validates division data
7. `checkCircularReference(tx, divisionId, parentId, countryAccountsId)`: Prevents circular references
8. `divisionById(id, countryAccountsId)`, `divisionByImportId(importId, countryAccountsId)`: Retrieval functions
9. `divisionChildren(languages, parentId, countryAccountsId)`: Gets direct children of a division
10. `divisionBreadcrumb(languages, id, countryAccountsId)`: Generates hierarchical breadcrumb path
11. `divisionsIntersectingGeoJSON(geoJSON, countryAccountsId)`: Finds divisions intersecting with a GeoJSON
12. `divisionsInBBox(bbox, countryAccountsId)`: Finds divisions within a bounding box

### Error Handling

The system includes comprehensive error handling with custom error classes:

- `UserError`: Base class for user-facing errors with clear messages
- `ImportError`: Specific import-related errors with record context
- `ValidationError`: Data validation failures with field-specific details
- `SystemError`: Internal system errors with technical details
- `HierarchyError`: Parent-child relationship errors
- `TenantError`: Tenant isolation related errors

Error handling covers:
- CSV validation (required columns, format)
- GeoJSON validation (format, coordinates)
- Parent-child relationship validation
- Database constraints and uniqueness
- Spatial data validation and geometry checks
- Tenant isolation enforcement
- Duplicate detection within tenant context
- Circular reference prevention

## For Users

### ZIP File Structure Requirements

Your ZIP file should contain:

1. **CSV File** (required):
   ```csv
   id,parent,nationalId,geodata,en,fr,es
   1001,,NAT001,Region1.geojson,Region One,Région Un,Región Uno
   1002,1001,NAT002,SubRegion1.geojson,Sub Region One,Sous-région Un,Subregión Uno
   ```
   - Must include columns: `id`, `parent`, `geodata`, and at least one language column
   - `id`: Unique identifier for each division (used as `importId` in database)
     - Must be unique within your tenant/country account
     - Used to establish parent-child relationships
   - `parent`: ID of parent division (empty for top-level divisions)
     - Must reference another division's `id` in the same file
     - Leave empty for root/top-level divisions
   - `nationalId`: Optional national identifier (can be empty)
     - Should be unique if provided
     - Used for integration with external systems
   - `geodata`: Name of the corresponding GeoJSON file
     - Case-insensitive matching is supported
     - Can include subdirectory paths
   - Language columns (e.g., `en`, `fr`, `es`): Names in different languages
     - At least one language column is required
     - Column names should match ISO language codes

2. **GeoJSON Files** (required):
   - Must be valid GeoJSON format with proper geometry
   - File names must match the `geodata` column values in the CSV
   - Can be in any subdirectory within the ZIP (system will find them)
   - Supports both individual geometry objects and FeatureCollections
   - Must use WGS84 coordinate system (EPSG:4326)
   - Example structure:
     ```
     divisions.zip
     ├── divisions.csv
     └── geodata/
         ├── Region1.geojson
         └── SubRegion1.geojson
     ```
   - Alternative structure with bundled GeoJSON is also supported:
     ```
     divisions.zip
     ├── divisions.csv
     └── level1.geojson  # FeatureCollection with multiple features
     ```

### Import Process

1. Navigate to: Settings > Geography > Upload (`/settings/geography/upload`)
2. Click "Choose File" and select your ZIP file
3. Click "Upload and Import" to start the import process
4. The system will process the file and display results
5. Review any error messages for failed imports
6. Navigate back to the Geography list to view imported divisions

### Import Results

After upload, you'll see one of these messages:

1. Success:
   ```
   Successfully imported 53 records
   ```
   Or with partial success:
   ```
   Successfully imported 50 records (3 records failed)
   ```

2. Error messages for common issues:
   - "No CSV file found in ZIP"
   - "Missing required columns: [column names]"
   - "GeoJSON file not found: [filename]"
   - "Invalid GeoJSON format"
   - "Parent division not found: [id]"
   - "Duplicate import ID: [id] within tenant"
   - "Circular reference detected"
   - "Invalid level: child level must be greater than parent level"
   - "Invalid geometry: [specific error]"
   - "Division with this nationalId already exists"

### Managing Divisions

After import, you can:

1. **View Divisions**:
   - Navigate to Settings > Geography (`/settings/geography`)
   - Use tree or table view to browse the hierarchy
   - Filter by language using the language checkboxes
   - Navigate through pagination controls

2. **View Division Details**:
   - Click on a division name to view details
   - See multilingual names, parent relationship, and GeoJSON map
   - Access edit functionality

3. **Edit Divisions**:
   - Click "Edit" on a division details page
   - Modify names in different languages
   - Update parent relationship
   - Save changes

4. **Export Divisions**:
   - Use the CSV export functionality to download division data
   - Exported data can be modified and re-imported

### Best Practices

1. **CSV File**:
   - Use UTF-8 encoding to support multilingual content
   - Include all required columns
   - Ensure parent IDs exist in the same file
   - Order matters: list parent divisions before their children
   - Provide names in all required languages

2. **GeoJSON Files**:
   - Use valid GeoJSON format (validate with tools like geojsonlint.com)
   - Keep file names consistent with CSV geodata column
   - Use WGS84 coordinates (EPSG:4326)
   - Simplify complex geometries if possible for better performance
   - Consider using bundled FeatureCollections for efficiency
   - Ensure proper topology (no self-intersections or invalid geometries)
   - Include properties in GeoJSON that match CSV data when possible

3. **General**:
   - Test with small datasets first
   - Verify parent-child relationships before import
   - Include translations for all required languages
   - Back up existing data before large imports
   - Check import results for any failures
