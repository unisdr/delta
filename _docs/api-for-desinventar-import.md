# API for Desinventar import

https://github.com/unisdr/dts/issues/39

```
API definition to import Geography
API definition for DisasterRecord:: (insert, get methods) with
		HIPS (class, cluster OR specific).
		Date Start, End (with Year, Month or Day precision)
		Spatial Footprint - Add Geographic Level (any level)
API definition for Human Direct Effects (insert, get methods)
API definition for Sectors (Selection of any Level) with
		Assets - Add or use. Undefined.
		Damages - Add total, Damaged or Destroyed (units and costs)
		Disruptions - Add Disruption time unit, affected
```


# Create API key

Here is the URL for setting up api key: /settings/api-key
It's available in the main menu: Setting > Main Settings > API Keys

# API list of endpoints and fields

http://localhost:3000/api/

# Authentication and basic use examples

```
docs
/api/dev-example1

export DTS_KEY=YOUR_KEY
add
curl -H "X-Auth:$DTS_KEY" http://localhost:3000/api/dev-example1/add -d '[{
  "field1": "a",
	"field2": "b",
	"field3": 11,
	"field6": "one"
}]'
list
curl -H "X-Auth:$DTS_KEY" http://localhost:3000/api/dev-example1/list

```

# Importing geographies

Can be done using zip file upload. On the following page: `settings/geography`

# Disaster records

# HIPS

http://localhost:3000/api/hips

Read only access for type, cluster and hazard.
```
curl -H "X-Auth:$DTS_KEY" http://localhost:3000/api/hips/type/list
```

# Adding disaster record

```
curl -H "X-Auth:$DTS_KEY" http://localhost:3000/api/disaster-record/add -d '[{
  "hipTypeId": "1044",
  "approvalStatus": "draft",
  "startDate": "2025-03-12",
  "endDate": "2025-03-12",
	"primaryDataSource": "x",
	"validatedBy": "x",
	"originatorRecorderInst": "a",
	"spatialFootprint": [{
    "geojson": {
      "dts_info": {
        "division_id": "355",
        "division_ids": ["354","355"]
      }
	}]
}]'
```

## Human Effects API

### Base URL
```
GET|POST /api/human-effects/{action}?recordId={recordId}
```

### Authentication
Include your API key in the `X-Auth` header:
```
X-Auth: YOUR_API_KEY
```

## Database Schema

### Tables Overview

1. **Human Demographic Groups** (`human_dsg`)
   - Core demographic information linked to all effect tables
   - Each record represents a unique demographic segment

2. **Effect Tables**
   - `deaths` - Records of fatalities
   - `injured` - Records of injuries
   - `missing` - Records of missing persons
   - `affected` - Records of affected individuals (direct and indirect)
   - `displaced` - Records of displaced individuals

3. **Category Presence** (`human_category_presence`)
   - Tracks which effect categories have data for each record
   - Automatically updated when effect records are modified

## Field Specifications

### Human Demographic Groups (human_dsg)
- `id` (string): Unique identifier (UUID format)
- `recordId` (string): Reference to disaster record (UUID format, required)
- `sex` (string, optional): 
  - `'m'`: Male
  - `'f'`: Female
  - `'o'`: Other
- `age` (string, optional):
  - `'0-14'`: 0 to 14 years
  - `'15-64'`: 15 to 64 years
  - `'65+'`: 65 years and above
- `disability` (string, optional):
  - `'none'`: No disability
  - `'physical_dwarfism'`
  - `'physical_problems_in_body_functioning'`
  - `'physical_problems_in_body_structures'`
  - `'physical_other_physical_disability'`
  - `'sensorial_visual_impairments_blindness'`
  - `'sensorial_visual_impairments_partial_sight_loss'`
  - `'sensorial_visual_impairments_colour_blindness'`
  - `'sensorial_hearing_impairments_deafness_hard_of_hearing'`
  - `'sensorial_hearing_impairments_deafness_other_hearing_disability'`
  - `'sensorial_other_sensory_impairments'`
  - `'psychosocial'`
  - `'intellectual_cognitive'`
  - `'multiple_deaf_blindness'`
  - `'multiple_other_multiple'`
  - `'others'`
- `globalPovertyLine` (string, optional):
  - `'below'`: Below global poverty line
  - `'above'`: Above global poverty line
- `nationalPovertyLine` (string, optional):
  - `'below'`: Below national poverty line
  - `'above'`: Above national poverty line
- `custom` (object): Additional custom fields in JSON format

### Complete Column Specifications

#### Deaths Table (6 columns)
```typescript
["sex", "age", "disability", "globalPovertyLine", "nationalPovertyLine", "deaths"]
```

#### Injured Table (6 columns)
```typescript
["sex", "age", "disability", "globalPovertyLine", "nationalPovertyLine", "injured"]
```

#### Missing Table (7 columns)
```typescript
["sex", "age", "disability", "globalPovertyLine", "nationalPovertyLine", "missing", "asOf"]
```

#### Affected Table (7 columns)
```typescript
["sex", "age", "disability", "globalPovertyLine", "nationalPovertyLine", "direct", "indirect"]
```

#### Displaced Table (10 columns)
```typescript
["sex", "age", "disability", "globalPovertyLine", "nationalPovertyLine", "assisted", "timing", "duration", "displaced", "asOf"]
```

## API Endpoints

### 1. List Records
Retrieve all human effect records for a specific disaster record and table.

**HTTP Request**
```
GET /api/human-effects/list?recordId={recordId}&table={tableName}
```

**Query Parameters**
- `recordId` (required): The ID of the disaster record (UUID format)
- `table` (required): Name of the effect table (deaths|injured|missing|affected|displaced)

**Response (Success 200)**
```json
{
  "ok": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "dsgId": "550e8400-e29b-41d4-a716-446655440001",
      "sex": "m",
      "age": "15-64",
      "disability": "none",
      "globalPovertyLine": "below",
      "nationalPovertyLine": "above",
      "deaths": 5
    }
  ]
}
```

### 2. Save Records
Create, update, or delete human effect records in a single atomic transaction.

**HTTP Request**
```
POST /api/human-effects/save?recordId={recordId}
```

**Request Body**
```typescript
{
  // Table name (deaths|injured|missing|affected|displaced)
  table: string;
  
  // Array of column names in the order they appear in data arrays
  columns: string[];
  
  data: {
    // Existing records to update (id => values[])
    updates: Record<string, any[]>;
    
    // Array of record IDs to delete
    deletes: string[];
    
    // New records to create (temporaryId => values[])
    // First entry must be the total row with all demographic fields null
    newRows: Record<string, any[]>;
  };
}
```

**Example Request: Create New Records (Affected Table)**
```json
{
  "table": "affected",
  "columns": ["sex", "age", "disability", "globalPovertyLine", "nationalPovertyLine", "direct", "indirect"],
  "data": {
    "newRows": {
      "temp1": [null, null, null, null, null, 150, 300],
      "temp2": ["m", "15-64", "none", "below", null, 80, 150],
      "temp3": ["f", "65+", "physical_problems_in_body_functioning", "above", null, 70, 150]
    }
  }
}
```

**Example Request: Create New Records (Displaced Table)**
```json
{
  "table": "displaced",
  "columns": ["sex", "age", "disability", "globalPovertyLine", "nationalPovertyLine", "assisted", "timing", "duration", "displaced", "asOf"],
  "data": {
    "newRows": {
      "temp1": [null, null, null, null, null, null, null, null, 100, "2025-01-15T12:00:00Z"],
      "temp2": ["m", "15-64", "none", "below", null, "assisted", "pre-emptive", "short", 60, "2025-01-15T12:00:00Z"],
      "temp3": ["f", "0-14", null, null, "below", "not_assisted", "reactive", "medium_short", 40, "2025-01-15T12:00:00Z"]
    }
  }
}
```

**Example Request: Update and Delete Records**
```json
{
  "table": "displaced",
  "columns": ["sex", "age", "disability", "globalPovertyLine", "nationalPovertyLine", "assisted", "timing", "duration", "displaced", "asOf"],
  "data": {
    "updates": {
      "existing-id-1": ["m", "15-64", "none", "below", null, "assisted", "pre-emptive", "short", 50, "2025-01-15T12:00:00Z"]
    },
    "deletes": ["obsolete-id-1", "obsolete-id-2"]
  }
}
```

**Important Notes on Updates**:
- When updating records, you must provide values for all columns in the specified order
- To keep a field's current value, use the existing value in the update array
- The first row in any batch of updates should be the total row (with all demographic fields as null)

**Response (Success 200)**
```json
{
  "ok": true,
  "affectedRows": {
    "created": 2,
    "updated": 1,
    "deleted": 2
  }
}
```

### 3. Clear All Records
Remove all records for a specific table and record ID.

**HTTP Request**
```
POST /api/human-effects/clear?recordId={recordId}&table={tableName}
```

**Query Parameters**
- `recordId` (required): The ID of the disaster record
- `table` (required): Name of the effect table (deaths|injured|missing|affected|displaced)

**Response (Success 200)**
```json
{
  "ok": true,
  "deletedCount": 5
}
```

## Data Validation Rules

### Required Column Specifications
Each table has a specific set of columns that must be provided in the exact order shown in the Complete Column Specifications section above.

### Valid Enum Values

#### Sex (3 values)
- `"m"`: Male
- `"f"`: Female
- `"o"`: Other


#### Age (3 values)
- `"0-14"`: 0 to 14 years
- `"15-64"`: 15 to 64 years
- `"65+"`: 65 years and above

#### Disability (16 specific values)
- `"none"`: No disability
- `"physical_dwarfism"`
- `"physical_problems_in_body_functioning"`
- `"physical_problems_in_body_structures"`
- `"physical_other_physical_disability"`
- `"sensorial_visual_impairments_blindness"`
- `"sensorial_visual_impairments_partial_sight_loss"`
- `"sensorial_visual_impairments_colour_blindness"`
- `"sensorial_hearing_impairments_deafness_hard_of_hearing"`
- `"sensorial_hearing_impairments_deafness_other_hearing_disability"`
- `"sensorial_other_sensory_impairments"`
- `"psychosocial"`
- `"intellectual_cognitive"`
- `"multiple_deaf_blindness"`
- `"multiple_other_multiple"`
- `"others"`

#### Poverty Line Status
- `"below"`: Below the poverty line
- `"above"`: Above the poverty line

#### Displaced-Specific Enums
**Assisted**
- `"assisted"`: Received assistance
- `"not_assisted"`: Did not receive assistance

**Timing**
- `"pre-emptive"`: Evacuated before impact
- `"reactive"`: Evacuated after impact

**Duration**
- `"short"`: First 10 days
- `"medium_short"`: Days 10-30
- `"medium_long"`: Days 30-90
- `"long"`: More than 90 days
- `"permanent"`: Permanently relocated

### Data Type Requirements
- All count fields (`deaths`, `injured`, `missing`, `direct`, `indirect`, `displaced`) must be non-negative integers
- Timestamps (`asOf`) must be in ISO 8601 format (e.g., `"2025-01-15T12:00:00Z"`)
- String fields must match exactly (case-sensitive) to the allowed enum values
- At least one field must be non-null in each record

### First Row Requirements
- The first row in any batch of new or updated records must be the "total" row
- In the total row, all demographic fields (`sex`, `age`, `disability`, `globalPovertyLine`, `nationalPovertyLine`) must be `null`
- The total row is used to store aggregated counts across all demographic groups

### Validation Error Response
If any validation fails, the API will return a 400 status code with details:
```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Detailed error message",
    "details": {
      "field": "field_name",
      "value": "invalid_value",
      "allowedValues": ["list", "of", "valid", "values"]
    }
  }
}
```

## Best Practices

1. **Always Include the Total Row**
   - The first row in any batch should be the total row with all demographic fields as null
   - This ensures proper aggregation of counts across all demographic groups

2. **Use Consistent Demographic Groups**
   - Reuse the same demographic combinations across different effect types when they represent the same population
   - This maintains data consistency and makes cross-analysis easier

3. **Handle Null Values Properly**
   - Use `null` for optional fields rather than omitting them
   - Ensure the total row has all demographic fields as `null`

4. **Batch Operations**
   - Group related updates together in a single request when possible
   - This reduces the number of API calls and ensures data consistency

5. **Error Handling**
   - Always check the response status and handle errors appropriately
   - Use the detailed error information to correct invalid data

## Common Error Messages

#### "Invalid enum value for field 'age': '30-40'"
- **Cause**: The value '30-40' is not a valid age group
- **Solution**: Use one of: '0-14', '15-64', '65+', or null

#### "Missing required column 'globalPovertyLine'"
- **Cause**: The columns array doesn't match the expected schema
- **Solution**: Ensure all required columns are included in the exact order specified in the documentation

#### "First row must be the total row with all demographic fields as null"
- **Cause**: The first row in newRows or updates has non-null demographic fields
- **Solution**: Make sure the first row has all demographic fields (sex, age, disability, etc.) set to null

#### "At least one field must be non-null"
- **Cause**: All fields in a record are null
- **Solution**: Ensure at least one field contains a value in each record

## Sector effects

```
Get a list of sectors
curl -H "X-Auth:$DTS_KEY" "http://localhost:3000/api/sector/list"
4501003

add sector info

curl -H "X-Auth:$DTS_KEY" http://localhost:3000/api/sector-disaster-record-relation/add -d '[{
  "sectorId": "4501003",
  "disasterRecordId": "e9faaa06-0e53-4ba1-b555-d444dbc02dbf",
  "withDamage": true,
  "withDisruption": true,
  "withLosses": true
}]'

add assets
curl -H "X-Auth:$DTS_KEY" http://localhost:3000/api/asset/add -d '[{
  "sectorIds": "4501003",
  "name": "asset name",
  "category": "asset category",
  "nationalId": "example string",
  "notes": "example string"
}]'

add damages
curl -H "X-Auth:$DTS_KEY" http://localhost:3000/api/damage/add -d '[{
  "recordId": "e9faaa06-0e53-4ba1-b555-d444dbc02dbf",
  "sectorId": "4501003",
  "assetId": "06343f93-405b-41ee-903a-42785c76fcf1"
}]'

add disruptions
curl -H "X-Auth:$DTS_KEY" http://localhost:3000/api/disruption/add -d '[{
  "recordId": "e9faaa06-0e53-4ba1-b555-d444dbc02dbf",
  "sectorId": "4501003"
}]'
		
```
