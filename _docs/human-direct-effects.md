# Human direct effects
2025-09-12

## Data storage
Here are a few examples how different data points are stored.

### No custom disaggregations
`sex:m age:65+ injured:100`

This row only has disaggregations that are shared between all tables (One of: sex,age,disability,globalPovertyLine,nationalPovertyLine).

There will be a row with disaggregation values in human_dsg table.
`id:ex1 record_id:x sex:m age:65+`

The injured number will be stored in injured table linking to human_dsg table.
`id:x dsg_id:ex1 injured:100`

### Custom disaggregation.
Using the following as an example:
`custom_flag:t/f`

`sex:m age:65+ injured:100 custom_flag:f`

The custom disaggregation values are stored in json in human_dsg table.

`id:ex1 record_id:x sex:m age:65+ custom:{"custom_flag":"f"}`

### Totals

The totals for each table are stored in two places:

Using this as an example:
`id:ex1 record_id:x injured:100`

It will be stored as a row in disaggregation table with all fields set to null.

But we also store a copy of this value in human_category_presence table for easier querying.

## Querying data
If you are only interested in totals it's better to use human_category_presence table, since the query is simpler and faster.

```
select
	dr.id,
	hcp.deaths,
	hcp.deaths_total,
	hcp.injured,
	hcp.injured_total 
from human_category_presence hcp
join disaster_records dr on dr.id = hcp.record_id
join disaster_event de on de.id = dr.disaster_event_id 
```

If you need to show data by a disaggregation, you will have to use the source tables. Here is an example where the data is disaggregated by sex, ignoring rows which have any other fields set. We also need to check that custom fields are not set.

```
SELECT
	hd.sex,
	SUM(d.deaths)
FROM human_category_presence hcp
JOIN human_dsg hd ON hcp.record_id = hd.record_id
JOIN deaths d ON hd.id = d.dsg_id
JOIN disaster_records dr ON dr.id = hcp.record_id
JOIN disaster_event de ON de.id = dr.disaster_event_id 
WHERE hcp.deaths IS TRUE
	AND hd.sex IS NOT NULL
	AND hd.age IS NULL
	AND hd.disability IS NULL
	AND hd.global_poverty_line IS NULL
	AND hd.national_poverty_line IS NULL
	AND (hd.custom IS NULL
		OR hd.custom = '{}'::jsonb
		OR (
			SELECT COUNT(*)
			FROM jsonb_each(hd.custom)
			WHERE jsonb_typeof(value) != 'null'
		) = 0
	)
GROUP BY hd.sex
```
