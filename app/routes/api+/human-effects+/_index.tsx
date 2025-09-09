import { authLoaderWithPerm } from "~/util/auth";

export const loader = authLoaderWithPerm("ViewApiDocs", async () => {
	let docs = `
# Human Effects API

## Authentication
All API endpoints require authentication using an API key secret in the X-Auth header:

    X-Auth: your-api-key-secret

API keys must be created by an administrator and are linked to a specific country instance. The API key must have access to the country instance that owns the disaster record being accessed.

### Important Authentication Notes
- Use the API key secret in the X-Auth header, not the key ID
- The API key is validated against the database and must be active
- The API key must be associated with the country instance that owns the disaster record
- All endpoints (list, save, clear, category-presence-save) support API key authentication
- If authentication fails, a 401 Unauthorized response will be returned
- If the API key doesn't have access to the disaster record, a 403 Forbidden response will be returned

### Example API Key Acquisition
API keys must be obtained from an administrator. They are linked to specific users and country instances.

## Table-Specific Field Structures

Each table has a unique field structure optimized for its specific data requirements:

### Deaths Table
Fields : \`[sex, age, disability, globalPovertyLine, nationalPovertyLine, deaths]\`

### Injured Table  
 Fields : \`[sex, age, disability, globalPovertyLine, nationalPovertyLine, injured]\`

### Missing Table
 Fields : \`[sex, age, disability, globalPovertyLine, nationalPovertyLine, asOf, missing]\`
 Note : Missing table includes an \`asOf\` date field for tracking when people went missing.

### Affected Table
 Fields : \`[sex, age, disability, globalPovertyLine, nationalPovertyLine, direct, indirect]\`
 Note : Affected table has TWO metric fields: \`direct\` (Directly Affected) and \`indirect\` (Indirectly Affected).

### Displaced Table
 Fields : \`[sex, age, disability, globalPovertyLine, nationalPovertyLine, assisted, timing, duration, asOf, displaced]\`
 Note : Displaced table has additional dimension fields for displacement characteristics and an \`asOf\` date field.

## Data Entry Pattern - Total First Structure

 Important : All tables follow a specific data entry pattern where the total row must be entered first, followed by disaggregated data.

### Universal Pattern
\`\`\`json
{
  "newRows": {
    "_temp1": [null, null, null, ..., TOTAL_VALUE],     // TOTAL ROW (all dimensions null)
    "_temp2": [sex, age, disability, ..., COUNT_1],     // DISAGGREGATION 1
    "_temp3": [sex, age, disability, ..., COUNT_2],     // DISAGGREGATION 2
    // ... more disaggregations
  }
}
\`\`\`

### Pattern Rules
1.  Total row first : Always use \`null\` values for all dimension fields
2.  Disaggregations follow : Specific demographic breakdowns
3.  Math integrity : Sum of disaggregations should equal total
4.  Consistent dates : Use same date for all rows in tables with date fields

## List Human Effects Data
GET /api/human-effects/list?recordId={DISASTER_RECORD_UUID}&table=[TABLE]

Where [TABLE] can be one of: Deaths, Injured, Missing, Affected, Displaced

### Example Request

    curl -X GET "http://localhost:3000/api/human-effects/list?recordId={DISASTER_RECORD_UUID}&table=Deaths" \\
      -H "X-Auth: {YOUR_API_KEY_SECRET}"

### Actual Response Structure

    {
      "tblId": "Deaths",
      "tbl": {"id": "Deaths", "label": "Deaths"},
      "recordId": "{DISASTER_RECORD_UUID}",
      "defs": [
        {
          "uiName": "Sex",
          "jsName": "sex", 
          "dbName": "sex",
          "uiColWidth": 100,
          "format": "enum",
          "role": "dimension",
          "data": [
            {"key": "m", "label": "M-Male"},
            {"key": "f", "label": "F-Female"},
            {"key": "o", "label": "O-Other Non-binary"}
          ],
          "shared": true
        }
        // ... more field definitions
      ],
      "ids": ["uuid1", "uuid2", "uuid3"],
      "data": [
        [null, null, null, null, null, 8],
        ["f", "0-14", "physical_dwarfism", "below", "below", 2],
        ["f", "65+", "none", "above", "above", 1],
        ["m", "65+", "none", "below", "below", 2]
      ],
      "categoryPresence": {"deaths": true},
      "totalGroup": [ "sex", "age" ]
    }

### Response Fields Explained
-  \`defs\` : Field definitions including UI names, data types, and available enum options
-  \`ids\` : UUIDs for each record (same order as data array) 
-  \`data\` : Actual records as arrays following the field order from defs. First row with null dimensions is the total.
-  \`categoryPresence\` : Shows which categories are enabled for this disaster record
-  \`totalGroup\` : Identify if record is automatically calculated total (null if manually calculated total).

## Save Human Effects Data
POST /api/human-effects/save?recordId={DISASTER_RECORD_UUID}

### Example Request

    curl -X POST "http://localhost:3000/api/human-effects/save?recordId={DISASTER_RECORD_UUID}" \\
      -H "X-Auth: {YOUR_API_KEY_SECRET}" \\
      -H "Content-Type: application/json" \\
      -d '{
        "table": "Deaths",
        "columns": ["sex", "age", "disability", "globalPovertyLine", "nationalPovertyLine", "deaths"],
        "data": {
          "newRows": {
            "_temp1": [null, null, null, null, null, 8],
            "_temp2": ["o", "0-14", null, null, null, 1],
						"_temp3": ["o", "15-64", null, null, null, 1],
						"_temp4": ["o", "65+", null, null, null, 1]
          },
          "updates": {
            "existing-uuid": ["f", "0-14", "none", "below", "below", 6]
          },
          "deletes": ["uuid-to-delete"]
        }
      }'

### Success Response

    {
      "ok": true
    }

### Validation Error Response

    {
      "ok": false,
      "errors": [
        {
          "code": "duplicate_dimension",
          "message": "Two or more rows have the same disaggregation values.",
          "rowId": "_temp1"
        }
      ]
    }
    
### Important Notes for Save Endpoint
-  Follow total-first pattern : First row must have null dimensions and contain total value
- The columns array must exactly match the expected columns for the table type
- Column values must use valid enum values as shown in the list endpoint response
- Array values must match the exact order specified in columns
- Cannot save records with identical dimension combinations (duplicate prevention)
- Use existing record UUIDs from the \`ids\` array for updates
- The recordId must belong to the country instance associated with the API key

## Clear Human Effects Data
POST /api/human-effects/clear?recordId={DISASTER_RECORD_UUID}&table=[TABLE]

Where [TABLE] can be one of: Deaths, Injured, Missing, Affected, Displaced

### Example Request

    curl -X POST "http://localhost:3000/api/human-effects/clear?recordId={DISASTER_RECORD_UUID}&table=Deaths" \\
      -H "X-Auth: {YOUR_API_KEY_SECRET}"

### Example Response

    {
      "ok": true
    }

 Effect : Removes ALL data from the specified table for the given disaster record.

## Set Category Presence
POST /api/human-effects/category-presence-save?recordId={DISASTER_RECORD_UUID}

### Example Request

    curl -X POST "http://localhost:3000/api/human-effects/category-presence-save?recordId={DISASTER_RECORD_UUID}" \\
      -H "X-Auth: {YOUR_API_KEY_SECRET}" \\
      -H "Content-Type: application/json" \\
      -d '{
        "table": "Deaths",
        "data": {
          "deaths": true,
          "injured": true,
          "missing": false,
          "affected": true,
          "displaced": false
        }
      }'

### Example Response

    {
      "ok": true
    }
    
### Important Notes for Category Presence
- The table field must be specified
- The data object contains boolean flags for each category
- Can enable/disable multiple categories in a single request

## Set the total to auto-calculated group  

POST /api/human-effects/category-presence-save?recordId={DISASTER_RECORD_UUID}

### Example Request

    curl -X POST "http://localhost:3000/api/human-effects/category-presence-save?recordId={DISASTER_RECORD_UUID}" \\
      -H "X-Auth: {YOUR_API_KEY_SECRET}" \\
      -H "Content-Type: application/json" \\
      -d '{
        "table": "Deaths",
        "data": {
          "totalGroupFlags": ["sex","age"]
        }
      }'

### Example Response

    {
      "ok": true
    }


## Field Value References

### Common Dimension Fields (All Tables)

#### Sex Options
- \`m\`: M-Male
- \`f\`: F-Female  
- \`o\`: O-Other Non-binary

#### Age Groups
- \`0-14\`: Children, (0-14)
- \`15-64\`: Adult, (15-64)
- \`65+\`: Elder (65-)

#### Poverty Line Status
- \`below\`: Below
- \`above\`: Above

#### Disability Categories
- \`none\`: No disabilities
- \`physical_dwarfism\`: Physical, dwarfism
- \`physical_problems_in_body_functioning\`: Physical, Problems in body functioning
- \`physical_problems_in_body_structures\`: Physical, Problems in body structures
- \`physical_other_physical_disability\`: Physical, Other physical disability
- \`sensorial_visual_impairments_blindness\`: Sensorial, visual impairments, blindness
- \`sensorial_visual_impairments_partial_sight_loss\`: Sensorial, visual impairments, partial sight loss
- \`sensorial_visual_impairments_colour_blindness\`: Sensorial, visual impairments, colour blindness
- \`sensorial_hearing_impairments_deafness_hard_of_hearing\`: Sensorial, Hearing impairments, Deafness, hard of hearing
- \`sensorial_hearing_impairments_deafness_other_hearing_disability\`: Sensorial, Hearing impairments, Deafness, other hearing disability
- \`sensorial_other_sensory_impairments\`: Sensorial, other sensory impairments
- \`psychosocial\`: Psychosocial
- \`intellectual_cognitive\`: Intellectual/ Cognitive
- \`multiple_deaf_blindness\`: Multiple, Deaf blindness
- \`multiple_other_multiple\`: Multiple, other multiple
- \`others\`: Others

### Displaced-Specific Fields

#### Assistance Status
- \`assisted\`: Assisted
- \`not_assisted\`: Not Assisted

#### Displacement Timing
- \`pre-emptive\`: Pre-emptive
- \`reactive\`: Reactive

#### Displacement Duration  
- \`short\`: Short Term
- \`medium_short\`: Medium Short Term
- \`medium_long\`: Medium Long Term
- \`long\`: Long Term
- \`permanent\`: Permanent

### Date Fields
For Missing and Displaced tables, use ISO date format: \`"2024-01-15"\`

## Error Responses

### Authentication Errors
If authentication fails, endpoints will return a 401 Unauthorized status code:

    {
      "message": "Unauthorized access",
      "status": 401
    }

### Permission Errors
If the API key doesn't have access to the requested disaster record:

    {
      "message": "Unauthorized access: API key not authorized for this disaster record",
      "status": 403
    }
    
### Validation Errors
If the request format is invalid or contains duplicate dimension combinations:

    {
      "ok": false,
      "errors": [
        {
          "code": "duplicate_dimension",
          "message": "Two or more rows have the same disaggregation values.",
          "rowId": "_temp1"
        }
      ]
    }

## Table-Specific Request Examples

### Deaths Table Example
{
	"table": "Deaths",
	"columns": ["sex", "age", "disability", "globalPovertyLine", "nationalPovertyLine", "deaths"],
	"data": {
		"newRows": {
			"_temp1": [null, null, null, null, null, 8],
			"_temp2": ["f", "0-14", "none", "below", "below", 3],
			"_temp3": ["m", "0-14", "none", "below", "below", 2],
			"_temp4": ["f", "15-64", "none", "above", "above", 2],
			"_temp5": ["m", "65+", "physical_dwarfism", "above", "above", 1]
		},
		"updates": {},
		"deletes": []
	}
}



### Injured Table Example
{
	"table": "Injured",
	"columns": ["sex", "age", "disability", "globalPovertyLine", "nationalPovertyLine", "injured"],
	"data": {
		"newRows": {
			"_temp1": [null, null, null, null, null, 15],
			"_temp2": ["f", "15-64", "none", "below", "below", 6],
			"_temp3": ["m", "15-64", "none", "above", "above", 4],
			"_temp4": ["f", "0-14", "none", "below", "below", 3],
			"_temp5": ["m", "65+", "psychosocial", "above", "above", 2]
		},
		"updates": {},
		"deletes": []
	}
}



### Missing Table Example
{
	"table": "Missing",
	"columns": ["sex", "age", "disability", "globalPovertyLine", "nationalPovertyLine", "asOf", "missing"],
	"data": {
		"newRows": {
			"_temp1": [null, null, null, null, null, "2024-01-15", 5],
			"_temp2": ["f", "15-64", "none", "above", "above", "2024-01-15", 3],
			"_temp3": ["m", "0-14", "none", "below", "below", "2024-01-15", 2]
		},
		"updates": {},
		"deletes": []
	}
}



### Affected Table Example
{
	"table": "Affected",
	"columns": ["sex", "age", "disability", "globalPovertyLine", "nationalPovertyLine", "direct", "indirect"],
	"data": {
		"newRows": {
			"_temp1": [null, null, null, null, null, 120, 60],
			"_temp2": ["f", "15-64", "none", "below", "below", 50, 25],
			"_temp3": ["m", "15-64", "none", "above", "above", 40, 20],
			"_temp4": ["f", "0-14", "none", "below", "below", 20, 10],
			"_temp5": ["m", "0-14", "none", "above", "above", 10, 5]
		},
		"updates": {},
		"deletes": []
	}
}



### Displaced Table Example
{
	"table": "Displaced",
	"columns": ["sex", "age", "disability", "globalPovertyLine", "nationalPovertyLine", "assisted", "timing", "duration", "asOf", "displaced"],
	"data": {
		"newRows": {
			"_temp1": [null, null, null, null, null, null, null, null, "2024-01-20", 25],
			"_temp2": ["f", "15-64", "none", "below", "below", "assisted", "pre-emptive", "short", "2024-01-20", 10],
			"_temp3": ["m", "15-64", "none", "above", "above", "not_assisted", "reactive", "medium_short", "2024-01-20", 8],
			"_temp4": ["f", "0-14", "none", "below", "below", "assisted", "pre-emptive", "short", "2024-01-20", 5],
			"_temp5": ["m", "65+", "none", "above", "above", "not_assisted", "reactive", "long", "2024-01-20", 2]
		},
		"updates": {},
		"deletes": []
	}
}

`
	return new Response(docs, {
		status: 200,
		headers: { "Content-Type": "text/plain" },
	});
});