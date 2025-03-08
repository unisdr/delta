# Division Model Technical Implementation

## Database Architecture

### Schema Design (`schema.ts`)

```typescript
export const divisionTable = pgTable(
  "division",
  {
    id: ourSerial("id").primaryKey(),
    importId: text("import_id").unique(),
    parentId: ourBigint("parent_id").references(() => divisionTable.id),
    name: zeroStrMap("name"),
    geojson: jsonb("geojson"),
    level: ourBigint("level"),
    geom: customType({ dataType: () => "geometry(GEOMETRY, 4326)" })(),
    bbox: customType({ dataType: () => "geometry(GEOMETRY, 4326)" })(),
    spatial_index: text("spatial_index"),
  }
);
```

Key Features:
1. **Spatial Columns**:
   - `geom`: Main geometry storage (SRID: 4326)
   - `bbox`: Bounding box for quick spatial queries
   - `spatial_index`: For hierarchical spatial indexing

2. **Indexes**:
   ```sql
   CREATE INDEX "division_geom_idx" ON "division" USING GIST ("geom")
   CREATE INDEX "division_bbox_idx" ON "division" USING GIST ("bbox")
   ```
   - GIST indexes for efficient spatial queries
   - Regular indexes for parentId and level

3. **Constraints**:
   - Geometry validation: `CHECK (ST_IsValid(geom))`
   - Unique import IDs
   - Valid parent references

## Implementation Details

### Core Components (`division.ts`)

1. **Import Pipeline**:
```typescript
async function importZip(zipBytes: Uint8Array) {
  // 1. Extract and validate ZIP contents
  const zip = await JSZip.loadAsync(zipBytes);
  
  // 2. Process CSV
  const divisions = await processCSV(zip);
  
  // 3. Create GeoJSON lookup map
  const geoJsonFiles = createGeoJsonMap(zip);
  
  // 4. Process in two phases
  await processRootDivisions(divisions, geoJsonFiles);
  await processChildDivisions(divisions, geoJsonFiles);
}
```

2. **Batch Processing**:
```typescript
await processParallelBatches(
  divisions,
  10,  // batchSize
  2,   // concurrency
  async (batch) => {
    // Process each division in batch
  }
);
```

3. **Transaction Management**:
```typescript
await dr.transaction(async (tx) => {
  // 1. Insert division record
  const result = await tx.insert(divisionTable).values({...});
  
  // 2. Process GeoJSON
  await processGeoJSON(tx, id, geoJsonContent);
  
  // 3. Update spatial indexes
  await updateSpatialIndexes(tx);
});
```

### PostGIS Integration

1. **Trigger System**:
```sql
-- Automatically updates geom from GeoJSON
CREATE TRIGGER geojson_to_geometry
AFTER INSERT OR UPDATE OF geojson ON division
FOR EACH ROW EXECUTE FUNCTION update_geometry();

-- Updates bbox and spatial_index
CREATE TRIGGER update_spatial_indexes
AFTER INSERT OR UPDATE OF geom ON division
FOR EACH ROW EXECUTE FUNCTION update_indexes();
```

2. **Spatial Operations**:
```typescript
// Convert GeoJSON to PostGIS geometry
await tx.execute(sql`
  UPDATE division 
  SET geom = ST_SetSRID(ST_GeomFromGeoJSON(${geoJsonStr}), 4326)
  WHERE id = ${divisionId}
`);
```

### Error Handling and Validation

1. **CSV Validation**:
```typescript
function validateCSV(headers: string[], rows: string[][]) {
  const requiredColumns = ['id', 'parent', 'geodata'];
  const missingColumns = requiredColumns.filter(col => !headers.includes(col));
  if (missingColumns.length > 0) {
    throw new UserError(`Missing required columns: ${missingColumns.join(', ')}`);
  }
}
```

2. **GeoJSON Validation**:
```typescript
function validateGeoJSON(content: string) {
  // 1. Parse JSON
  const geojson = JSON.parse(content);
  
  // 2. Validate structure
  if (!geojson.type || !geojson.geometry) {
    throw new UserError('Invalid GeoJSON structure');
  }
  
  // 3. Validate coordinates
  validateCoordinates(geojson.geometry.coordinates);
}
```

3. **Hierarchy Validation**:
```typescript
async function validateHierarchy(tx: Tx, parentId: number | null, level: number) {
  if (parentId) {
    const parent = await tx.query.divisionTable.findFirst({
      where: eq(divisionTable.id, parentId)
    });
    if (!parent) {
      throw new UserError(`Parent division ${parentId} not found`);
    }
    if (parent.level >= level) {
      throw new UserError('Invalid hierarchy level');
    }
  }
}
```

## Performance Optimizations

1. **Batch Processing**:
   - Configurable batch size and concurrency
   - Progress tracking and logging
   - Memory efficient processing

2. **Spatial Indexing**:
   - GIST indexes for geometry and bbox
   - Hierarchical spatial indexing
   - Optimized bounding box calculations

3. **Transaction Management**:
   - Proper scoping to prevent long-running transactions
   - Automatic rollback on errors
   - Efficient bulk operations

## Utility Integration

1. **Logging** (`logger.ts`):
```typescript
logger.info('Processing divisions from CSV', {
  totalDivisions: Object.keys(divisions).length,
  sampleHeaders: headers
});
```

2. **Batch Processing** (`batchProcessing.ts`):
```typescript
const batchProcessor = new BatchProcessor({
  batchSize: 10,
  concurrency: 2,
  onProgress: (processed, total) => {
    logger.info('Import progress', { processed, total });
  }
});
```

3. **Geo Validation** (`geoValidation.ts`):
```typescript
const validator = new GeoValidator({
  validateCoordinates: true,
  validateGeometry: true,
  srid: 4326
});
```

## Testing and Debugging

1. **Validation Testing**:
```typescript
test('CSV validation', async () => {
  const csv = 'id,name\n1,Test';  // Missing required columns
  await expect(validateCSV(parseHeaders(csv))).rejects.toThrow('Missing required columns');
});
```

2. **Transaction Testing**:
```typescript
test('Transaction rollback', async () => {
  await expect(importDivision(tx, invalidDivision)).rejects.toThrow();
  // Verify no data was inserted
  const count = await tx.select().from(divisionTable).execute();
  expect(count).toBe(0);
});
```

3. **Spatial Testing**:
```typescript
test('Spatial indexes', async () => {
  await importDivision(tx, validDivision);
  const result = await tx.select().from(divisionTable).where(sql`
    ST_Intersects(geom, ST_MakeEnvelope(0, 0, 1, 1, 4326))
  `);
  expect(result).toHaveLength(1);
});
```
