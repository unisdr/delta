-- Custom SQL migration file, put your code below! --
CREATE OR REPLACE FUNCTION dts_get_sector_ancestors_decentants(SECTOR_ID BIGINT) 
RETURNS JSON AS $$
WITH RECURSIVE ParentCTE AS (
    -- Find all ancestors (parents)
    SELECT id, sectorname, parent_id, level
    FROM sector
    WHERE id = SECTOR_ID
    UNION ALL
    SELECT t.id, t.sectorname, t.parent_id, t.level
    FROM sector t
    INNER JOIN ParentCTE p ON t.id = p.parent_id
),
ChildCTE AS (
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
    SELECT id, sectorname, level FROM ParentCTE WHERE level = 2
    UNION
    SELECT id, sectorname, level FROM ChildCTE
) all_records;
$$ LANGUAGE SQL;


