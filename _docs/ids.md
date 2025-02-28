## IDs used for hazardous events, disaster events

## Requirement
Follow this recommendation
https://www.itu.int/itu-t/recommendations/rec.aspx?rec=X.667

ITU-T X.667 (10/2012) Information technology - Procedures for the operation of object identifier registration authorities: Generation of universally unique identifiers and their use in object identifiers

### Which version are we using.
We are using random uuid. This is to allow event ids to be generated on independent instances of dts and then having the records merged or otherwise combined without adjusing the ids.

Version 4 is the code for random uuid.

## Approx chance of collision
https://en.wikipedia.org/wiki/Universally_unique_identifier#Random_UUID_probability_of_duplicates
The probability to find a duplicate within 103 trillion version-4 UUIDs is one in a billion. 

## Implementation
We use gen_random_uuid from postgres. This function returns a version 4 (random) UUID. 
https://www.postgresql.org/docs/current/functions-uuid.html

In the above recommendation
ITU-T X.667 (10/2012), Clause 12.2.2, Table 3
Explicitly lists Version 4 UUIDs as one of the valid UUID versions.

Alternatively the full description is in
15 Setting the fields of a random-number-based UUID

## Example ID returned

83f61f19-9396-4083-927d-68f7863c7463
xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx
timelow-timemid-versionandtimehigh-variantandclockseqhigh_clocseqlow-node

Mxxx
7th octet
VersionAndTimeHigh 0100
	4 as version
Nxxx
VariantAndClockSeqHigh 10xx
	9 should be 8-f
x - random

## Code

```
Definition (drizze schema)
export const eventTable = pgTable("event", {
	id: uuid("id").primaryKey().default(sql`gen_random_uuid()`)

This uses postgres gen_random_uuid function for id generation.
	
```
