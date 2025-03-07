/**
 * Geographic database utilities
 * Provides functions for database operations related to geographic data
 */
import { SQL, sql } from 'drizzle-orm';
import { divisionTable } from '~/drizzle/schema';
import { dr, Tx } from '~/db.server';
import { createLogger } from '~/utils/logger';

const logger = createLogger('geoDatabase');

/**
 * Verifies that PostgreSQL triggers for referential integrity exist
 * @param tx - Database transaction
 * @returns Promise resolving to boolean indicating if all triggers exist
 */
export async function verifyTriggerExistence(tx: Tx): Promise<boolean> {
  const requiredTriggers = [
    'RI_ConstraintTrigger_a_137728', // AFTER DELETE
    'RI_ConstraintTrigger_a_137729', // AFTER UPDATE
    'RI_ConstraintTrigger_c_137730', // AFTER INSERT
    'RI_ConstraintTrigger_c_137731'  // AFTER UPDATE
  ];
  
  const query = sql`
    SELECT trigger_name 
    FROM information_schema.triggers 
    WHERE event_object_table = 'division' 
    AND trigger_name IN (${sql.join(requiredTriggers.map(t => sql`${t}`), sql`, `)})
  `;
  
  const result = await tx.execute(query);
  const foundTriggers = result.rows.map((row: any) => row.trigger_name);
  
  return requiredTriggers.every(trigger => foundTriggers.includes(trigger));
}

/**
 * Checks if a division exists in the database
 * @param tx - Database transaction
 * @param importId - Import ID of the division
 * @returns Promise resolving to boolean indicating if division exists
 */
export async function divisionExists(tx: Tx, importId: string): Promise<boolean> {
  const result = await tx.select({ count: sql<number>`count(*)` })
    .from(divisionTable)
    .where(sql`${divisionTable.importId} = ${importId}`)
    .limit(1);
  
  return result[0]?.count > 0;
}

/**
 * Checks if a geometry is valid using PostGIS
 * @param tx - Database transaction
 * @param geojson - GeoJSON object to validate
 * @returns Promise resolving to validation result with reason if invalid
 */
export async function validateGeometryWithPostGIS(
  tx: Tx, 
  geojson: any
): Promise<{ valid: boolean; reason?: string }> {
  try {
    // Convert GeoJSON to PostGIS geometry
    const query = sql`
      SELECT 
        ST_IsValid(ST_GeomFromGeoJSON(${JSON.stringify(geojson)})) AS is_valid,
        ST_IsValidReason(ST_GeomFromGeoJSON(${JSON.stringify(geojson)})) AS reason
    `;
    
    const result = await tx.execute(query);
    
    if (result.rows.length === 0) {
      return { valid: false, reason: 'Failed to validate geometry with PostGIS' };
    }
    
    const isValid = result.rows[0].is_valid === true || result.rows[0].is_valid === 't';
    const reason = result.rows[0].reason as string | undefined;
    
    return { 
      valid: isValid, 
      reason: !isValid ? reason : undefined 
    };
  } catch (e) {
    return { 
      valid: false, 
      reason: `PostGIS validation error: ${(e as Error).message}` 
    };
  }
}

/**
 * Validates coordinate system of GeoJSON
 * @param tx - Database transaction
 * @param geojson - GeoJSON object to validate
 * @returns Promise resolving to validation result
 */
export async function validateCoordinateSystem(
  tx: Tx, 
  geojson: any
): Promise<{ valid: boolean; srid?: number; reason?: string }> {
  try {
    // Try to detect the SRID from the GeoJSON
    const query = sql`
      SELECT 
        ST_SRID(ST_GeomFromGeoJSON(${JSON.stringify(geojson)})) AS srid
    `;
    
    const result = await tx.execute(query);
    
    if (result.rows.length === 0) {
      return { valid: false, reason: 'Failed to detect coordinate system' };
    }
    
    const srid = Number(result.rows[0].srid);
    
    // If SRID is 0 or 4326 (WGS84), it's valid for our purposes
    // Otherwise, we need to transform it
    if (srid !== 0 && srid !== 4326) {
      return { 
        valid: false, 
        srid,
        reason: `Unexpected coordinate system (SRID: ${srid}). Expected WGS84 (SRID: 4326)` 
      };
    }
    
    return { valid: true, srid: srid === 0 ? 4326 : srid };
  } catch (e) {
    return { 
      valid: false, 
      reason: `Coordinate system validation error: ${(e as Error).message}` 
    };
  }
}

/**
 * Transforms GeoJSON to WGS84 (SRID 4326) if needed
 * @param tx - Database transaction
 * @param geojson - GeoJSON object to transform
 * @param sourceSRID - Source SRID
 * @returns Promise resolving to transformed GeoJSON
 */
export async function transformToWGS84(
  tx: Tx, 
  geojson: any, 
  sourceSRID: number
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    if (sourceSRID === 4326) {
      return { success: true, data: geojson };
    }
    
    // Transform the geometry to WGS84
    const query = sql`
      SELECT ST_AsGeoJSON(
        ST_Transform(
          ST_SetSRID(
            ST_GeomFromGeoJSON(${JSON.stringify(geojson)}),
            ${sourceSRID}
          ),
          4326
        )
      ) AS geojson
    `;
    
    const result = await tx.execute(query);
    
    if (result.rows.length === 0) {
      return { 
        success: false, 
        error: 'Failed to transform geometry to WGS84' 
      };
    }
    
    const transformedGeoJSON = JSON.parse(result.rows[0].geojson as string);
    return { success: true, data: transformedGeoJSON };
  } catch (e) {
    return { 
      success: false, 
      error: `Transformation error: ${(e as Error).message}` 
    };
  }
}

/**
 * Gets the level of a division
 * @param tx - Database transaction
 * @param parentId - Parent division ID
 * @returns Promise resolving to calculated level
 */
export async function calculateDivisionLevel(
  tx: Tx, 
  parentId: number | null
): Promise<number> {
  if (!parentId) {
    return 1; // Root level
  }
  
  const result = await tx.select({ level: divisionTable.level })
    .from(divisionTable)
    .where(sql`${divisionTable.id} = ${parentId}`)
    .limit(1);
  
  if (result.length === 0) {
    throw new Error(`Parent division with ID ${parentId} not found`);
  }
  
  const parentLevel = result[0].level;
  return parentLevel ? parentLevel + 1 : 1;
}

/**
 * Optimizes spatial index updates for bulk operations
 * @param tx - Database transaction
 * @returns Promise resolving when optimization is complete
 */
export async function optimizeSpatialIndexing(tx: Tx): Promise<void> {
  // Disable index updates temporarily for bulk operations
  await tx.execute(sql`SET maintenance_work_mem = '256MB'`);
  await tx.execute(sql`SET work_mem = '64MB'`);
}

/**
 * Restores default settings after bulk operations
 * @param tx - Database transaction
 * @returns Promise resolving when settings are restored
 */
export async function restoreDefaultSettings(tx: Tx): Promise<void> {
  await tx.execute(sql`RESET maintenance_work_mem`);
  await tx.execute(sql`RESET work_mem`);
}

/**
 * Updates spatial indexes after bulk operations
 * @param tx - Database transaction
 * @returns Promise resolving when index is updated
 */
export async function updateSpatialIndexes(tx: Tx): Promise<void> {
  // Rebuild the spatial indexes
  await tx.execute(sql`REINDEX INDEX division_geom_idx`);
  await tx.execute(sql`REINDEX INDEX division_bbox_idx`);
  
  // Analyze the table for query optimizer
  await tx.execute(sql`ANALYZE division`);
}
