# Division Model Technical Implementation

## Database Architecture

### Schema Design (`schema.ts`)

```typescript
export const divisionTable = pgTable(
  "division",
  {
    id: ourSerial("id").primaryKey(),
    importId: text("import_id").unique(),
    nationalId: text("national_id"),
    parentId: ourBigint("parent_id").references(() => divisionTable.id),
    name: zeroStrMap("name"),
    geojson: jsonb("geojson"),
    level: ourBigint("level"),
    geom: customType({ dataType: () => "geometry(GEOMETRY, 4326)" })(),
    bbox: customType({ dataType: () => "geometry(GEOMETRY, 4326)" })(),
    spatial_index: text("spatial_index"),
    countryAccountsId: text("country_accounts_id").references(() => countryAccountsTable.id),
  }
);
```

Key Features:
1. **Spatial Columns**:
   - `geom`: Main geometry storage (SRID: 4326)
   - `bbox`: Bounding box for quick spatial queries
   - `spatial_index`: For hierarchical spatial indexing

2. **Multilingual Support**:
   - `name`: JSONB field storing names in multiple languages
   - Uses `zeroStrMap` type for language-keyed string mapping

3. **Identification Fields**:
   - `importId`: External identifier from import process (unique)
   - `nationalId`: Optional national identifier for integration with external systems

4. **Hierarchical Structure**:
   - `parentId`: Self-referencing foreign key for parent-child relationships
   - `level`: Hierarchy level (1 for root divisions, parent level + 1 for children)

5. **Multi-Tenancy Support**:
   - `countryAccountsId`: Foreign key reference to country_accounts table
   - Enforces tenant isolation at the database level
   - All queries filter by this field to ensure data sovereignty

5. **Indexes**:
   ```sql
   CREATE INDEX "division_geom_idx" ON "division" USING GIST ("geom")
   CREATE INDEX "division_bbox_idx" ON "division" USING GIST ("bbox")
   CREATE INDEX "division_parent_id_idx" ON "division" ("parent_id")
   CREATE INDEX "division_level_idx" ON "division" ("level")
   ```
   - GIST indexes for efficient spatial queries
   - Regular indexes for parentId and level for hierarchical queries

6. **Constraints**:
   - Geometry validation: `CHECK (ST_IsValid(geom))`
   - Unique import IDs
   - Valid parent references
   - Tenant isolation via countryAccountsId

## Implementation Details

### Validation Logic

1. **Shared Validation Function**:
```typescript
async function validateDivisionData(
  tx: Tx,
  data: DivisionInsert,
  tenantContext: TenantContext,
  existingId?: number
): Promise<{ valid: boolean; errors: string[]; level?: number }>
```

2. **Validation Checks**:
   - Parent division exists and belongs to the same tenant
   - No circular references in the hierarchy
   - No duplicate division names within the same tenant and level
   - No duplicate nationalId within the same tenant
   - No duplicate importId within the same tenant
   - Division name is required
   - Level is calculated based on parent's level

3. **Circular Reference Detection**:
```typescript
async function checkCircularReference(
  tx: Tx, 
  divisionId: number, 
  parentId: number,
  countryAccountId: string
): Promise<boolean>
```
   - Prevents creating loops in the division hierarchy
   - Uses efficient graph traversal algorithm
   - Maintains data integrity across operations

### Core Components (`division.ts`)

1. **Data Access Functions**:
```typescript
// Retrieve division by ID with tenant context
async function divisionById(id: number, tenantContext: TenantContext): Promise<DivisionRow | null>

// Retrieve division by import ID with tenant context
async function divisionByImportId(importId: string, tenantContext: TenantContext): Promise<DivisionRow | null>

// Get direct children of a division with tenant context
async function divisionChildren(languages: string[], parentId: number | null, tenantContext: TenantContext): Promise<DivisionRow[]>

// Get all children recursively with tenant context
async function divisionAllChildren(languages: string[], parentId: number, tenantContext: TenantContext): Promise<DivisionRow[]>

// Generate breadcrumb path for a division with tenant context
async function divisionBreadcrumb(languages: string[], id: number, tenantContext: TenantContext): Promise<DivisionBreadcrumbRow[]>
```

2. **Import Pipeline**:
```typescript
async function importZip(zipBytes: Uint8Array, tenantContext: TenantContext): Promise<ImportRes> {
  // Extract and validate ZIP contents
  const zip = await JSZip.loadAsync(zipBytes);
  
  // Find CSV file
  const csvFile = findCsvFile(zip);
  if (!csvFile) {
    throw new UserError("No CSV file found in ZIP");
  }
  
  // Process CSV content
  const csvContent = await zip.file(csvFile).async("string");
  const divisions = fromCSV(csvContent);
  
  // Create GeoJSON lookup map
  const geoJsonFiles = new Map<string, string>();
  zip.forEach((path, file) => {
    if (path.toLowerCase().endsWith(".geojson")) {
      const normalizedName = path.split("/").pop()!.toLowerCase();
      geoJsonFiles.set(normalizedName, path);
    }
  });
  
  // Process divisions in transaction
  return await dr.transaction(async (tx) => {
    // First pass: process root divisions
    // Second pass: process child divisions
    // Return import results
  });
}
```

3. **Form Processing**:
```typescript
// Convert form data to division record
export function fromForm(formData: Record<string, string>): DivisionInsert {
  const names: Record<string, string> = {};
  
  // Extract language-specific names
  Object.keys(formData).forEach(key => {
    if (key.startsWith("name_")) {
      const lang = key.substring(5);
      names[lang] = formData[key];
    }
  });
  
  return {
    importId: formData.importId,
    nationalId: formData.nationalId,
    parentId: formData.parentId ? Number(formData.parentId) : null,
    name: names,
    level: Number(formData.level || 1),
  };
}

// Update division record
export async function update(id: number, data: DivisionInsert): Promise<UpdateResult> {
  try {
    await dr.update(divisionTable).set(data).where(eq(divisionTable.id, id));
    return { ok: true };
  } catch (e) {
    return { ok: false, errors: [e.message] };
  }
}
```

### Spatial Query Functions

1. **Spatial Operations**:
```typescript
// Find divisions that intersect with a geometry
export async function divisionIntersects(geom: string): Promise<DivisionRow[]> {
  return await dr.select().from(divisionTable).where(
    sql`ST_Intersects(${divisionTable.geom}, ST_SetSRID(ST_GeomFromGeoJSON(${geom}), 4326))`
  );
}

// Find divisions that contain a point
export async function divisionContainsPoint(lon: number, lat: number): Promise<DivisionRow[]> {
  return await dr.select().from(divisionTable).where(
    sql`ST_Contains(${divisionTable.geom}, ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326))`
  );
}

// Find divisions within a bounding box
export async function divisionWithin(minLon: number, minLat: number, maxLon: number, maxLat: number): Promise<DivisionRow[]> {
  return await dr.select().from(divisionTable).where(
    sql`ST_Within(${divisionTable.geom}, ST_MakeEnvelope(${minLon}, ${minLat}, ${maxLon}, ${maxLat}, 4326))`
  );
}
```

2. **GeoJSON Processing**:
```typescript
async function processGeoJSON(tx: Tx, divisionId: number, geoJsonContent: string): Promise<void> {
  try {
    // Validate GeoJSON structure
    const geojson = JSON.parse(geoJsonContent);
    if (!geojson || !geojson.type) {
      throw new UserError("Invalid GeoJSON format");
    }
    
    // Store original GeoJSON
    await tx.update(divisionTable)
      .set({ geojson: geojson })
      .where(eq(divisionTable.id, divisionId));
    
    // Convert to PostGIS geometry
    await tx.execute(sql`
      UPDATE division 
      SET geom = ST_SetSRID(ST_GeomFromGeoJSON(${geoJsonContent}), 4326)
      WHERE id = ${divisionId}
    `);
    
    // Update bounding box
    await tx.execute(sql`
      UPDATE division
      SET bbox = ST_Envelope(geom)
      WHERE id = ${divisionId}
    `);
  } catch (e) {
    throw new UserError(`Failed to process GeoJSON: ${e.message}`);
  }
}
```

### Error Handling and Validation

1. **Custom Error Classes**:
```typescript
export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserError";
  }
}

export class ImportError extends UserError {
  constructor(message: string) {
    super(message);
    this.name = "ImportError";
  }
}

export class ValidationError extends UserError {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
```

2. **CSV Validation**:
```typescript
function validateCSV(headers: string[]): void {
  const requiredColumns = ["id", "parent", "geodata"];
  const missingColumns = requiredColumns.filter(col => !headers.includes(col));
  
  if (missingColumns.length > 0) {
    throw new ImportError(`Missing required columns: ${missingColumns.join(", ")}`);
  }
  
  // Check for at least one language column
  const languageColumns = headers.filter(h => !requiredColumns.includes(h) && h !== "nationalId");
  if (languageColumns.length === 0) {
    throw new ImportError("No language columns found");
  }
}
```

3. **Hierarchy Validation**:
```typescript
async function validateHierarchy(tx: Tx, parentId: number | null, level: number): Promise<void> {
  if (parentId) {
    const parent = await tx.query.divisionTable.findFirst({
      where: eq(divisionTable.id, parentId)
    });
    
    if (!parent) {
      throw new ValidationError(`Parent division ${parentId} not found`);
    }
    
    if (parent.level >= level) {
      throw new ValidationError(`Invalid hierarchy level: child level (${level}) must be greater than parent level (${parent.level})`);
    }
  }
}
```

## Frontend Integration

### Routes and Components

1. **Main Geography Routes**:
   - `_index.tsx`: List view with tree/table display and language filtering
   - `$id.tsx`: Detail view with multilingual names and map display
   - `edit.$id.tsx`: Edit form for division properties
   - `upload.tsx`: ZIP file upload for division import
   - `csv-export.ts`: CSV export functionality

2. **Division Components**:
```typescript
// Division form component
export function DivisionForm({
  edit,
  fields,
  errors,
  breadcrumbs,
  view
}: DivisionFormProps) {
  // Form for creating/editing divisions with multilingual support
}

// Breadcrumb navigation component
export function Breadcrumb({
  rows,
  linkLast = false
}: BreadcrumbProps) {
  // Hierarchical breadcrumb navigation
}

// Tree view component for hierarchical display
export function TreeView({
  data,
  onSelect
}: TreeViewProps) {
  // Recursive tree view for division hierarchy
}
```

3. **Map Integration**:
```typescript
// Map component for GeoJSON display
export default function DTSMap({
  geoData
}: DTSMapProps) {
  // Renders map with division boundaries
}
```

## Performance Optimizations

1. **Query Optimization**:
   - Efficient hierarchical queries with recursive CTEs
   - Spatial indexing for geographic queries
   - Pagination for large result sets

2. **Frontend Optimization**:
   - Tree/table view toggle for different visualization needs
   - Language filtering to focus on relevant content
   - Client-side rendering for interactive maps
   - Server-side pagination for large datasets

3. **Import Process**:
   - Transaction management for data integrity
   - Error tracking with detailed reporting
   - Flexible file structure support
   - Validation at multiple stages

## UI/UX Features

1. **Division Management**:
   - Tree and table views for hierarchical navigation
   - Breadcrumb navigation for context awareness
   - Language filtering with checkboxes
   - Pagination controls for large datasets

2. **Division Details**:
   - Multilingual name display
   - Interactive map visualization
   - Edit functionality with form validation
   - Hierarchical context with breadcrumbs

3. **Import/Export**:
   - Simple file upload interface
   - Clear success/error messaging
   - CSV export for data portability
   - Detailed error reporting

## Integration Points

1. **Database**:
   - PostGIS for spatial operations
   - Drizzle ORM for type-safe queries
   - Transaction support for data integrity

2. **Frontend Framework**:
   - Remix for server-side rendering and routing
   - React for component-based UI
   - TypeScript for type safety

3. **External Libraries**:
   - JSZip for ZIP file processing
   - CSV parsing for import/export
   - Map libraries for GeoJSON visualization

## Error Handling Strategy

1. **User-Facing Errors**:
   - Clear error messages for import issues
   - Form validation with specific field errors
   - Graceful fallbacks for missing data

2. **System Errors**:
   - Transaction rollback for data integrity
   - Logging for debugging and monitoring
   - Type-safe error handling with custom error classes

3. **Recovery Mechanisms**:
   - Partial success reporting (e.g., "50 imported, 3 failed")
   - Detailed error context for troubleshooting
   - Ability to retry failed operations
