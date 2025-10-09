# Division Model Technical Implementation

## Database Architecture

### Schema Design (`schema.ts`)

```typescript
export const divisionTable = pgTable("division", {
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
	countryAccountsId: text("country_accounts_id").references(
		() => countryAccountsTable.id
	),
});
```

Key Features:

1. **Spatial Columns**:

   - `geom`: Main geometry storage (SRID: 4326) for PostGIS spatial operations
   - `bbox`: Bounding box for optimized spatial queries
   - `spatial_index`: For hierarchical spatial indexing
   - `geojson`: Original GeoJSON data storage for frontend rendering

2. **Multilingual Support**:

   - `name`: JSONB field storing names in multiple languages (e.g., {"en": "Region One", "fr": "Région Un"})
   - Uses `zeroStrMap` type for language-keyed string mapping

3. **Identification Fields**:

   - `importId`: External identifier from import process (unique within tenant)
   - `nationalId`: Optional national identifier for integration with external systems (unique within tenant)

4. **Hierarchical Structure**:

   - `parentId`: Self-referencing foreign key for parent-child relationships
   - `level`: Hierarchy level (1 for root divisions, parent level + 1 for children)

5. **Multi-Tenancy Support**:

   - `countryAccountsId`: Foreign key reference to country_accounts table
   - Enforces tenant isolation at the database level
   - All queries filter by this field to ensure data sovereignty

6. **Indexes**:

   ```sql
   CREATE INDEX "division_geom_idx" ON "division" USING GIST ("geom")
   CREATE INDEX "division_bbox_idx" ON "division" USING GIST ("bbox")
   CREATE INDEX "division_parent_id_idx" ON "division" ("parent_id")
   CREATE INDEX "division_level_idx" ON "division" ("level")
   CREATE UNIQUE INDEX "division_import_id_country_accounts_id_unique" ON "division" ("import_id", "country_accounts_id")
   CREATE UNIQUE INDEX "division_national_id_country_accounts_id_unique" ON "division" ("national_id", "country_accounts_id")
   ```

   - GIST indexes for efficient spatial queries
   - Regular indexes for parentId and level for hierarchical queries
   - Composite unique indexes for tenant-scoped uniqueness

7. **Constraints**:
   - Geometry validation through PostGIS
   - Tenant-scoped unique import IDs and national IDs
   - Valid parent references with circular reference prevention
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
): Promise<{ valid: boolean; errors: string[]; level?: number }>;
```

2. **Validation Checks**:

   - Parent division exists and belongs to the same tenant
   - No circular references in the hierarchy
   - No duplicate division names within the same tenant and level
   - No duplicate nationalId within the same tenant
   - No duplicate importId within the same tenant
   - Division name is required in at least one language
   - Level is calculated based on parent's level (parent level + 1)
   - All operations respect tenant isolation via countryAccountsId

3. **Circular Reference Detection**:

```typescript
async function checkCircularReference(
	tx: Tx,
	divisionId: number,
	parentId: number,
	countryAccountId: string
): Promise<boolean>;
```

- Prevents creating loops in the division hierarchy
- Uses recursive query to detect potential circular references
- Maintains data integrity across operations
- Includes tenant context for security

### Core Components (`division.ts`)

1. **Data Access Functions**:

```typescript
// Retrieve division by ID with tenant context
async function divisionById(
	id: number,
	tenantContext: TenantContext
): Promise<DivisionRow | null>;

// Retrieve division by import ID with tenant context
async function divisionByImportId(
	importId: string,
	tenantContext: TenantContext
): Promise<DivisionRow | null>;

// Get direct children of a division with tenant context
async function divisionChildren(
	languages: string[],
	parentId: number | null,
	tenantContext: TenantContext
): Promise<DivisionRow[]>;

// Get all children recursively with tenant context
async function divisionAllChildren(
	languages: string[],
	parentId: number,
	tenantContext: TenantContext
): Promise<DivisionRow[]>;

// Generate breadcrumb path for a division with tenant context
async function divisionBreadcrumb(
	languages: string[],
	id: number,
	tenantContext: TenantContext
): Promise<DivisionBreadcrumbRow[]>;

// Get all available languages in divisions
async function divisionsAllLanguages(
	parentId: number | null,
	selectedLangs: string[],
	tenantContext: TenantContext
): Promise<Record<string, number>>;
```

2. **Import Pipeline**:

```typescript
async function importZip(
	zipBytes: Uint8Array,
	tenantContext: TenantContext
): Promise<ImportRes> {
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

	// Create GeoJSON lookup map with case-insensitive matching
	const geoJsonFiles = new Map<string, string>();
	zip.forEach((path, file) => {
		if (path.toLowerCase().endsWith(".geojson")) {
			const normalizedName = path.split("/").pop()!.toLowerCase();
			geoJsonFiles.set(normalizedName, path);
		}
	});

	// Process divisions in transaction with tenant isolation
	return await dr.transaction(async (tx) => {
		// Track import results
		let imported = 0;
		let failed = 0;
		let failedDetails: Record<string, string> = {};

		// First pass: process root divisions (no parent)
		for (const division of divisions.filter((d) => !d.parentId)) {
			try {
				await importDivision(tx, division, geoJsonFiles, zip, tenantContext);
				imported++;
			} catch (e) {
				failed++;
				failedDetails[division.importId] = e.message;
			}
		}

		// Second pass: process child divisions (with parent)
		for (const division of divisions.filter((d) => d.parentId)) {
			try {
				await importDivision(tx, division, geoJsonFiles, zip, tenantContext);
				imported++;
			} catch (e) {
				failed++;
				failedDetails[division.importId] = e.message;
			}
		}

		// Update spatial indexes
		await updateSpatialIndexes(tx);

		// Return detailed import results
		return {
			success: true,
			data: { imported, failed, failedDetails },
		};
	});
}
```

3. **Form Processing**:

```typescript
// Convert form data to division record
export function fromForm(formData: Record<string, string>): DivisionInsert {
	const names: Record<string, string> = {};

	// Extract language-specific names
	Object.keys(formData).forEach((key) => {
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
		countryAccountsId: formData.countryAccountsId, // Tenant context
	};
}

// Update division record with tenant isolation
export async function update(
	id: number,
	data: DivisionInsert,
	tenantContext: TenantContext
): Promise<UpdateResult> {
	try {
		// Validate data before update
		const validation = await validateDivisionData(dr, data, tenantContext, id);
		if (!validation.valid) {
			return { ok: false, errors: validation.errors };
		}

		// Update with tenant isolation
		await dr
			.update(divisionTable)
			.set(data)
			.where(
				and(
					eq(divisionTable.id, id),
					eq(divisionTable.countryAccountsId, tenantContext)
				)
			);
		return { ok: true };
	} catch (e) {
		return { ok: false, errors: [e.message] };
	}
}
```

### Spatial Query Functions

1. **Spatial Operations**:

```typescript
// Find divisions that intersect with a geometry with tenant isolation
export async function divisionIntersects(
	geom: string,
	tenantContext: TenantContext
): Promise<DivisionRow[]> {
	return await dr
		.select()
		.from(divisionTable)
		.where(
			and(
				sql`ST_Intersects(${divisionTable.geom}, ST_SetSRID(ST_GeomFromGeoJSON(${geom}), 4326))`,
				eq(divisionTable.countryAccountsId, tenantContext)
			)
		);
}

// Find divisions that contain a point with tenant isolation
export async function divisionContainsPoint(
	lon: number,
	lat: number,
	tenantContext: TenantContext
): Promise<DivisionRow[]> {
	return await dr
		.select()
		.from(divisionTable)
		.where(
			and(
				sql`ST_Contains(${divisionTable.geom}, ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326))`,
				eq(divisionTable.countryAccountsId, tenantContext)
			)
		);
}

// Find divisions within a bounding box with tenant isolation
export async function divisionWithin(
	minLon: number,
	minLat: number,
	maxLon: number,
	maxLat: number,
	tenantContext: TenantContext
): Promise<DivisionRow[]> {
	return await dr
		.select()
		.from(divisionTable)
		.where(
			and(
				sql`ST_Within(${divisionTable.geom}, ST_MakeEnvelope(${minLon}, ${minLat}, ${maxLon}, ${maxLat}, 4326))`,
				eq(divisionTable.countryAccountsId, tenantContext)
			)
		);
}

// Find divisions by spatial relationship with another GeoJSON
export async function divisionsByGeoJSON(
	geoJson: string,
	relationship: "intersects" | "contains" | "within",
	tenantContext: TenantContext
): Promise<DivisionRow[]> {
	let spatialCondition;
	switch (relationship) {
		case "intersects":
			spatialCondition = sql`ST_Intersects(${divisionTable.geom}, ST_SetSRID(ST_GeomFromGeoJSON(${geoJson}), 4326))`;
			break;
		case "contains":
			spatialCondition = sql`ST_Contains(${divisionTable.geom}, ST_SetSRID(ST_GeomFromGeoJSON(${geoJson}), 4326))`;
			break;
		case "within":
			spatialCondition = sql`ST_Within(${divisionTable.geom}, ST_SetSRID(ST_GeomFromGeoJSON(${geoJson}), 4326))`;
			break;
	}

	return await dr
		.select()
		.from(divisionTable)
		.where(
			and(spatialCondition, eq(divisionTable.countryAccountsId, tenantContext))
		);
}
```

2. **GeoJSON Processing**:

```typescript
async function processGeoJSON(
	tx: Tx,
	divisionId: number,
	geoJsonContent: string,
	tenantContext: TenantContext
): Promise<void> {
	try {
		// Validate GeoJSON structure
		const geojson = JSON.parse(geoJsonContent);
		if (!geojson) {
			throw new Error("Invalid GeoJSON: Could not parse JSON");
		}

		// Handle different GeoJSON types
		let validGeoJSON = geoJsonContent;

		// If it's a FeatureCollection, extract the first feature
		if (
			geojson.type === "FeatureCollection" &&
			Array.isArray(geojson.features) &&
			geojson.features.length > 0
		) {
			validGeoJSON = JSON.stringify(geojson.features[0]);
		}

		// If it's a Feature, use it directly
		if (geojson.type === "Feature" && geojson.geometry) {
			// Already in correct format
		}

		// If it's a direct geometry, wrap it in a Feature
		if (["Polygon", "MultiPolygon"].includes(geojson.type)) {
			validGeoJSON = JSON.stringify({
				type: "Feature",
				geometry: geojson,
			});
		}

		// Convert to PostGIS geometry with tenant isolation
		await tx.execute(sql`
      UPDATE division
      SET 
        geojson = ${validGeoJSON}::jsonb,
        geom = ST_SetSRID(ST_GeomFromGeoJSON(${validGeoJSON}), 4326),
        bbox = ST_Envelope(ST_GeomFromGeoJSON(${validGeoJSON}))
      WHERE id = ${divisionId} AND country_accounts_id = ${tenantContext}
    `);

		// Update spatial index
		await updateSpatialIndex(tx, divisionId, tenantContext);
	} catch (e) {
		throw new Error(
			`Failed to process GeoJSON for division ${divisionId}: ${e.message}`
		);
	}
}

// Update spatial indexes for efficient querying
async function updateSpatialIndex(
	tx: Tx,
	divisionId: number,
	tenantContext: TenantContext
): Promise<void> {
	// Generate hierarchical spatial index based on parent's index
	const division = await tx
		.select()
		.from(divisionTable)
		.where(
			and(
				eq(divisionTable.id, divisionId),
				eq(divisionTable.countryAccountsId, tenantContext)
			)
		)
		.then((rows) => rows[0]);

	if (!division) return;

	let spatialIndex = division.id.toString().padStart(8, "0");

	if (division.parentId) {
		const parent = await tx
			.select()
			.from(divisionTable)
			.where(
				and(
					eq(divisionTable.id, division.parentId),
					eq(divisionTable.countryAccountsId, tenantContext)
				)
			)
			.then((rows) => rows[0]);

		if (parent && parent.spatial_index) {
			spatialIndex = `${parent.spatial_index}.${spatialIndex}`;
		}
	}

	await tx
		.update(divisionTable)
		.set({ spatial_index: spatialIndex })
		.where(
			and(
				eq(divisionTable.id, divisionId),
				eq(divisionTable.countryAccountsId, tenantContext)
			)
		);
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

export class SystemError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "SystemError";
	}
}

export class ValidationError extends Error {
	public errors: string[];

	constructor(errors: string[]) {
		super(errors.join(", "));
		this.name = "ValidationError";
		this.errors = errors;
	}
}

export class ImportError extends Error {
	public importId: string;

	constructor(importId: string, message: string) {
		super(message);
		this.name = "ImportError";
		this.importId = importId;
	}
}
```

2. **Validation Utilities**:

```typescript
// Check for duplicate division names within same tenant and level
async function checkDuplicateName(
	tx: Tx,
	name: Record<string, string>,
	level: number,
	tenantContext: TenantContext,
	existingId?: number
): Promise<boolean> {
	// Get all languages in the name object
	const languages = Object.keys(name);

	// For each language, check if there's a duplicate name at the same level
	for (const lang of languages) {
		const nameValue = name[lang];
		if (!nameValue) continue;

		const query = tx
			.select({ count: sql<number>`count(*)` })
			.from(divisionTable)
			.where(
				and(
					sql`${divisionTable.name}->>'${lang}' = ${nameValue}`,
					eq(divisionTable.level, level),
					eq(divisionTable.countryAccountsId, tenantContext)
				)
			);

		// Exclude the current division if updating
		if (existingId) {
			query.where(ne(divisionTable.id, existingId));
		}

		const result = await query;
		if (result[0].count > 0) {
			return true; // Duplicate found
		}
	}

	return false; // No duplicates
}

// Check for duplicate import IDs within same tenant
async function checkDuplicateImportId(
	tx: Tx,
	importId: string,
	tenantContext: TenantContext,
	existingId?: number
): Promise<boolean> {
	const query = tx
		.select({ count: sql<number>`count(*)` })
		.from(divisionTable)
		.where(
			and(
				eq(divisionTable.importId, importId),
				eq(divisionTable.countryAccountsId, tenantContext)
			)
		);

	// Exclude the current division if updating
	if (existingId) {
		query.where(ne(divisionTable.id, existingId));
	}

	const result = await query;
	return result[0].count > 0;
}

// Check for duplicate national IDs within same tenant
async function checkDuplicateNationalId(
	tx: Tx,
	nationalId: string,
	tenantContext: TenantContext,
	existingId?: number
): Promise<boolean> {
	if (!nationalId) return false; // No nationalId, no duplicate

	const query = tx
		.select({ count: sql<number>`count(*)` })
		.from(divisionTable)
		.where(
			and(
				eq(divisionTable.nationalId, nationalId),
				eq(divisionTable.countryAccountsId, tenantContext)
			)
		);

	// Exclude the current division if updating
	if (existingId) {
		query.where(ne(divisionTable.id, existingId));
	}

	const result = await query;
	return result[0].count > 0;
}

// Validate CSV headers
function validateCSV(headers: string[]): void {
	const requiredColumns = ["id", "parent", "geodata"];
	const missingColumns = requiredColumns.filter(
		(col) => !headers.includes(col)
	);

	if (missingColumns.length > 0) {
		throw new ImportError(
			`Missing required columns: ${missingColumns.join(", ")}`
		);
	}

	// Check for at least one language column
	const languageColumns = headers.filter(
		(h) => !requiredColumns.includes(h) && h !== "nationalId"
	);
	if (languageColumns.length === 0) {
		throw new ImportError("No language columns found");
	}
}
```

3. **Hierarchy Validation**:

```typescript
async function validateHierarchy(
	tx: Tx,
	parentId: number | null,
	level: number
): Promise<void> {
	if (parentId) {
		const parent = await tx.query.divisionTable.findFirst({
			where: eq(divisionTable.id, parentId),
		});

		if (!parent) {
			throw new ValidationError(`Parent division ${parentId} not found`);
		}

		if (parent.level >= level) {
			throw new ValidationError(
				`Invalid hierarchy level: child level (${level}) must be greater than parent level (${parent.level})`
			);
		}
	}
}
```

## Frontend Integration

### Routes

1. **Geography Settings Index** (`_index.tsx`):

   - Lists all divisions with pagination and search
   - Provides tree and table views with toggle button
   - Allows filtering by multiple languages with checkboxes
   - Includes breadcrumb navigation for hierarchy context
   - Shows division counts by level
   - Provides links to edit, view details, and import
   - Uses tenant context for data isolation
   - Implementation:
     ```tsx
     export default function GeographyIndex() {
     	const { divisions, languages, counts } = useLoaderData<typeof loader>();
     	const [viewMode, setViewMode] = useState<"tree" | "table">("tree");
     	// Tree/table view toggle and language filtering
     }
     ```

2. **Division Detail** (`$id.tsx`):

   - Shows division details including multilingual names
   - Displays parent-child relationships with breadcrumb
   - Renders GeoJSON map visualization with PostGIS data
   - Shows metadata like level, importId, and nationalId
   - Provides edit and back navigation buttons
   - Implementation:
     ```tsx
     export default function DivisionDetail() {
     	const { division, breadcrumb } = useLoaderData<typeof loader>();
     	// Display division details and map
     }
     ```

3. **Division Edit** (`edit.$id.tsx`):

   - Form for editing division properties
   - Multilingual name inputs with language selection
   - Parent selection dropdown with filtering
   - Client and server-side validation
   - Preserves tenant context in all operations
   - Implementation:
     ```tsx
     export default function EditDivision() {
     	const { division, parents, breadcrumb } = useLoaderData<typeof loader>();
     	// Edit form with validation
     }
     ```

4. **Division Import** (`upload.tsx`):

   - ZIP file upload interface with drag-and-drop
   - Import progress indicator
   - Detailed results display with success and error counts
   - Error reporting for failed imports with specific messages
   - Links to documentation and help
   - Implementation:
     ```tsx
     export default function UploadDivisions() {
     	const actionData = useActionData<typeof action>();
     	// File upload form and results display
     }
     ```

5. **Division Export** (`csv-export.ts`):
   - CSV export endpoint for all divisions
   - Includes all languages and metadata
   - Tenant-scoped data export
   - Proper filename and content-type headers
   - Implementation:
     ```tsx
     export async function loader({ request }: LoaderArgs) {
     	// Generate CSV content with tenant isolation
     	return new Response(csvContent, {
     		headers: {
     			"Content-Type": "text/csv",
     			"Content-Disposition": `attachment; filename="divisions-${tenantContext}.csv"`,
     		},
     	});
     }
     ```

### Components

1. **DivisionTree**:

   ```tsx
   export function DivisionTree({
   	divisions,
   	selectedLanguages,
   	onSelect,
   }: DivisionTreeProps) {
   	// Recursive tree rendering with expandable nodes
   	// Shows division names in selected languages
   	// Highlights current selection
   }
   ```

2. **DivisionTable**:

   ```tsx
   export function DivisionTable({
   	divisions,
   	selectedLanguages,
   	pagination,
   }: DivisionTableProps) {
   	// Tabular view with sortable columns
   	// Language-aware name display
   	// Action buttons for view/edit
   	// Pagination controls
   }
   ```

3. **DivisionMap**:

   ```tsx
   export function DivisionMap({ geoJson, center, zoom }: DivisionMapProps) {
   	// Leaflet map integration
   	// GeoJSON rendering with proper styling
   	// Zoom and pan controls
   	// Responsive container sizing
   }
   ```

4. **LanguageSelector**:

   ```tsx
   export function LanguageSelector({
   	availableLanguages,
   	selectedLanguages,
   	onChange,
   }: LanguageSelectorProps) {
   	// Checkbox group for language selection
   	// Shows language counts
   	// Handles selection changes
   }
   ```

5. **ImportResults**:
   ```tsx
   export function ImportResults({ results }: ImportResultsProps) {
   	// Success/failure summary
   	// Detailed error listing
   	// Collapsible error details
   }
   ```

## Performance Optimizations

1. **Database Query Optimization**:

   - Efficient hierarchical queries with recursive CTEs for breadcrumb and tree navigation
   - GIST spatial indexes for PostGIS geometry operations
   - B-tree indexes for parent-child relationships and level filtering
   - Composite indexes for tenant-scoped uniqueness constraints
   - Pagination with SQL LIMIT/OFFSET for large result sets
   - Selective column retrieval to minimize data transfer

2. **Frontend Optimization**:

   - Tree/table view toggle for different visualization needs and performance profiles
   - Language filtering to focus on relevant content and reduce rendering load
   - Client-side caching of division data for faster navigation
   - Lazy loading of map components and GeoJSON data
   - Server-side pagination for large datasets
   - Optimistic UI updates for better perceived performance

3. **Import Process Optimization**:

   - Transaction management for data integrity and atomic operations
   - Two-phase import (roots first, then children) to handle parent dependencies efficiently
   - Case-insensitive GeoJSON file matching for flexible file naming
   - Batch processing with detailed error tracking
   - Feature extraction from FeatureCollection GeoJSON for compatibility
   - Spatial index generation for efficient querying

4. **Memory and Resource Management**:
   - Streaming file processing for large uploads
   - Efficient GeoJSON parsing and validation
   - Proper cleanup of temporary resources
   - Tenant isolation to limit dataset size in memory
   - Optimized SQL queries to reduce database load

## UI/UX Features

1. **Division Management**:

   - Dual view modes: hierarchical tree for context and table for detailed information
   - Breadcrumb navigation for clear hierarchical context
   - Multi-language filtering with checkboxes and language counts
   - Search functionality for quick access to specific divisions
   - Pagination controls with customizable page size
   - Consistent action buttons for view, edit, and delete operations
   - Level indicators showing hierarchy depth

2. **Division Details**:

   - Multilingual name display with language tabs
   - Interactive map visualization with zoom and pan controls
   - Metadata display (level, importId, nationalId) in structured format
   - Parent-child relationship visualization
   - Edit functionality with form validation
   - Hierarchical context with breadcrumbs
   - Back navigation with context preservation

3. **Import/Export**:

   - Drag-and-drop file upload interface
   - Progress indication during import
   - Detailed success/error statistics
   - Per-record error reporting with specific messages
   - CSV export with all languages and metadata
   - Proper file naming for exported data
   - Documentation links for import format guidance

4. **Accessibility and Usability**:
   - Keyboard navigation support
   - Screen reader compatibility
   - Responsive design for different screen sizes
   - Clear error messages and validation feedback
   - Consistent UI patterns across the application
   - Tooltips and help text for complex features

## Integration Points

1. **Database Integration**:

   - **PostGIS**: Used for spatial operations including:
     - Converting GeoJSON to geometry types
     - Calculating bounding boxes
     - Spatial indexing
     - Intersection and containment queries
   - **Drizzle ORM**: Provides type-safe database access with:
     - Schema definition with spatial column types
     - Relation mapping for parent-child relationships
     - Transaction support for atomic operations
     - Query building with filtering and pagination
   - **PostgreSQL**: Leveraged for:
     - JSONB storage for multilingual names
     - Recursive CTEs for hierarchical queries
     - GiST and B-tree indexes for performance
     - Tenant isolation via countryAccountsId filtering

2. **Frontend Framework Integration**:

   - **Remix**: Used for:
     - Server-side rendering of division data
     - Route-based code organization
     - Form handling with validation
     - Loader and action functions for data operations
   - **React**: Provides:
     - Component-based UI architecture
     - State management for view modes and filters
     - Context providers for tenant and language settings
     - Custom hooks for division data access
   - **TypeScript**: Ensures:
     - Type safety across frontend and backend
     - Interface definitions for division data
     - Type checking for multilingual content
     - Consistent error handling patterns

3. **External Libraries Integration**:

   - **JSZip**: Handles:
     - ZIP file extraction during import
     - File type detection and validation
     - Stream processing for large files
   - **Leaflet**: Provides:
     - Interactive map rendering
     - GeoJSON visualization
     - Map controls and events
   - **CSV Processing**: Includes:
     - Parsing CSV files during import
     - Generating CSV exports
     - Handling multilingual content in CSV format
   - **GeoJSON Processing**: Manages:
     - Validation of GeoJSON structure
     - Feature extraction from FeatureCollections
     - Property mapping between CSV and GeoJSON

4. **System Integration**:
   - **Tenant System**: Integration with:
     - User authentication and authorization
     - Country account context for data isolation
     - Tenant-aware validation rules
   - **Multilingual System**: Support for:
     - Dynamic language selection
     - Language-specific validation
     - Localized UI elements

## Error Handling

1. **Error Classification**:

   - **UserError**: User-facing errors with clear messages that can be addressed by the user
     - Examples: Invalid file format, duplicate division name, circular reference
     - Implementation: `throw new UserError('Division name already exists in this tenant')`
   - **SystemError**: Internal errors requiring technical intervention
     - Examples: Database connection issues, unexpected data format
     - Implementation: `throw new SystemError('Failed to connect to database', originalError)`
   - **ValidationError**: Data validation failures with specific field context
     - Examples: Missing required field, invalid level value
     - Implementation: `throw new ValidationError('Level must be a positive integer')`
   - **ImportError**: Specific to import process with record context
     - Examples: Missing GeoJSON file, CSV format errors
     - Implementation: `throw new ImportError('Missing GeoJSON file for division', { row, importId })`

2. **Error Reporting Mechanisms**:

   - **Frontend Display**:
     - Form validation errors shown inline with fields
     - Import errors displayed in structured table
     - System errors shown with appropriate user guidance
     - Error summary with counts and categories
   - **Backend Logging**:
     - Structured error logging with context
     - Error classification for monitoring
     - Stack traces for system errors
     - Tenant context included for troubleshooting
   - **API Responses**:
     - Consistent error response format
     - HTTP status codes matching error types
     - Detailed error messages for client handling
     - Validation error collections for form feedback

3. **Recovery and Resilience**:
   - **Transaction Management**:
     - Automatic rollback on failed operations
     - Partial commit support for batch operations
     - Savepoints for complex multi-step processes
   - **Partial Success Handling**:
     - Batch import with per-record success/failure tracking
     - Detailed reporting of successful and failed records
     - Continuation options after partial failures
   - **Graceful Degradation**:
     - Fallback rendering when GeoJSON is invalid
     - Default language selection when preferred language is unavailable
     - Progressive enhancement for map visualization
   - **Error Prevention**:
     - Proactive validation before database operations
     - Circular reference detection in hierarchies
     - Duplicate checking with tenant context
     - Type validation for all user inputs

## Conclusion

The DELTA Resilience Division system provides a robust, scalable, and user-friendly solution for managing geographic administrative divisions with the following key features:

1. **Comprehensive Data Model**:

   - Hierarchical structure with parent-child relationships
   - Multilingual support via JSONB fields
   - Spatial data integration with PostGIS
   - Tenant isolation for multi-country deployments

2. **Flexible Import/Export**:

   - ZIP-based import with CSV and GeoJSON files
   - Validation at multiple levels
   - Detailed error reporting
   - CSV export with all languages and metadata

3. **Powerful Spatial Capabilities**:

   - GeoJSON storage and visualization
   - Spatial queries for intersection and containment
   - Automatic bounding box calculation
   - Spatial indexing for performance

4. **User-Friendly Interface**:
   - Tree and table views for different use cases
   - Interactive maps for visualization
   - Multilingual support throughout the UI
   - Consistent error handling and feedback

The implementation follows best practices for performance, security, and maintainability, ensuring a reliable system for geographic data management within the DELTA Resilience platform.
