-- Custom SQL migration file, put your code below! --
CREATE OR REPLACE FUNCTION dts_get_sector_decendants(SECTOR_ID BIGINT) 
RETURNS JSON AS $$
WITH RECURSIVE ChildCTE AS (
    -- Find all descendants (children)
    SELECT id, sectorname, parent_id, level
    FROM sector
    WHERE id = SECTOR_ID
    UNION ALL
    SELECT t.id, t.sectorname, t.parent_id, t.level
    FROM sector t
    INNER JOIN ChildCTE c ON t.parent_id = c.id
)
SELECT json_agg(row_to_json(all_records))
FROM (
    SELECT id, sectorname, level FROM ChildCTE
) all_records;
$$ LANGUAGE SQL;


