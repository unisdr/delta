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
	"spatialFootprint": [{"dts_info":{"division_id":74}}]
}]'
```

## Human direct effects
```
curl -H "X-Auth:$DTS_KEY" "http://localhost:3000/api/human-effects/category-presence-save?recordId=e9faaa06-0e53-4ba1-b555-d444dbc02dbf" -d '{
	"table": "Deaths",
	"data": { "deaths": true }
}'

curl -H "X-Auth:$DTS_KEY" "http://localhost:3000/api/human-effects/save?recordId=e9faaa06-0e53-4ba1-b555-d444dbc02dbf" -d '{
	"table":"Deaths",
	"columns":[
		"sex",
		"age",
		"disability",
		"globalPovertyLine",
		"nationalPovertyLine",
		"deaths"
	],
	"data":{
		"updates":{},
		"deletes":[],
		"newRows":{
			"_temp1":[null,null,null,null,null,null,3],
			"_temp2":["m",null,null,null,null,null,1],
			"_temp3":["f",null,null,null,null,null,2]
		}
	}
}'


to delete or update

query first

curl -H "X-Auth:$DTS_KEY" "http://localhost:3000/api/human-effects/list?recordId=e9faaa06-0e53-4ba1-b555-d444dbc02dbf"

get row ids
0849b300-c92e-42a8-8648-3f633b5f558c

curl -H "X-Auth:$DTS_KEY" "http://localhost:3000/api/human-effects/save?recordId=e9faaa06-0e53-4ba1-b555-d444dbc02dbf" -d '{
	"table":"Deaths",
	"columns":[
		"sex",
		"age",
		"disability",
		"globalPovertyLine",
		"nationalPovertyLine",
		"deaths"
	],
	"data":{
		"updates":{
		},
		"deletes":[
			"0849b300-c92e-42a8-8648-3f633b5f558c"
		],
		"newRows":{
			"_temp1":[null,null,null,null,null,null,4]
		}
	}
}'

```

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
