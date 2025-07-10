import {
  SQL, sql, eq, isNull, and
} from 'drizzle-orm';

import { selectTranslated } from './common';

import {
  divisionTable,
  DivisionInsert,
} from '~/drizzle/schema';

import { dr, Tx } from '~/db.server';

import { parse } from 'csv-parse';
import JSZip from "jszip";

// Import utility functions
import { createLogger } from '~/utils/logger';
import { TenantContext } from '~/util/tenant';
import {
  ValidationError,
  DatabaseError,
  GeoDataError,
  ImportError,
  HierarchyError,
  TransactionError,
  AppError
} from '~/utils/errors';
import {
  processParallelBatches
} from '~/utils/batchProcessing';
import {
  GeoDatabaseUtils
} from '~/utils/geoDatabase';
import {
  validateGeoJSON,
} from '~/utils/geoValidation';

// Create logger
const logger = createLogger('division');

export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserError";
  }
}

export async function divisionsAllLanguages(parentId: number | null, _langs: string[], tenantContext: TenantContext): Promise<Record<string, number>> {
  // Note: Parameter is prefixed with underscore to indicate it's intentionally unused but kept for API consistency
  try {
    return await dr.transaction(async (tx: Tx) => {
      try {
        // No need to select translations as we're only counting
        const q = tx
          .select({
            key: sql<string>`jsonb_object_keys(${divisionTable.name})`,
            count: sql<number>`COUNT(*)`,
          })
          .from(divisionTable)
          .where(
            and(
              parentId ? eq(divisionTable.parentId, parentId) : isNull(divisionTable.parentId),
              eq(divisionTable.countryAccountsId, tenantContext.countryAccountId)
            )
          )
          .groupBy(sql`jsonb_object_keys(${divisionTable.name})`);

        const rows = await q;
        const counts: Record<string, number> = {};
        rows.forEach((row) => {
          counts[row.key] = Number(row.count);
        });

        return counts;
      } catch (error) {
        logger.error('Failed to get divisions by language', { error, parentId });
        throw new DatabaseError('Failed to get divisions by language', { error, parentId });
      }
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new TransactionError('Failed to get divisions by language', { error });
  }
}

export type DivisionBreadcrumbRow = {
  id: number;
  name: string;
  nameLang: string;
  parentId: number | null;
};

export async function divisionBreadcrumb(
  langs: string[],
  divisionId: number,
  tenantContext: TenantContext,
): Promise<DivisionBreadcrumbRow[]> {
  try {
    return await dr.transaction(async (tx: Tx) => {
      try {
        const tr = selectTranslated(divisionTable.name, "name", langs);
        const breadcrumbs: DivisionBreadcrumbRow[] = [];
        let currentId: number | null = divisionId;

        while (currentId !== null) {
          const select: {
            id: typeof divisionTable.id
            parentId: typeof divisionTable.parentId
            name: SQL<string>
            nameLang: SQL<string>
          } = {
            id: divisionTable.id,
            parentId: divisionTable.parentId,
            name: tr.name,
            nameLang: tr.nameLang
          };

          const res: DivisionBreadcrumbRow[] = await tx
            .select(select)
            .from(divisionTable)
            .where(
              and(
                eq(divisionTable.id, currentId),
                eq(divisionTable.countryAccountsId, tenantContext.countryAccountId)
              )
            )
            .limit(1);

          const division = res[0];
          if (!division) break;
          breadcrumbs.unshift(division);
          currentId = division.parentId;
        }

        return breadcrumbs;
      } catch (error) {
        logger.error('Failed to get division breadcrumb', { error, divisionId });
        throw new DatabaseError('Failed to get division breadcrumb', { error, divisionId });
      }
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new TransactionError('Failed to get division breadcrumb', { error });
  }
}

export function divisionSelect(langs: string[], tenantContext: TenantContext) {
  let tr = selectTranslated(divisionTable.name, "name", langs)
  let select: {
    id: typeof divisionTable.id,
    name: SQL<string>
    nameLang: SQL<string>
  } = {
    id: divisionTable.id,
    name: tr.name,
    nameLang: tr.nameLang
  };
  return dr.transaction(async (tx: Tx) => {
    try {
      return await tx.select(select)
        .from(divisionTable)
        .where(eq(divisionTable.countryAccountsId, tenantContext.countryAccountId));
    } catch (error) {
      logger.error('Failed to select divisions', { error });
      throw new DatabaseError('Failed to select divisions', { error });
    }
  });
}

async function parseCSV(data: string): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    const parser = parse({
      delimiter: ",",
    });
    const records: string[][] = [];
    parser.on("readable", function () {
      let record;
      while ((record = parser.read()) !== null) {
        record = record.map((field: string) => field.trim())
        records.push(record);
      }
    });
    parser.on("error", function (err) {
      reject(new UserError(String(err)));
    });

    parser.on("end", function () {
      resolve(records);
    });

    parser.write(data);
    parser.end();
  });
}

// interface ImportItem {
//   ImportID: string;
//   GeodataFileName: string;
// }

// interface FailedUpdate {
//   id: string;
//   error: string;
// }

interface BatchResult {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
}

interface ImportRes {
  success: boolean;
  data?: any;
  error?: string;
}

export async function importZip(zipBytes: Uint8Array, tenantContext: TenantContext): Promise<ImportRes> {
  const successfulImports = new Set<string>();
  const failedImports = new Map<string, string>();
  // const results = new Map<string, ImportRes>();
  const zip = await JSZip.loadAsync(zipBytes);

  try {
    // First, parse the CSV file
    const csvFile = Object.values(zip.files).find(file =>
      file.name.toLowerCase().endsWith('.csv')
    );

    if (!csvFile) {
      throw new ImportError('No CSV file found in ZIP');
    }

    const csvContent = await csvFile.async('text');
    const rows = await parseCSV(csvContent);
    const headers = rows[0];

    // Validate required columns
    const requiredColumns = ['id', 'parent', 'geodata', 'national_id'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    if (missingColumns.length > 0) {
      throw new ImportError(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    // Get language codes (any column that's not a required column)
    const langCodes = headers.filter(h => !requiredColumns.includes(h));
    if (langCodes.length === 0) {
      throw new ImportError('No language columns found');
    }

    // Parse divisions and build a map of geodata filenames for quick lookup
    const divisions: {
      [key: string]: {
        nationalId: string;
        parent: string;
        geodata: string;
        name: Record<string, string>;
      };
    } = {};

    // Create a map of normalized filenames to their actual paths in the ZIP
    const geoJsonFiles = new Map<string, string>();
    Object.keys(zip.files).forEach(path => {
      if (path.toLowerCase().endsWith('.geojson')) {
        const normalizedName = path.split('/').pop()?.toLowerCase() || '';
        geoJsonFiles.set(normalizedName, path);
      }
    });

    // Process divisions from CSV
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const id = row[headers.indexOf('id')];
      const parent = row[headers.indexOf('parent')];
      const geodata = row[headers.indexOf('geodata')];
      const nationalId = row[headers.indexOf('national_id')];

      // Skip empty rows
      if (!id) continue;

      const name: Record<string, string> = {};
      langCodes.forEach(lang => {
        const value = row[headers.indexOf(lang)];
        if (value) name[lang] = value;
      });

      divisions[id] = {
        nationalId,
        parent,
        geodata,
        name
      };
    }

    logger.info('Processing divisions from CSV', {
      totalDivisions: Object.keys(divisions).length,
      sampleHeaders: headers
    });

    // Separate root and child divisions
    const rootDivisions: string[] = [];
    const childDivisions: string[] = [];
    const idMap = new Map<string, number>();

    Object.entries(divisions).forEach(([id, division]) => {
      if (!division.parent) {
        rootDivisions.push(id);
      } else {
        childDivisions.push(id);
      }
    });

    // Process root divisions first
    await processParallelBatches(
      rootDivisions,
      10, // batchSize
      2,  // concurrency
      async (batch: string[]) => {
        const results: BatchResult[] = [];
        for (const divisionId of batch) {
          try {
            // Get GeoJSON content using the normalized filename map
            const normalizedFilename = divisions[divisionId].geodata.toLowerCase();
            const geoJsonPath = geoJsonFiles.get(normalizedFilename);

            if (!geoJsonPath) {
              throw new ImportError(`GeoJSON file not found: ${divisions[divisionId].geodata}`);
            }

            const geoJsonContent = await zip.files[geoJsonPath].async('text');

            // Process within transaction
            const result = await dr.transaction(async (tx) => {
              const result = await importDivision(tx, divisions, divisionId, idMap, tenantContext, geoJsonContent);
              if (!result) return null;

              successfulImports.add(divisionId);
              return {
                id: divisionId,
                success: true
              };
            });

            if (result) {
              results.push(result);
            }
          } catch (error) {
            logger.error('Failed to process division', {
              divisionId,
              error
            });
            failedImports.set(divisionId, error instanceof Error ? error.message : 'Unknown error');
            results.push({
              id: divisionId,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
        return results;
      },
      {
        onBatchComplete: (batchResults, batchIndex) => {
          logger.info('Batch completed', {
            batchIndex,
            batchSize: batchResults.length,
            successCount: successfulImports.size
          });
        },
        onProgress: (processed: number, total: number) => {
          logger.info('Import progress', {
            processed,
            total,
            successCount: successfulImports.size
          });
        }
      }
    );

    // Then process child divisions
    await processParallelBatches(
      childDivisions,
      10, // batchSize
      2,  // concurrency
      async (batch: string[]) => {
        const results: BatchResult[] = [];
        for (const divisionId of batch) {
          try {
            // Get GeoJSON content using the normalized filename map
            const normalizedFilename = divisions[divisionId].geodata.toLowerCase();
            const geoJsonPath = geoJsonFiles.get(normalizedFilename);

            if (!geoJsonPath) {
              throw new ImportError(`GeoJSON file not found: ${divisions[divisionId].geodata}`);
            }

            const geoJsonContent = await zip.files[geoJsonPath].async('text');

            // Process within transaction
            const result = await dr.transaction(async (tx) => {
              const result = await importDivision(tx, divisions, divisionId, idMap, tenantContext, geoJsonContent);
              if (!result) return null;

              successfulImports.add(divisionId);
              return {
                id: divisionId,
                success: true
              };
            });

            if (result) {
              results.push(result);
            }
          } catch (error) {
            logger.error('Failed to process division', {
              divisionId,
              error
            });
            failedImports.set(divisionId, error instanceof Error ? error.message : 'Unknown error');
            results.push({
              id: divisionId,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
        return results;
      },
      {
        onBatchComplete: (batchResults, batchIndex) => {
          logger.info('Batch completed', {
            batchIndex,
            batchSize: batchResults.length,
            successCount: successfulImports.size
          });
        },
        onProgress: (processed: number, total: number) => {
          logger.info('Import progress', {
            processed,
            total,
            successCount: successfulImports.size
          });
        }
      }
    );

    logger.info('Updating spatial indexes...');
    await dr.transaction(async (tx) => {
      await updateSpatialIndexes(tx);
    });

    logger.info('Import completed', {
      totalProcessed: Object.keys(divisions).length,
      successful: successfulImports.size,
      failed: failedImports.size
    });

    return {
      success: true,
      data: {
        totalProcessed: Object.keys(divisions).length,
        imported: successfulImports.size,
        failed: failedImports.size,
        failedDetails: Object.fromEntries(failedImports)
      }
    };

  } catch (error) {
    logger.error('Failed to process ZIP file', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function processGeoJSON(tx: Tx, divisionId: number, geoJsonContent: string): Promise<void> {
  try {
    // Parse and validate GeoJSON
    let parsedGeoJson: any;
    try {
      parsedGeoJson = JSON.parse(geoJsonContent);
    } catch (e) {
      throw new ImportError('Invalid JSON content', {
        error: e instanceof Error ? e.message : 'Unknown error'
      });
    }

    // Validate GeoJSON structure
    const geoJsonValidation = validateGeoJSON(parsedGeoJson);
    if (!geoJsonValidation.valid) {
      throw new ImportError(`Invalid GeoJSON structure: ${geoJsonValidation.error}`, {
        error: geoJsonValidation.error
      });
    }

    // Process feature
    let featureToProcess: any;
    if (parsedGeoJson.type === 'FeatureCollection') {
      if (!parsedGeoJson.features?.length) {
        throw new ImportError('FeatureCollection is empty');
      }
      featureToProcess = parsedGeoJson.features[0];
    } else if (parsedGeoJson.type === 'Feature') {
      featureToProcess = parsedGeoJson;
    } else if (parsedGeoJson.type && ['Point', 'LineString', 'Polygon', 'MultiPolygon'].includes(parsedGeoJson.type)) {
      featureToProcess = {
        type: 'Feature',
        geometry: parsedGeoJson,
        properties: {}
      };
    } else {
      throw new ImportError(`Unsupported GeoJSON type: ${parsedGeoJson.type}`, {
        type: parsedGeoJson.type
      });
    }

    // Validate geometry with PostGIS
    const geoDatabaseUtils = GeoDatabaseUtils.getInstance();
    const postGisValidation = await geoDatabaseUtils.validateGeometryWithPostGIS(tx, featureToProcess.geometry);
    if (!postGisValidation.valid) {
      throw new ImportError(`Invalid geometry: ${postGisValidation.reason}`, {
        error: postGisValidation.reason
      });
    }

    // Store GeoJSON and explicitly update the geometry fields using PostGIS functions
    // This replaces reliance on a database trigger that doesn't exist
    await tx.execute(sql`
      UPDATE ${divisionTable}
      SET 
        geojson = ${JSON.stringify(featureToProcess.geometry)}::jsonb,
        geom = ST_GeomFromGeoJSON(${JSON.stringify(featureToProcess.geometry)}),
        bbox = ST_Envelope(ST_GeomFromGeoJSON(${JSON.stringify(featureToProcess.geometry)}))
      WHERE id = ${divisionId}
    `);

    // Generate spatial index for efficient querying
    await tx.execute(sql`
      UPDATE ${divisionTable}
      SET spatial_index = ST_GeoHash(ST_Centroid(geom), 10)
      WHERE id = ${divisionId} AND geom IS NOT NULL
    `);

    logger.info(`Updated geometry for division ID ${divisionId}`);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new ImportError('Failed to process GeoJSON', { error });
  }
}

async function updateSpatialIndexes(tx: Tx): Promise<void> {
  try {
    // Refresh all spatial columns by triggering an update
    await tx.execute(sql`
      UPDATE ${divisionTable}
      SET geojson = geojson
      WHERE geojson IS NOT NULL
    `);
  } catch (error) {
    throw new DatabaseError('Failed to update spatial indexes', { error });
  }
}

async function importDivision(
  tx: Tx,
  divisions: {
    [key: string]: {
      parent: string;
      geodata: string;
      name: Record<string, string>;
      nationalId: string;
    }
  },
  importId: string,
  idMap: Map<string, number>,
  tenantContext: TenantContext,
  geoJsonContent?: string
): Promise<BatchResult | null> {
  try {
    // Skip if already imported
    if (idMap.has(importId)) {
      return null;
    }

    const division = divisions[importId];
    if (!division) {
      throw new ImportError(`Division ${importId} not found`, {
        importId,
        availableDivisions: Object.keys(divisions)
      });
    }

    // For root divisions (no parent), set level to 1
    let parentDbId: number | null = null;

    if (division.parent) {
      // Import parent first if exists and not already imported
      if (!idMap.has(division.parent)) {
        const parentResult = await importDivision(tx, divisions, division.parent, idMap, tenantContext, undefined);
        if (!parentResult?.success) {
          throw new HierarchyError(`Failed to import parent division ${division.parent}`, {
            parentId: division.parent,
            childId: importId,
            error: parentResult?.error
          });
        }
      }

      parentDbId = idMap.get(division.parent) ?? null;
      if (!parentDbId) {
        throw new HierarchyError(`Parent division ${division.parent} not found in database`, {
          parentId: division.parent,
          childId: importId
        });
      }
    }

    // Prepare division data for validation and insertion/update
    const divisionData: DivisionInsert = {
      nationalId: division.nationalId !== "" ? division.nationalId : null,
      importId,
      parentId: parentDbId,
      name: division.name
    };

    // Check if division exists
    const existingDivision = await tx
      .select({ id: divisionTable.id })
      .from(divisionTable)
      .where(and(
        sql`${divisionTable.importId} = ${importId}::text`,
        eq(divisionTable.countryAccountsId, tenantContext.countryAccountId)
      ))
      .limit(1)
      .then(res => res[0]);

    let dbId: number;

    // Use shared validation logic
    const validation = await validateDivisionData(
      tx,
      divisionData,
      tenantContext,
      existingDivision?.id
    );

    // For import, we'll convert validation errors to ImportError exceptions
    if (!validation.valid) {
      throw new ImportError(`Validation failed for division ${importId}: ${validation.errors.join(', ')}`, {
        importId,
        validationErrors: validation.errors
      });
    }

    if (existingDivision) {
      // Update existing division
      await tx
        .update(divisionTable)
        .set({
          ...divisionData,
          level: validation.level,
          countryAccountsId: tenantContext.countryAccountId
        })
        .where(eq(divisionTable.id, existingDivision.id));

      dbId = existingDivision.id;
    } else {
      // Insert new division
      const [result] = await tx
        .insert(divisionTable)
        .values({
          ...divisionData,
          level: validation.level,
          countryAccountsId: tenantContext.countryAccountId
        })
        .returning({ id: divisionTable.id });

      if (!result?.id) {
        throw new DatabaseError('Failed to insert division', {
          importId
        });
      }

      dbId = result.id;
    }

    // Process GeoJSON if provided
    if (geoJsonContent) {
      await processGeoJSON(tx, dbId, geoJsonContent);
    }

    idMap.set(importId, dbId);
    return {
      id: importId,
      success: true,
      data: { dbId, level: validation.level }
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new ImportError(`Failed to import division ${importId}`, { error });
  }
}

export function fromForm(formData: Record<string, string>): DivisionInsert {
  const { parentId, ...nameFields } = formData;

  const names = Object.entries(nameFields)
    .filter(([key]) => key.startsWith("names[") && key.endsWith("]"))
    .reduce((acc, [key, value]) => {
      const lang = key.slice(6, -1);
      acc[lang] = value;
      return acc;
    }, {} as { [key: string]: string });

  return {
    parentId: parentId ? Number(parentId) : null,
    name: names,
  };
}

/**
 * Validates division data before creation or update
 * Checks for duplicate divisions, validates parent-child relationships,
 * and ensures proper level calculation based on parent
 */
async function validateDivisionData(
  tx: Tx,
  data: DivisionInsert,
  tenantContext: TenantContext,
  existingId?: number
): Promise<{ valid: boolean; errors: string[]; level?: number }> {
  const errors: string[] = [];
  let level = 1; // Default level for root divisions

  // Validate parent exists and belongs to the same tenant if specified
  if (data.parentId !== null && data.parentId !== undefined) {
    const parent = await tx.query.divisionTable.findFirst({
      where: and(
        eq(divisionTable.id, data.parentId),
        eq(divisionTable.countryAccountsId, tenantContext.countryAccountId)
      )
    });

    if (!parent) {
      errors.push(`Parent division with ID ${data.parentId} not found or does not belong to the same tenant`);
    } else {
      // Calculate level based on parent's level
      level = (parent.level || 0) + 1;

      // Check for circular reference (only needed for updates)
      if (existingId) {
        const wouldCreateCircularReference = await checkCircularReference(
          tx,
          existingId,
          data.parentId,
          tenantContext.countryAccountId
        );

        if (wouldCreateCircularReference) {
          errors.push('Cannot set parent: would create a circular reference in the division hierarchy');
        }
      }
    }
  }

  // Check for duplicate division names within the same tenant and level
  if (data.name && Object.keys(data.name).length > 0) {
    // Get a representative name for checking (using first available language)
    const firstLang = Object.keys(data.name)[0];
    const nameValue = data.name[firstLang];

    if (nameValue) {
      const query = and(
        sql`${divisionTable.name}->>${firstLang} = ${nameValue}`,
        eq(divisionTable.level, level),
        eq(divisionTable.countryAccountsId, tenantContext.countryAccountId)
      );

      // If updating an existing division, exclude it from the duplicate check
      const whereClause = existingId
        ? and(query, sql`${divisionTable.id} != ${existingId}`)
        : query;

      const existingWithSameName = await tx.query.divisionTable.findFirst({
        where: whereClause
      });

      if (existingWithSameName) {
        errors.push(`A division with the name "${nameValue}" already exists at level ${level}`);
      }
    }
  } else {
    errors.push('Division name is required');
  }

  // Check for duplicate nationalId if provided
  if (data.nationalId) {
    const query = and(
      eq(divisionTable.nationalId, data.nationalId),
      eq(divisionTable.countryAccountsId, tenantContext.countryAccountId)
    );

    // If updating an existing division, exclude it from the duplicate check
    const whereClause = existingId
      ? and(query, sql`${divisionTable.id} != ${existingId}`)
      : query;

    const existingWithSameNationalId = await tx.query.divisionTable.findFirst({
      where: whereClause
    });

    if (existingWithSameNationalId) {
      errors.push(`A division with the national ID "${data.nationalId}" already exists`);
    }
  }

  // Check for duplicate importId if provided
  if (data.importId) {
    const query = and(
      eq(divisionTable.importId, data.importId),
      eq(divisionTable.countryAccountsId, tenantContext.countryAccountId)
    );

    // If updating an existing division, exclude it from the duplicate check
    const whereClause = existingId
      ? and(query, sql`${divisionTable.id} != ${existingId}`)
      : query;

    const existingWithSameImportId = await tx.query.divisionTable.findFirst({
      where: whereClause
    });

    if (existingWithSameImportId) {
      errors.push(`A division with the import ID "${data.importId}" already exists`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    level
  };
}

/**
 * Checks if setting parentId for a division would create a circular reference
 * @param tx Database transaction
 * @param divisionId ID of the division being updated
 * @param parentId New parent ID to set
 * @param countryAccountId Tenant context ID
 * @returns true if a circular reference would be created, false otherwise
 */
async function checkCircularReference(
  tx: Tx,
  divisionId: number,
  parentId: number,
  countryAccountId: string
): Promise<boolean> {
  // Simple case: division can't be its own parent
  if (divisionId === parentId) {
    return true;
  }

  // Check if any ancestor of the new parent is the division itself
  let currentId = parentId;
  const visited = new Set<number>();

  while (currentId) {
    // Prevent infinite loops
    if (visited.has(currentId)) {
      return true;
    }
    visited.add(currentId);

    // Get the parent of the current division
    const current = await tx.query.divisionTable.findFirst({
      where: and(
        eq(divisionTable.id, currentId),
        eq(divisionTable.countryAccountsId, countryAccountId)
      ),
      columns: {
        parentId: true
      }
    });

    // If we reached a root division or can't find the division, stop
    if (!current || current.parentId === null) {
      break;
    }

    // If the parent is the division we're updating, we have a circular reference
    if (current.parentId === divisionId) {
      return true;
    }

    // Move up the hierarchy
    currentId = current.parentId;
  }

  return false;
}

export async function createDivision(data: DivisionInsert, tenantContext: TenantContext): Promise<{ ok: boolean; errors?: string[] }> {
  try {
    return await dr.transaction(async (tx: Tx) => {
      try {
        // Validate division data
        const validation = await validateDivisionData(tx, data, tenantContext);

        if (!validation.valid) {
          return { ok: false, errors: validation.errors };
        }

        // Insert with validated level
        await tx
          .insert(divisionTable)
          .values({
            ...data,
            level: validation.level,
            countryAccountsId: tenantContext.countryAccountId
          });

        return { ok: true };
      } catch (error) {
        logger.error('Failed to create division', { error, data });
        return { ok: false, errors: ["Failed to create the division"] };
      }
    });
  } catch (error) {
    logger.error('Failed to create division', { error, data });
    return { ok: false, errors: ["Failed to create the division"] };
  }
}

export async function update(id: number, data: DivisionInsert, tenantContext: TenantContext): Promise<{ ok: boolean; errors?: string[] }> {
  try {
    return await dr.transaction(async (tx: Tx) => {
      try {
        // Verify division exists and belongs to the tenant
        const existingDivision = await tx.query.divisionTable.findFirst({
          where: and(
            eq(divisionTable.id, id),
            eq(divisionTable.countryAccountsId, tenantContext.countryAccountId)
          )
        });

        if (!existingDivision) {
          return { ok: false, errors: ["Division not found or access denied"] };
        }

        // Validate division data
        const validation = await validateDivisionData(tx, data, tenantContext, id);

        if (!validation.valid) {
          return { ok: false, errors: validation.errors };
        }

        // Update with validated level
        await tx
          .update(divisionTable)
          .set({
            ...data,
            level: validation.level
          })
          .where(
            and(
              eq(divisionTable.id, id),
              eq(divisionTable.countryAccountsId, tenantContext.countryAccountId)
            )
          );

        return { ok: true };
      } catch (error) {
        logger.error('Failed to update division', { error, id, data });
        return { ok: false, errors: ["Failed to update the division"] };
      }
    });
  } catch (error) {
    logger.error('Failed to update division', { error, id, data });
    return { ok: false, errors: ["Failed to update the division"] };
  }
}

export async function divisionById(id: number, tenantContext: TenantContext) {
  try {
    return await dr.transaction(async (tx: Tx) => {
      try {
        const res = await tx.query.divisionTable.findFirst({
          where: and(
            eq(divisionTable.id, id),
            eq(divisionTable.countryAccountsId, tenantContext.countryAccountId)
          ),
          with: {
            divisionParent: true
          }
        });
        return res;
      } catch (error) {
        logger.error('Failed to get division by ID', { error, id });
        throw new DatabaseError('Failed to get division by ID', { error, id });
      }
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new TransactionError('Failed to get division by ID', { error });
  }
}

export async function getAllChildren(divisionId: number, tenantContext: TenantContext) {
  try {
    return await dr.transaction(async (tx: Tx) => {
      try {
        const res = await tx.execute(sql`
          WITH RECURSIVE DivisionChildren AS (
            SELECT id, parent_id
            FROM division
            WHERE id = ${divisionId}
            AND country_accounts_id = ${tenantContext.countryAccountId}

            UNION ALL

            SELECT t.id, t.parent_id
            FROM division t
            INNER JOIN DivisionChildren c ON t.parent_id = c.id
            WHERE t.country_accounts_id = ${tenantContext.countryAccountId}
          )

          SELECT id
          FROM DivisionChildren;
        `);

        return res;
      } catch (error) {
        logger.error('Failed to get all children', { error, divisionId });
        throw new DatabaseError('Failed to get all children', { error, divisionId });
      }
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new TransactionError('Failed to get all children', { error });
  }
}

export type DivisionIdAndNameResult = {
  id: number;
  name: Record<string, string>;
  level: number | null;
}[];


export async function getDivisionIdAndNameByLevel(level: number, countryAccountId: string): Promise<DivisionIdAndNameResult> {
  try {
    const divisions = await dr
      .select({
        id: divisionTable.id,
        name: divisionTable.name,
        level: divisionTable.level
      })
      .from(divisionTable)
      .where(and(
        eq(divisionTable.level, level),
        eq(divisionTable.countryAccountsId, countryAccountId)
      ));

    // Map results to ensure correct typing
    return divisions.map((division) => ({
      id: division.id,
      name: division.name,
      level: division.level
    }));
  } catch (error) {
    console.error("Error fetching divisions by level:", error);
    throw new Error("Failed to fetch divisions");
  }
}

export async function getDivisionByLevel(level: number, countryAccountId: string) {
  try {
    return await dr.transaction(async (tx: Tx) => {
      try {
        const res = await tx.query.divisionTable.findMany({
          where: and(
            eq(divisionTable.level, level),
            eq(divisionTable.countryAccountsId, countryAccountId)
          ),
          with: {
            divisionParent: true
          }
        });
        return res;
      } catch (error) {
        logger.error('Failed to get divisions by level', { error, level });
        throw new DatabaseError('Failed to get divisions by level', { error, level });
      }
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new TransactionError('Failed to get divisions by level', { error });
  }
}

export async function getDivisionsBySpatialQuery(
  geojson: any,
  options: {
    relationshipType?: 'intersects' | 'contains' | 'within';
  } = {},
  tenantContext: TenantContext
): Promise<any[]> {
  try {
    return await dr.transaction(async (tx: Tx) => {
      try {
        // Validate GeoJSON
        const validationResult = validateGeoJSON(geojson);
        if (!validationResult.valid) {
          throw new GeoDataError(`Invalid GeoJSON: ${validationResult.error}`, {
            geojson,
            validationError: validationResult.error
          });
        }

        // Add spatial relationship condition
        const relationshipType = options.relationshipType || 'intersects';
        let spatialFunction: string;

        switch (relationshipType) {
          case 'contains':
            spatialFunction = 'ST_Contains';
            break;
          case 'within':
            spatialFunction = 'ST_Within';
            break;
          case 'intersects':
          default:
            spatialFunction = 'ST_Intersects';
            break;
        }

        const query = sql`
          SELECT d.*
          FROM ${divisionTable} d
          WHERE ${spatialFunction}(
            d.geom,
            ST_GeomFromGeoJSON(${JSON.stringify(geojson)})
          )
          AND d.country_accounts_id = ${tenantContext.countryAccountId};
        `;

        const results = await tx.execute(query);
        return results.rows;
      } catch (error) {
        logger.error('Failed to execute spatial query', { error, geojson, options });
        if (error instanceof GeoDataError) {
          throw error;
        }
        throw new DatabaseError('Failed to get divisions by spatial query', {
          error,
          options,
          geojson
        });
      }
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new TransactionError('Failed to execute spatial query transaction', { error });
  }
}

/**
 * Updates geometry data for all divisions that have GeoJSON but no geometry
 * This function is used to fix data inconsistencies when divisions have been imported
 * without proper geometry conversion
 * 
 * @param tenantContext - Tenant context for filtering divisions by tenant
 * @returns Object with count of updated divisions and any errors
 */
export async function updateMissingGeometryForDivisions(tenantContext: TenantContext): Promise<{ updated: number; errors: string[] }> {
  const errors: string[] = [];
  let updated = 0;

  try {
    return await dr.transaction(async (tx: Tx) => {
      // Find divisions with geojson but no geometry
      const divisionsToUpdate = await tx.query.divisionTable.findMany({
        where: and(
          eq(divisionTable.countryAccountsId, tenantContext.countryAccountId),
          sql`${divisionTable.geojson} IS NOT NULL`,
          sql`${divisionTable.geom} IS NULL`
        ),
        columns: {
          id: true,
          geojson: true
        }
      });

      logger.info(`Found ${divisionsToUpdate.length} divisions with missing geometry for tenant ${tenantContext.countryAccountId}`);

      // Process each division
      for (const division of divisionsToUpdate) {
        try {
          if (!division.geojson) continue;

          // Update geometry using PostGIS functions
          await tx.execute(sql`
            UPDATE ${divisionTable}
            SET 
              geom = ST_GeomFromGeoJSON(${JSON.stringify(division.geojson)}),
              bbox = ST_Envelope(ST_GeomFromGeoJSON(${JSON.stringify(division.geojson)}))
            WHERE id = ${division.id}
          `);

          // Generate spatial index
          await tx.execute(sql`
            UPDATE ${divisionTable}
            SET spatial_index = ST_GeoHash(ST_Centroid(geom), 10)
            WHERE id = ${division.id} AND geom IS NOT NULL
          `);

          updated++;
        } catch (error) {
          const errorMessage = `Failed to update geometry for division ID ${division.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          logger.error(errorMessage);
          errors.push(errorMessage);
        }
      }

      logger.info(`Successfully updated geometry for ${updated} divisions`);
      return { updated, errors };
    });
  } catch (error) {
    const errorMessage = `Transaction failed during geometry update: ${error instanceof Error ? error.message : 'Unknown error'}`;
    logger.error(errorMessage);
    errors.push(errorMessage);
    return { updated, errors };
  }
}

export async function getDivisionsByBoundingBox(
  bbox: [number, number, number, number],
  options: {
    relationshipType?: 'intersects' | 'contains' | 'within';
  } = {},
  tenantContext: TenantContext
): Promise<any[]> {
  try {
    return await dr.transaction(async () => {
      try {
        // Validate bounding box coordinates
        const [minLon, minLat, maxLon, maxLat] = bbox;

        if (minLon >= maxLon || minLat >= maxLat) {
          throw new ValidationError('Invalid bounding box: min values must be less than max values', {
            bbox,
            details: `[${minLon}, ${minLat}, ${maxLon}, ${maxLat}]`
          });
        }

        if (Math.abs(minLat) > 90 || Math.abs(maxLat) > 90 || Math.abs(minLon) > 180 || Math.abs(maxLon) > 180) {
          throw new ValidationError('Invalid bounding box: coordinates out of range', {
            bbox,
            details: 'Latitude must be between -90 and 90, longitude between -180 and 180'
          });
        }

        // Convert bbox to GeoJSON polygon
        const bboxPolygon = {
          type: 'Polygon',
          coordinates: [[
            [minLon, minLat],
            [maxLon, minLat],
            [maxLon, maxLat],
            [minLon, maxLat],
            [minLon, minLat]
          ]]
        };

        // Use spatial query function
        return await getDivisionsBySpatialQuery(bboxPolygon, options, tenantContext);
      } catch (error) {
        logger.error('Failed to get divisions by bounding box', { error, bbox, options });
        if (error instanceof ValidationError) {
          throw error;
        }
        throw new DatabaseError('Failed to get divisions by bounding box', {
          error,
          bbox,
          options
        });
      }
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new TransactionError('Failed to execute bounding box query transaction', { error });
  }
}
