/**
 * Geographic data validation utilities
 * Provides validation functions for GeoJSON, CSV structure, and hierarchical relationships
 */
import { z } from 'zod';

// Supported language codes for validation
export const SUPPORTED_LANGUAGES = ['en', 'fr', 'es', 'ar', 'ru', 'zh', 'ja'];

// GeoJSON validation schemas
const geometryPointSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([z.number(), z.number()]).or(z.tuple([z.number(), z.number(), z.number()]))
});

const geometryLineStringSchema = z.object({
  type: z.literal('LineString'),
  coordinates: z.array(z.tuple([z.number(), z.number()]).or(z.tuple([z.number(), z.number(), z.number()])))
    .min(2, 'LineString must have at least 2 coordinates')
});

const geometryPolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(
    z.array(z.tuple([z.number(), z.number()]).or(z.tuple([z.number(), z.number(), z.number()])))
      .min(4, 'Polygon ring must have at least 4 coordinates')
  ).min(1, 'Polygon must have at least one ring')
});

const geometryMultiPointSchema = z.object({
  type: z.literal('MultiPoint'),
  coordinates: z.array(z.tuple([z.number(), z.number()]).or(z.tuple([z.number(), z.number(), z.number()])))
});

const geometryMultiLineStringSchema = z.object({
  type: z.literal('MultiLineString'),
  coordinates: z.array(
    z.array(z.tuple([z.number(), z.number()]).or(z.tuple([z.number(), z.number(), z.number()])))
      .min(2, 'LineString must have at least 2 coordinates')
  )
});

const geometryMultiPolygonSchema = z.object({
  type: z.literal('MultiPolygon'),
  coordinates: z.array(
    z.array(
      z.array(z.tuple([z.number(), z.number()]).or(z.tuple([z.number(), z.number(), z.number()])))
        .min(4, 'Polygon ring must have at least 4 coordinates')
    ).min(1, 'Polygon must have at least one ring')
  )
});

// Forward declaration of geometry schema type
type GeometrySchema = z.ZodDiscriminatedUnion<"type", [
  typeof geometryPointSchema, 
  typeof geometryLineStringSchema,
  typeof geometryPolygonSchema,
  typeof geometryMultiPointSchema,
  typeof geometryMultiLineStringSchema,
  typeof geometryMultiPolygonSchema,
  z.ZodObject<{
    type: z.ZodLiteral<"GeometryCollection">;
    geometries: z.ZodArray<z.ZodLazy<any>>;
  }>
]>;

// Define geometry collection schema with proper typing
const geometryCollectionSchema: z.ZodObject<{
  type: z.ZodLiteral<"GeometryCollection">;
  geometries: z.ZodArray<z.ZodLazy<GeometrySchema>>;
}> = z.object({
  type: z.literal('GeometryCollection'),
  geometries: z.array(z.lazy(() => geometrySchema as GeometrySchema))
});

// Define the geometry schema with proper type annotation
export const geometrySchema: GeometrySchema = z.discriminatedUnion('type', [
  geometryPointSchema,
  geometryLineStringSchema,
  geometryPolygonSchema,
  geometryMultiPointSchema,
  geometryMultiLineStringSchema,
  geometryMultiPolygonSchema,
  geometryCollectionSchema
]);

export const featureSchema = z.object({
  type: z.literal('Feature'),
  geometry: geometrySchema.nullable(),
  properties: z.record(z.any()).optional(),
  id: z.string().or(z.number()).optional()
});

export const featureCollectionSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(featureSchema),
  bbox: z.array(z.number()).optional()
});

export const geoJSONSchema = z.union([
  geometrySchema,
  featureSchema,
  featureCollectionSchema
]);

/**
 * Validates GeoJSON structure
 * @param data - The GeoJSON data to validate
 * @returns Validation result with success flag and error message if failed
 */
export function validateGeoJSON(data: unknown): { 
  valid: boolean; 
  error?: string;
  data?: any;
} {
  try {
    // First check if it's valid JSON if it's a string
    let jsonData = data;
    if (typeof data === 'string') {
      try {
        jsonData = JSON.parse(data);
      } catch (e) {
        return { valid: false, error: 'Invalid JSON format: ' + (e as Error).message };
      }
    }
    
    // Validate against GeoJSON schema
    const result = geoJSONSchema.safeParse(jsonData);
    
    if (!result.success) {
      return { 
        valid: false, 
        error: 'Invalid GeoJSON structure: ' + result.error.errors.map(e => 
          `${e.path.join('.')}: ${e.message}`
        ).join('; ')
      };
    }
    
    // Additional validation for coordinate ranges
    const validationResult = validateCoordinateRanges(jsonData);
    if (!validationResult.valid) {
      return validationResult;
    }
    
    return { valid: true, data: jsonData };
  } catch (e) {
    return { valid: false, error: 'GeoJSON validation error: ' + (e as Error).message };
  }
}

/**
 * Validates that coordinates are within valid ranges for WGS84
 * @param geoJson - The GeoJSON object to validate
 * @returns Validation result with success flag and error message if failed
 */
function validateCoordinateRanges(geoJson: any): { valid: boolean; error?: string } {
  try {
    // Helper function to validate a single coordinate
    const validateCoord = (coord: number[], path: string): string | null => {
      if (coord.length < 2) return `${path}: Coordinate must have at least 2 values`;
      const [lon, lat] = coord;
      
      if (lon < -180 || lon > 180) return `${path}: Longitude ${lon} out of range (-180 to 180)`;
      if (lat < -90 || lat > 90) return `${path}: Latitude ${lat} out of range (-90 to 90)`;
      
      return null;
    };
    
    // Recursively process coordinates based on geometry type
    const processGeometry = (geometry: any, path: string): string | null => {
      if (!geometry) return null;
      
      switch (geometry.type) {
        case 'Point':
          return validateCoord(geometry.coordinates, `${path}.coordinates`);
          
        case 'LineString':
        case 'MultiPoint':
          for (let i = 0; i < geometry.coordinates.length; i++) {
            const error = validateCoord(geometry.coordinates[i], `${path}.coordinates[${i}]`);
            if (error) return error;
          }
          return null;
          
        case 'Polygon':
        case 'MultiLineString':
          for (let i = 0; i < geometry.coordinates.length; i++) {
            for (let j = 0; j < geometry.coordinates[i].length; j++) {
              const error = validateCoord(geometry.coordinates[i][j], `${path}.coordinates[${i}][${j}]`);
              if (error) return error;
            }
          }
          return null;
          
        case 'MultiPolygon':
          for (let i = 0; i < geometry.coordinates.length; i++) {
            for (let j = 0; j < geometry.coordinates[i].length; j++) {
              for (let k = 0; k < geometry.coordinates[i][j].length; k++) {
                const error = validateCoord(geometry.coordinates[i][j][k], `${path}.coordinates[${i}][${j}][${k}]`);
                if (error) return error;
              }
            }
          }
          return null;
          
        case 'GeometryCollection':
          for (let i = 0; i < geometry.geometries.length; i++) {
            const error = processGeometry(geometry.geometries[i], `${path}.geometries[${i}]`);
            if (error) return error;
          }
          return null;
          
        default:
          return `${path}: Unknown geometry type: ${geometry.type}`;
      }
    };
    
    // Process based on GeoJSON type
    let error: string | null = null;
    
    if (geoJson.type === 'Feature') {
      error = processGeometry(geoJson.geometry, 'geometry');
    } else if (geoJson.type === 'FeatureCollection') {
      for (let i = 0; i < geoJson.features.length; i++) {
        error = processGeometry(geoJson.features[i].geometry, `features[${i}].geometry`);
        if (error) break;
      }
    } else {
      // Assume it's a geometry object
      error = processGeometry(geoJson, '');
    }
    
    if (error) {
      return { valid: false, error };
    }
    
    return { valid: true };
  } catch (e) {
    return { valid: false, error: 'Coordinate validation error: ' + (e as Error).message };
  }
}

/**
 * Validates CSV structure for division import
 * @param headers - CSV header row
 * @param rows - CSV data rows
 * @returns Validation result with success flag and error message if failed
 */
export function validateCSVStructure(
  headers: string[], 
  rows: string[][]
): { valid: boolean; error?: string } {
  try {
    // Check required columns
    const requiredColumns = ['id', 'parent', 'geodata'];
    for (const col of requiredColumns) {
      if (!headers.includes(col)) {
        return { valid: false, error: `Required column '${col}' is missing` };
      }
    }
    
    // Validate language columns (all columns after the first 3)
    const languageColumns = headers.slice(3);
    const invalidLangs = languageColumns.filter(lang => !SUPPORTED_LANGUAGES.includes(lang));
    
    if (invalidLangs.length > 0) {
      return { 
        valid: false, 
        error: `Invalid language code(s): ${invalidLangs.join(', ')}. Supported languages are: ${SUPPORTED_LANGUAGES.join(', ')}` 
      };
    }
    
    // Check if at least one language column exists
    if (languageColumns.length === 0) {
      return { valid: false, error: 'At least one language column is required' };
    }
    
    // Validate row structure
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      // Check row length
      if (row.length !== headers.length) {
        return { 
          valid: false, 
          error: `Row ${i + 1} has ${row.length} columns, but ${headers.length} were expected` 
        };
      }
      
      // Check for empty required fields
      const id = row[headers.indexOf('id')].trim();
      if (!id) {
        return { valid: false, error: `Row ${i + 1} has an empty 'id' field` };
      }
      
      // Ensure at least one language name is provided
      let hasLanguageName = false;
      for (const lang of languageColumns) {
        const langIndex = headers.indexOf(lang);
        if (row[langIndex] && row[langIndex].trim()) {
          hasLanguageName = true;
          break;
        }
      }
      
      if (!hasLanguageName) {
        return { 
          valid: false, 
          error: `Row ${i + 1} (id: ${id}) does not have a name in any language` 
        };
      }
    }
    
    return { valid: true };
  } catch (e) {
    return { valid: false, error: 'CSV validation error: ' + (e as Error).message };
  }
}

/**
 * Detects circular references in division hierarchy
 * @param divisions - Map of divisions with their parent relationships
 * @returns Validation result with success flag and error message if circular reference found
 */
export function detectCircularReferences(
  divisions: Record<string, { parent: string; name: Record<string, string>; geodata: string }>
): { valid: boolean; error?: string } {
  // For each division, traverse up the parent chain to detect cycles
  for (const id of Object.keys(divisions)) {
    const visited = new Set<string>();
    let currentId = id;
    
    while (currentId) {
      // If we've seen this ID before, we have a cycle
      if (visited.has(currentId)) {
        // Reconstruct the cycle path for the error message
        const cycle = [];
        let cycleId = currentId;
        do {
          cycle.push(cycleId);
          cycleId = divisions[cycleId]?.parent;
        } while (cycleId !== currentId);
        
        cycle.push(currentId); // Complete the cycle
        
        return { 
          valid: false, 
          error: `Circular reference detected: ${cycle.join(' → ')}` 
        };
      }
      
      visited.add(currentId);
      
      // Move to parent (if exists)
      const parent = divisions[currentId]?.parent;
      if (!parent) break;
      
      // Check if parent exists in our divisions
      if (!divisions[parent]) {
        // Not a circular reference, but parent is missing
        // This will be handled by parent-child validation
        break;
      }
      
      currentId = parent;
    }
  }
  
  return { valid: true };
}

/**
 * Validates parent-child relationships in division hierarchy
 * @param divisions - Map of divisions with their parent relationships
 * @returns Validation result with success flag and error details if validation fails
 */
export function validateParentChildRelationships(
  divisions: Record<string, { parent: string; name: Record<string, string>; geodata: string }>
): { 
  valid: boolean; 
  error?: string;
  missingParents?: Array<{ id: string; parent: string }>;
} {
  const missingParents: Array<{ id: string; parent: string }> = [];
  
  // Check that all referenced parents exist
  for (const [id, division] of Object.entries(divisions)) {
    if (division.parent && !divisions[division.parent]) {
      missingParents.push({ id, parent: division.parent });
    }
  }
  
  if (missingParents.length > 0) {
    const examples = missingParents.slice(0, 3).map(item => 
      `Division '${item.id}' references non-existent parent '${item.parent}'`
    ).join('; ');
    
    const additional = missingParents.length > 3 
      ? ` and ${missingParents.length - 3} more` 
      : '';
    
    return { 
      valid: false, 
      error: `Missing parent references: ${examples}${additional}`,
      missingParents
    };
  }
  
  return { valid: true };
}
