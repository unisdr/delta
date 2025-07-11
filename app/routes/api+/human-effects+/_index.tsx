import { authLoaderWithPerm } from "~/util/auth";

export const loader = authLoaderWithPerm("ViewApiDocs", async () => {
  const docs = `
# Human Effects API

## Base URL
\`\`\`
GET|POST /api/human-effects/{action}?recordId={recordId}
\`\`\`

## Authentication
Include your API key in the \`X-Auth\` header:
\`\`\`
X-Auth: YOUR_API_KEY
\`\`\`

## Database Schema

### Tables Overview

1. **Human Demographic Groups** (\`human_dsg\`)
   - Core demographic information linked to all effect tables
   - Each record represents a unique demographic segment

2. **Effect Tables**
   - \`deaths\` - Records of fatalities
   - \`injured\` - Records of injuries
   - \`missing\` - Records of missing persons
   - \`affected\` - Records of affected individuals (direct and indirect)
   - \`displaced\` - Records of displaced individuals

3. **Category Presence** (\`human_category_presence\`)
   - Tracks which effect categories have data for each record
   - Automatically updated when effect records are modified

## Field Specifications

### Human Demographic Groups (human_dsg)
- \`id\` (string): Unique identifier (UUID format)
- \`recordId\` (string): Reference to disaster record (UUID format, required)
- \`sex\` (string, optional): 
  - \`'m'\`: Male
  - \`'f'\`: Female
  - \`'o'\`: Other
- \`age\` (string, optional):
  - \`'0-14'\`: 0 to 14 years
  - \`'15-64'\`: 15 to 64 years
  - \`'65+'\`: 65 years and above
- \`disability\` (string, optional):
  - \`'none'\`: No disability
  - \`'physical_dwarfism'\`
  - \`'physical_problems_in_body_functioning'\`
  - \`'physical_problems_in_body_structures'\`
  - \`'physical_other_physical_disability'\`
  - \`'sensorial_visual_impairments_blindness'\`
  - \`'sensorial_visual_impairments_partial_sight_loss'\`
  - \`'sensorial_visual_impairments_colour_blindness'\`
  - \`'sensorial_hearing_impairments_deafness_hard_of_hearing'\`
  - \`'sensorial_hearing_impairments_deafness_other_hearing_disability'\`
  - \`'sensorial_other_sensory_impairments'\`
  - \`'psychosocial'\`
  - \`'intellectual_cognitive'\`
  - \`'multiple_deaf_blindness'\`
  - \`'multiple_other_multiple'\`
  - \`'others'\`
- \`globalPovertyLine\` (string, optional):
  - \`'below'\`: Below global poverty line
  - \`'above'\`: Above global poverty line
- \`nationalPovertyLine\` (string, optional):
  - \`'below'\`: Below national poverty line
  - \`'above'\`: Above national poverty line
- \`custom\` (object): Additional custom fields in JSON format

### Effect Tables

#### Common Fields
- \`id\` (UUID): Unique identifier
- \`dsgId\` (UUID): Reference to demographic group (required)

#### Deaths
- \`deaths\` (integer): Number of deaths

#### Injured
- \`injured\` (integer): Number of injured

#### Missing
- \`missing\` (integer): Number of missing persons
- \`asOf\` (timestamp): Timestamp when the count was recorded

#### Affected
- \`direct\` (integer): Number of directly affected
- \`indirect\` (integer): Number of indirectly affected

#### Displaced
- \`displaced\` (integer): Number of displaced
- \`asOf\` (timestamp): Timestamp when the count was recorded
- \`assisted\` (enum):
  - \`assisted\`: Received assistance
  - \`not_assisted\`: Did not receive assistance
- \`timing\` (enum):
  - \`pre-emptive\`: Evacuated before impact
  - \`reactive\`: Evacuated after impact
- \`duration\` (enum):
  - \`short\`: First 10 days
  - \`medium_short\`: Days 10-30
  - \`medium_long\`: Days 30-90
  - \`long\`: More than 90 days
  - \`permanent\`: Permanently relocated

### Category Presence (human_category_presence)
- \`id\` (UUID): Unique identifier
- \`recordId\` (UUID): Reference to disaster record (required)
- \`deaths\` (boolean): Presence of death records
- \`injured\` (boolean): Presence of injured records
- \`missing\` (boolean): Presence of missing persons records
- \`affectedDirect\` (boolean): Presence of directly affected records
- \`affectedIndirect\` (boolean): Presence of indirectly affected records
- \`displaced\` (boolean): Presence of displaced records

## Data Flow and Relationships

### DSG (Demographic) Relationship
Each effect record (deaths, injured, etc.) is linked to a demographic group (DSG) via \`dsgId\`. The flow works as follows:

1. **Creating Records**:
   - When creating new records, the system automatically creates a corresponding DSG record if one doesn't exist
   - The \`dsgId\` is generated and returned in the response
   - Subsequent operations can use this \`dsgId\` to reference the demographic group

2. **Linking Records**:
   - All effect records with the same demographic attributes share the same \`dsgId\`
   - The \`human_category_presence\` table tracks which effect types exist for each demographic group

### Complete Workflow Example

1. **Create Demographic Group** (happens automatically when creating first effect):
   \`\`\`json
   {
     "sex": "m",
     "age": "15-64",
     "disability": "none",
     "globalPovertyLine": "below",
     "nationalPovertyLine": null
   }
   \`\`\`
   Returns: \`{ "dsgId": "550e8400-e29b-41d4-a716-446655440001" }\`

   **Note**: All demographic fields are optional, but at least one must be provided. The system will automatically create a demographic group with the provided attributes.

2. **Create Effect Records** using the returned \`dsgId\`

## API Standards

### HTTP Status Codes
- \`200 OK\`: Request succeeded
- \`201 Created\`: Resource created successfully
- \`400 Bad Request\`: Invalid input data
- \`401 Unauthorized\`: Missing or invalid API key
- \`403 Forbidden\`: Insufficient permissions
- \`404 Not Found\`: Resource not found
- \`429 Too Many Requests\`: Rate limit exceeded
- \`500 Internal Server Error\`: Server error

### Rate Limiting
- 100 requests per minute per API key
- Exceeding the limit returns 429 status
- Check \`X-RateLimit-Limit\` and \`X-RateLimit-Remaining\` headers

## API Endpoints

### 1. List Records
Retrieve all human effect records for a specific disaster record and table.

**HTTP Request**
\`\`\`
GET /api/human-effects/list?recordId={recordId}&table={tableName}
\`\`\`

**Query Parameters**
- \`recordId\` (required): The ID of the disaster record
- \`table\` (required): Name of the effect table (deaths|injured|missing|affected|displaced)

**Response (Success 200)**
\`\`\`json
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
\`\`\`

**Response (Error 400)**
\`\`\`json
{
  "ok": false,
  "error": "Missing required parameter: recordId"
}
\`\`\`

### 2. Save Records
Create, update, or delete human effect records in a single atomic transaction.

**HTTP Request**
\`\`\`
POST /api/human-effects/save?recordId={recordId}
\`\`\`

**Request Body**
\`\`\`typescript
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
\`\`\`

**Example Request: Create New Records (Affected Table)**
\`\`\`json
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
\`\`\`

**Example Request: Create New Records (Displaced Table)**
\`\`\`json
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
\`\`\`

**Example Request: Update and Delete Records**
\`\`\`json
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
\`\`\`

**Important Notes on Updates**:
- When updating records, you must provide values for all columns in the specified order
- To keep a field's current value, use the existing value in the update array
- The first row in any batch of updates should be the total row (with all demographic fields as null)

**Response (Success 200)**
\`\`\`json
{
  "ok": true,
  "affectedRows": {
    "created": 2,
    "updated": 1,
    "deleted": 2
  }
}
\`\`\`

### 3. Clear All Records
Remove all records for a specific table and record ID.

**HTTP Request**
\`\`\`
POST /api/human-effects/clear?recordId={recordId}&table={tableName}
\`\`\`

**Query Parameters**
- \`recordId\` (required): The ID of the disaster record
- \`table\` (required): Name of the effect table (deaths|injured|missing|affected|displaced)

**Response (Success 200)**
\`\`\`json
{
  "ok": true,
  "deletedCount": 5
}
\`\`\`

## Data Validation Rules

### Required Column Specifications
Each table has a specific set of columns that must be provided in the exact order shown:

#### Deaths Table (6 columns total)
\`\`\`typescript
["sex", "age", "disability", "globalPovertyLine", "nationalPovertyLine", "deaths"]
\`\`\`

#### Injured Table (6 columns total)
\`\`\`typescript
["sex", "age", "disability", "globalPovertyLine", "nationalPovertyLine", "injured"]
\`\`\`

#### Missing Table (7 columns total)
\`\`\`typescript
["sex", "age", "disability", "globalPovertyLine", "nationalPovertyLine", "missing", "asOf"]
\`\`\`

#### Affected Table (7 columns total)
\`\`\`typescript
["sex", "age", "disability", "globalPovertyLine", "nationalPovertyLine", "direct", "indirect"]
\`\`\`

#### Displaced Table (10 columns total)
\`\`\`typescript
["sex", "age", "disability", "globalPovertyLine", "nationalPovertyLine", "assisted", "timing", "duration", "displaced", "asOf"]
\`\`\`

### Valid Enum Values

#### Sex (3 values)
- \`"m"\`: Male
- \`"f"\`: Female
- \`"o"\`: Other
- \`null\`: Not specified

#### Age (3 values)
- \`"0-14"\`: 0 to 14 years
- \`"15-64"\`: 15 to 64 years
- \`"65+"\`: 65 years and above
- \`null\`: Not specified

#### Disability (16 specific values)
- \`"none"\`: No disability
- \`"physical_dwarfism"\`
- \`"physical_problems_in_body_functioning"\`
- \`"physical_problems_in_body_structures"\`
- \`"physical_other_physical_disability"\`
- \`"sensorial_visual_impairments_blindness"\`
- \`"sensorial_visual_impairments_partial_sight_loss"\`
- \`"sensorial_visual_impairments_colour_blindness"\`
- \`"sensorial_hearing_impairments_deafness_hard_of_hearing"\`
- \`"sensorial_hearing_impairments_deafness_other_hearing_disability"\`
- \`"sensorial_other_sensory_impairments"\`
- \`"psychosocial"\`
- \`"intellectual_cognitive"\`
- \`"multiple_deaf_blindness"\`
- \`"multiple_other_multiple"\`
- \`"others"\`
- \`null\`: Not specified

#### Poverty Line Status
- \`"below"\`: Below the poverty line
- \`"above"\`: Above the poverty line
- \`null\`: Not specified

#### Displaced-Specific Enums
**Assisted**
- \`"assisted"\`: Received assistance
- \`"not_assisted"\`: Did not receive assistance
- \`null\`: Not specified

**Timing**
- \`"pre-emptive"\`: Evacuated before impact
- \`"reactive"\`: Evacuated after impact
- \`null\`: Not specified

**Duration**
- \`"short"\`: First 10 days
- \`"medium_short"\`: Days 10-30
- \`"medium_long"\`: Days 30-90
- \`"long"\`: More than 90 days
- \`"permanent"\`: Permanently relocated
- \`null\`: Not specified

### Data Type Requirements
- All count fields (\`deaths\`, \`injured\`, \`missing\`, \`direct\`, \`indirect\`, \`displaced\`) must be non-negative integers
- Timestamps (\`asOf\`) must be in ISO 8601 format (e.g., \`"2025-01-15T12:00:00Z"\`)
- String fields must match exactly (case-sensitive) to the allowed enum values
- At least one field must be non-null in each record

### First Row Requirements
- The first row in any batch of new or updated records must be the "total" row
- In the total row, all demographic fields (\`sex\`, \`age\`, \`disability\`, \`globalPovertyLine\`, \`nationalPovertyLine\`) must be \`null\`
- The total row is used to store aggregated counts across all demographic groups

### Validation Error Response
If any validation fails, the API will return a 400 status code with details:
\`\`\`json
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
\`\`\`

## Best Practices

1. **Always Include the Total Row**
   - The first row in any batch should be the total row with all demographic fields as null
   - This ensures proper aggregation of counts across all demographic groups

2. **Use Consistent Demographic Groups**
   - Reuse the same demographic combinations across different effect types when they represent the same population
   - This maintains data consistency and makes cross-analysis easier

3. **Handle Null Values Properly**
   - Use \`null\` for optional fields rather than omitting them
   - Ensure the total row has all demographic fields as \`null\`

4. **Batch Operations**
   - Group related updates together in a single request when possible
   - This reduces the number of API calls and ensures data consistency

5. **Error Handling**
   - Always check the response status and handle errors appropriately
   - Use the detailed error information to correct invalid data

## Common Pitfalls

1. **Incorrect Column Order**
   - Ensure the columns array matches the order of values in the data arrays exactly
   - Mismatched columns will lead to data corruption

2. **Missing Total Row**
   - Forgetting to include the total row as the first entry can cause issues with data aggregation

3. **Invalid Enum Values**
   - Always use the exact string values specified in the documentation
   - The API is case-sensitive and will reject unknown values

4. **Incomplete Updates**
   - When updating records, you must include all columns in the specified order
   - Missing columns will be treated as null values, which may overwrite existing data

5. **Timestamp Format**
   - Always use ISO 8601 format for timestamps
   - Example: \`"2025-01-15T12:00:00Z"\`

## Example: Complete Workflow

1. **Create Initial Records**
   \`\`\`json
   {
     "table": "deaths",
     "columns": ["sex", "age", "disability", "globalPovertyLine", "nationalPovertyLine", "deaths"],
     "data": {
       "newRows": {
         "temp1": [null, null, null, null, null, 100],
         "temp2": ["m", "15-64", "none", "below", null, 60],
         "temp3": ["f", "65+", "physical_problems_in_body_functioning", "above", null, 40]
       }
     }
   }
   \`\`\`

2. **Update Existing Records**
   \`\`\`json
   {
     "table": "deaths",
     "columns": ["sex", "age", "disability", "globalPovertyLine", "nationalPovertyLine", "deaths"],
     "data": {
       "updates": {
         "existing-id-1": [null, null, null, null, null, 120],
         "existing-id-2": ["m", "15-64", "none", "below", null, 70]
       },
       "deletes": ["obsolete-id-1"]
     }
   }
   \`\`\`

3. **Query Records**
   \`\`\`
   GET /api/human-effects/list?recordId=12345&table=deaths
   \`\`\`

4. **Clear All Records**
   \`\`\`
   POST /api/human-effects/clear?recordId=12345&table=deaths
   \`\`\`

## Troubleshooting

### Common Error Messages

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

### Getting Help
If you encounter any issues not covered in this documentation, please provide:
1. The exact request that caused the error
2. The complete error response
3. Any relevant request headers

Contact the API support team with this information for assistance.

1. **Required Fields**
   - All effect tables require a valid \`dsgId\`
   - Metric fields (deaths, injured, etc.) must be non-negative integers
   - Timestamps must be in ISO 8601 format

2. **Enum Validation**
   - \`sex\`: Must be one of [m, f, o]
   - \`age\`: Must be one of [0-14, 15-64, 65+]
   - \`disability\`: Must be a valid disability enum value
   - \`assisted\`: Must be one of [assisted, not_assisted]
   - \`timing\`: Must be one of [pre-emptive, reactive]
   - \`duration\`: Must be one of [short, medium_short, medium_long, long, permanent]

3. **Business Rules**
   - The sum of demographic breakdowns must match the total row
   - Timestamps must be in the past or present, not future
   - Deletion is only allowed for records belonging to the specified recordId

## Error Handling

All error responses include an \`ok: false\` flag and an \`error\` message.

**Common Error Responses**

- \`400 Bad Request\`: Invalid input parameters or data
- \`401 Unauthorized\`: Missing or invalid API key
- \`403 Forbidden\`: Insufficient permissions
- \`404 Not Found\`: Record or table not found
- \`500 Internal Server Error\`: Server-side error

### 1. List Records
Get all human effect records for a specific disaster record.

**Request:**
\`\`\`bash
curl -H "X-Auth:YOUR_API_KEY" \
  "https://dts-testing.undrr.org/api/human-effects/list?recordId=RECORD_ID&table=TABLE_NAME"
\`\`\`

**Response:**
\`\`\`json
{
  "ok": true,
  "data": [
    {
      "id": "record-id-1",
      "sex": "m",
      "age": null,
      "disability": null,
      "globalPovertyLine": null,
      "nationalPovertyLine": null,
      "deaths": 1
    }
  ]
}
\`\`\`

### 2. Save Records
Create, update, or delete human effect records.

**Request Structure:**
\`\`\`typescript
{
  table: string;           // Table name (e.g., "Deaths", "Injured")
  columns: string[];       // Array of column names in the order they appear in data arrays
  data: {
    updates: {             // Existing records to update
      [id: string]: any[];  // Record ID mapped to array of values
    };
    deletes: string[];     // Array of record IDs to delete
    newRows: {             // New records to create
      [tempId: string]: any[]; // Temporary ID mapped to array of values
    };
  };
}
\`\`\`

**Important Note on newRows:**
- The first entry in \`newRows\` should be the total row with all demographic fields set to \`null\`
- The total row's metric value should match the sum of all other rows' metrics
- Each subsequent row should specify demographic breakdowns
- The order of values in each array must match the order in the \`columns\` array

**Example Request:**
\`\`\`bash
curl -X POST \
  -H "X-Auth:YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  "https://dts-testing.undrr.org/api/human-effects/save?recordId=RECORD_ID" \
  -d '{
    "table": "Deaths",
    "columns": [
      "sex",
      "age",
      "disability",
      "globalPovertyLine",
      "nationalPovertyLine",
      "deaths"
    ],
    "data": {
      "updates": {
        "existing-record-id": ["m", "15-64", "none", "below", null, 2]
      },
      "deletes": ["record-id-to-delete"],
      "newRows": {
        "temp1": [null, null, null, null, null, 20],  // Total row (all nulls except metric)
        "temp2": ["m", "15-64", null, null, null, 12],
        "temp3": ["f", "65+", null, null, null, 8]
      }
    }
  }'
\`\`\`

**Response (Success):**
\`\`\`json
{
  "ok": true
}
\`\`\`

**Response (Error):**
\`\`\`json
{
  "ok": false,
  "error": "Error message"
}
\`\`\`

### 3. Clear All Records
Remove all records for a specific table and record ID.

**Request:**
\`\`\`bash
curl -X POST \
  -H "X-Auth:YOUR_API_KEY" \
  "https://dts-testing.undrr.org/api/human-effects/clear?recordId=RECORD_ID&table=TABLE_NAME"
\`\`\`

## Examples

### Example 1: Add New Records
\`\`\`bash
curl -X POST \
  -H "X-Auth:YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  "https://dts-testing.undrr.org/api/human-effects/save?recordId=RECORD_ID" \
  -d '{
    "table": "Deaths",
    "columns": ["sex", "age", "disability", "globalPovertyLine", "nationalPovertyLine", "deaths"],
    "data": {
      "newRows": {
        "_temp1": ["m", "15-64", 2],
        "_temp2": ["f", "65+", 1]
      }
    }
  }'
\`\`\`

### Example 2: Update Existing Records
\`\`\`bash
curl -X POST \
  -H "X-Auth:YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  "https://dts-testing.undrr.org/api/human-effects/save?recordId=RECORD_ID" \
  -d '{
    "table": "Injured",
    "columns": ["sex", "age", "injured"],
    "data": {
      "updates": {
        "existing-id-1": ["m", "15-64", 5],
        "existing-id-2": ["f", "65+", 3]
      }
    }
  }'
\`\`\`
`;

  return new Response(docs, {
    status: 200,
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
});