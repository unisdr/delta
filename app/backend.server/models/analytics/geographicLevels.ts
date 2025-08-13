import { dr } from "~/db.server";
import { divisionTable } from "~/drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Geographic Levels Data Model
 * 
 * Purpose:
 * - Contains database queries for geographic levels data
 * - Provides data access layer for geographic divisions
 * - Handles tenant-specific data filtering at database level
 */

/**
 * Interface for Geographic Level data structure
 * Based on your Drizzle schema types
 */
export interface GeographicLevel {
    id: string;
    name: Record<string, string>; // Based on your schema, this appears to be a JSON object
    level: number;
    parentId: string | null;
}

/**
 * Get geographic levels (regions) for a specific tenant
 * 
 * @param {string} countryAccountId - The tenant's country account ID for data isolation (as string)
 * @returns {Promise<GeographicLevel[]>} Array of geographic levels
 */
export async function getGeographicLevels(countryAccountId: string): Promise<GeographicLevel[]> {
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
                    eq(divisionTable.countryAccountsId, countryAccountId) // Tenant isolation
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
 * @param {string} countryAccountId - The tenant's country account ID
 * @param {number} levelNumber - The division level to filter by
 * @returns {Promise<GeographicLevel[]>} Array of geographic levels for the specified level
 */
export async function getGeographicLevelsByLevel(
    countryAccountId: string,
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
                    eq(divisionTable.countryAccountsId, countryAccountId)
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
 * @param {string} countryAccountId - The tenant's country account ID
 * @param {number} levelId - The specific division ID
 * @returns {Promise<GeographicLevel | null>} Single geographic level or null if not found
 */
export async function getGeographicLevelById(
    countryAccountId: string,
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
                    eq(divisionTable.level, levelId),
                    eq(divisionTable.countryAccountsId, countryAccountId)
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