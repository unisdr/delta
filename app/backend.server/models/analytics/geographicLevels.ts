import { dr } from "~/db.server";
import { divisionTable } from "~/drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Geographic Levels Data Model
 * 
 * Purpose:
 * - Contains database queries for geographic levels data
 * - Provides data access layer for geographic divisions
 */

/**
 * Interface for Geographic Level data structure
 * Based on your Drizzle schema types
 */
export interface GeographicLevel {
    id: number;
    name: Record<string, string>; // Based on your schema, this appears to be a JSON object
    level: number;
    parentId: number | null;
}

/**
 * Get geographic levels (regions)
 * 
 * @returns {Promise<GeographicLevel[]>} Array of geographic levels
 */
export async function getGeographicLevels(): Promise<GeographicLevel[]> {
    try {
        const query = dr
            .select({
                id: divisionTable.id,
                name: divisionTable.name,
                level: divisionTable.level ?? 1, // Ensure level is never null
                parentId: divisionTable.parentId,
            })
            .from(divisionTable)
            .where(
                and(
                    eq(divisionTable.level, 1), // Only level 1 divisions (regions)
                )
            );

        const levels = await query;
        // Ensure all returned objects match the GeographicLevel interface
        return levels.map(level => ({
            ...level,
            level: level.level ?? 1, // Ensure level is never null
        }));
    } catch (error) {
        console.error("Database error fetching geographic levels:", error);
        throw new Error("Failed to query geographic levels from database");
    }
}

/**
 * Get geographic levels by specific level number
 * 
 * @param {number} levelNumber - The division level to filter by
 * @returns {Promise<GeographicLevel[]>} Array of geographic levels for the specified level
 */
export async function getGeographicLevelsByLevel(
    levelNumber: number
): Promise<GeographicLevel[]> {
    try {
        const query = dr
            .select({
                id: divisionTable.id,
                name: divisionTable.name,
                level: divisionTable.level ?? 1, // Ensure level is never null
                parentId: divisionTable.parentId,
            })
            .from(divisionTable)
            .where(
                and(
                    eq(divisionTable.level, levelNumber),
                )
            );

        const levels = await query;
        // Ensure all returned objects match the GeographicLevel interface
        return levels.map(level => ({
            ...level,
            level: level.level ?? 1, // Ensure level is never null
        }));
    } catch (error) {
        console.error("Database error fetching geographic levels by level:", error);
        throw new Error("Failed to query geographic levels by level from database");
    }
}

/**
 * Get geographic level by ID
 * 
 * @param {number} levelId - The specific division ID
 * @returns {Promise<GeographicLevel | null>} Single geographic level or null if not found
 */
export async function getGeographicLevelById(
    levelId: number
): Promise<GeographicLevel | null> {
    try {
        const query = dr
            .select({
                id: divisionTable.id,
                name: divisionTable.name,
                level: divisionTable.level ?? 1, // Ensure level is never null
                parentId: divisionTable.parentId,
            })
            .from(divisionTable)
            .where(
                and(
                    eq(divisionTable.id, levelId),
                )
            )
            .limit(1);

        const levels = await query;
        if (levels.length === 0) return null;

        // Ensure the returned object matches the GeographicLevel interface
        return {
            ...levels[0],
            level: levels[0].level ?? 1, // Ensure level is never null
        };
    } catch (error) {
        console.error("Database error fetching geographic level by ID:", error);
        throw new Error("Failed to query geographic level by ID from database");
    }
}