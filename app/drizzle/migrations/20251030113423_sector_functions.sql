-- Custom SQL migration file, put your code below! --


DROP FUNCTION IF EXISTS "dts_get_sector_all_idonly";
CREATE FUNCTION "dts_get_sector_all_idonly" (IN "param_sector_id" uuid) RETURNS _uuid LANGUAGE plpgsql AS 'BEGIN
	RETURN ARRAY(
		WITH RECURSIVE ParentCTE AS (
			-- Start from the child node
			SELECT id, sectorname, parent_id
			FROM sector
			WHERE id = param_sector_id

			UNION ALL

			-- Recursively find parents
			SELECT s.id, s.sectorname, s.parent_id
			FROM sector s
			INNER JOIN ParentCTE p ON s.id = p.parent_id
		),
		ChildCTE AS (
			-- Find all descendants (children)
			SELECT id, sectorname, parent_id, level
			FROM sector
			WHERE id = param_sector_id
			UNION ALL
			SELECT t.id, t.sectorname, t.parent_id, t.level
			FROM sector t
			INNER JOIN ChildCTE c ON t.parent_id = c.id
		)
		SELECT *
		FROM (
			SELECT id FROM ParentCTE
			UNION
			SELECT id FROM ChildCTE
		) all_records
	);
END;
';


DROP FUNCTION IF EXISTS "dts_get_sector_children_idonly";
CREATE FUNCTION "dts_get_sector_children_idonly" (IN "param_sector_id" uuid) RETURNS _uuid LANGUAGE plpgsql AS 'BEGIN
	RETURN ARRAY(
		WITH RECURSIVE ChildCTE AS (
			-- Find all descendants (children)
			SELECT id
			FROM sector
			WHERE id = param_sector_id
			UNION ALL
			SELECT t.id
			FROM sector t
			INNER JOIN ChildCTE c ON t.parent_id = c.id
		)
		SELECT id FROM ChildCTE
	);
END;
';


DROP FUNCTION IF EXISTS "dts_get_sector_parent_idonly";
CREATE FUNCTION "dts_get_sector_parent_idonly" (IN "param_sector_id" uuid) RETURNS _uuid LANGUAGE plpgsql AS 'BEGIN
	RETURN ARRAY(
		WITH RECURSIVE ParentCTE AS (
		  -- Start from the child node
		  SELECT id, sectorname, parent_id
		  FROM sector
		  WHERE id = param_sector_id

		  UNION ALL

		  -- Recursively find parents
		  SELECT s.id, s.sectorname, s.parent_id
		  FROM sector s
		  INNER JOIN ParentCTE p ON s.id = p.parent_id
		)
		SELECT id FROM ParentCTE
	);
END;
';