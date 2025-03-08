import { SQL, sql } from 'drizzle-orm';
import { Tx, Dr } from '~/db.server';
import { divisionTable } from '~/drizzle/schema';
import { QueryResult } from 'pg';
import { createLogger } from '~/utils/logger';
import { TriggerError } from './errors';

const logger = createLogger('geoDatabase');

interface GeometryValidationResult extends Record<string, unknown> {
  is_valid: boolean | string;
  reason: string | null;
  srid: string | number;
}

interface TriggerDefinition {
  name: string;
  def: string;
}

/**
 * Geographic database utilities
 * Provides functions for database operations related to geographic data
 */
export class GeoDatabaseUtils {
  private static instance: GeoDatabaseUtils;

  private constructor() { }

  public static getInstance(): GeoDatabaseUtils {
    if (!GeoDatabaseUtils.instance) {
      GeoDatabaseUtils.instance = new GeoDatabaseUtils();
    }
    return GeoDatabaseUtils.instance;
  }

  /**
   * Verifies that PostgreSQL triggers for division table exist and are properly configured
   * @param tx - Database transaction
   * @returns Promise resolving to boolean indicating if all required triggers exist
   */
  async verifyTriggerExistence(tx: Tx): Promise<boolean> {
    try {
      const query = sql`
        SELECT 
          tgname as trigger_name,
          pg_get_triggerdef(oid) as trigger_definition
        FROM pg_trigger
        WHERE tgrelid = 'division'::regclass
        ORDER BY tgname;
      `;

      const result = await tx.execute(query);

      if (!result.rows.length) {
        logger.error('No triggers found for division table');
        return false;
      }

      const triggerDefs: TriggerDefinition[] = result.rows.map((row: any) => ({
        name: row.trigger_name,
        def: row.trigger_definition
      }));

      logger.info('Found triggers:', {
        count: triggerDefs.length,
        triggers: triggerDefs.map(t => t.name)
      });

      // Required triggers based on actual database configuration
      const requiredTriggers = {
        delete: 'ri_constrainttrigger_a_139590',
        update: 'ri_constrainttrigger_a_139591',
        insert: 'ri_constrainttrigger_c_139592',
        checkUpdate: 'ri_constrainttrigger_c_139593',
        spatial: 'spatial_index_trigger',
        geometry: 'geojson_to_geometry'
      };

      const foundTriggers = new Set(triggerDefs.map(t => t.name.toLowerCase()));
      const missingTriggers = Object.entries(requiredTriggers)
        .filter(([_, triggerName]) => !foundTriggers.has(triggerName))
        .map(([type, name]) => ({ type, name }));

      if (missingTriggers.length > 0) {
        const missingList = missingTriggers
          .map(t => `${t.type}: ${t.name}`)
          .join('\n');

        logger.error('Missing required triggers:', {
          missing: missingList,
          found: Array.from(foundTriggers)
        });
        return false;
      }

      // Verify trigger definitions
      const geometryTrigger = triggerDefs.find(t =>
        t.name.toLowerCase() === 'geojson_to_geometry' &&
        t.def.toLowerCase().includes('update_geometry_from_geojson')
      );

      const spatialTrigger = triggerDefs.find(t =>
        t.name.toLowerCase() === 'spatial_index_trigger' &&
        t.def.toLowerCase().includes('update_spatial_index')
      );

      if (!geometryTrigger || !spatialTrigger) {
        logger.error('Trigger definitions do not match expected functionality:', {
          geometryTriggerOk: !!geometryTrigger,
          spatialTriggerOk: !!spatialTrigger
        });
        return false;
      }

      logger.info('All required triggers verified successfully');
      return true;
    } catch (error) {
      logger.error('Error verifying triggers:', { error });
      throw new TriggerError('Failed to verify division table triggers', { cause: error });
    }
  }

  /**
   * Checks if a division exists in the database
   * @param tx - Database transaction
   * @param importId - Import ID of the division
   * @returns Promise resolving to boolean indicating if division exists
   */
  async divisionExists(tx: Tx, importId: string): Promise<boolean> {
    const query = sql`
      SELECT EXISTS (
        SELECT 1 
        FROM ${divisionTable}
        WHERE import_id = ${importId}
      ) AS exists;
    `;

    const result = await tx.execute(query);
    return Boolean(result.rows.length > 0 && result.rows[0].exists);
  }

  /**
   * Checks if a geometry is valid using PostGIS
   * @param tx - Database transaction
   * @param geojson - GeoJSON object to validate
   * @returns Promise resolving to validation result with reason if invalid
   */
  async validateGeometryWithPostGIS(
    tx: Tx,
    geojson: any
  ): Promise<{ valid: boolean; reason?: string }> {
    try {
      const query = sql`
        WITH geom AS (
          SELECT ST_GeomFromGeoJSON(${JSON.stringify(geojson)})::geometry(Geometry, 4326) AS the_geom
        )
        SELECT 
          ST_IsValid(the_geom) AS is_valid,
          CASE 
            WHEN ST_IsValid(the_geom) THEN NULL::text
            ELSE ST_IsValidReason(the_geom)::text
          END AS reason,
          ST_SRID(the_geom) AS srid
        FROM geom;
      `;

      const result = await tx.execute<GeometryValidationResult>(query);

      if (result.rows.length === 0) {
        return { valid: false, reason: 'Failed to convert GeoJSON to PostGIS geometry' };
      }

      const isValid = result.rows[0].is_valid === true || result.rows[0].is_valid === 't';
      const validationReason = result.rows[0].reason;

      if (!isValid) {
        return {
          valid: false,
          reason: validationReason || 'Invalid geometry (no specific reason provided)'
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        reason: `PostGIS validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Validates coordinate system of GeoJSON
   * @param tx - Database transaction
   * @param geojson - GeoJSON object to validate
   * @returns Promise resolving to validation result
   */
  async validateCoordinateSystem(
    tx: Tx,
    geojson: any
  ): Promise<{ valid: boolean; srid?: number; reason?: string }> {
    try {
      // First try to detect SRID from CRS if present
      if (geojson.crs && geojson.crs.properties && geojson.crs.properties.name) {
        const crsName = geojson.crs.properties.name;
        const sridMatch = crsName.match(/EPSG::(\d+)/i);
        if (sridMatch) {
          const srid = Number(sridMatch[1]);
          if (srid !== 4326) {
            return {
              valid: false,
              srid,
              reason: `Found EPSG:${srid} in CRS. Expected WGS84 (EPSG:4326)`
            };
          }
          return { valid: true, srid: 4326 };
        }
      }

      // If no CRS specified, try to detect from coordinates
      const query = sql`
        SELECT ST_SRID(
          ST_GeomFromGeoJSON(${JSON.stringify(geojson)})
        ) AS srid;
      `;

      const result = await tx.execute(query);

      if (result.rows.length === 0) {
        return { valid: false, reason: 'Failed to detect coordinate system' };
      }

      const srid = Number(result.rows[0].srid);

      // If SRID is 0, assume WGS84 as per GeoJSON spec
      if (srid === 0) {
        return { valid: true, srid: 4326 };
      }

      // If not WGS84, mark as invalid but return the SRID for transformation
      if (srid !== 4326) {
        return {
          valid: false,
          srid,
          reason: `Detected SRID:${srid}. Expected WGS84 (SRID:4326)`
        };
      }

      return { valid: true, srid: 4326 };
    } catch (error) {
      return {
        valid: false,
        reason: `Coordinate system validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
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
  async transformToWGS84(
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
            )::geometry(Geometry, ${sourceSRID}),
            4326
          )::geometry(Geometry, 4326)
        ) AS geojson;
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
    } catch (error) {
      return {
        success: false,
        error: `Transformation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Gets the level of a division
   * @param tx - Database transaction
   * @param parentId - Parent division ID
   * @returns Promise resolving to calculated level
   */
  async calculateDivisionLevel(
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
  async optimizeSpatialIndexing(tx: Tx): Promise<void> {
    try {
      // Temporarily disable spatial index updates
      await tx.execute(sql`
        ALTER TABLE division SET (autovacuum_enabled = false);
        SET maintenance_work_mem = '1GB';
        SET work_mem = '50MB';
      `);

      logger.info('Optimized database settings for spatial operations');
    } catch (error) {
      logger.error('Failed to optimize spatial indexing', { error });
      throw error;
    }
  }

  /**
   * Restores default settings after bulk operations
   * @param tx - Database transaction
   * @returns Promise resolving when settings are restored
   */
  async restoreDefaultSettings(tx: Tx): Promise<void> {
    try {
      // Restore default settings
      await tx.execute(sql`
        ALTER TABLE division SET (autovacuum_enabled = true);
        SET maintenance_work_mem TO DEFAULT;
        SET work_mem TO DEFAULT;
      `);

      logger.info('Restored default database settings');
    } catch (error) {
      logger.error('Failed to restore default settings', { error });
      throw error;
    }
  }

  /**
   * Updates spatial indexes after bulk operations
   * @param tx - Database transaction
   * @param divisionIds - Optional array of division IDs to update indexes for
   * @returns Promise resolving when index is updated
   */
  async updateSpatialIndexes(tx: Tx, divisionIds?: number[]): Promise<void> {
    try {
      if (divisionIds && divisionIds.length > 0) {
        // Update indexes only for specific divisions
        await tx.execute(sql`
          REINDEX INDEX division_geom_idx;
          ANALYZE division;
        `);

        logger.info('Updated spatial indexes for specific divisions', {
          divisionCount: divisionIds.length
        });
      } else {
        // Update all indexes
        await tx.execute(sql`
          REINDEX INDEX division_geom_idx;
          ANALYZE division;
        `);

        logger.info('Updated all spatial indexes');
      }
    } catch (error) {
      logger.error('Failed to update spatial indexes', { error });
      throw error;
    }
  }
}

// Create singleton instance
const geoDatabaseUtils = GeoDatabaseUtils.getInstance();

// Export individual functions to maintain backwards compatibility
export const verifyTriggerExistence = geoDatabaseUtils.verifyTriggerExistence.bind(geoDatabaseUtils);
export const divisionExists = geoDatabaseUtils.divisionExists.bind(geoDatabaseUtils);
export const validateGeometryWithPostGIS = geoDatabaseUtils.validateGeometryWithPostGIS.bind(geoDatabaseUtils);
export const validateCoordinateSystem = geoDatabaseUtils.validateCoordinateSystem.bind(geoDatabaseUtils);
export const transformToWGS84 = geoDatabaseUtils.transformToWGS84.bind(geoDatabaseUtils);
export const calculateDivisionLevel = geoDatabaseUtils.calculateDivisionLevel.bind(geoDatabaseUtils);
export const optimizeSpatialIndexing = geoDatabaseUtils.optimizeSpatialIndexing.bind(geoDatabaseUtils);
export const restoreDefaultSettings = geoDatabaseUtils.restoreDefaultSettings.bind(geoDatabaseUtils);
export const updateSpatialIndexes = geoDatabaseUtils.updateSpatialIndexes.bind(geoDatabaseUtils);
