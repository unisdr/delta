import {
    getGeographicLevels,
    getGeographicLevelsByLevel,
    getGeographicLevelById,
    type GeographicLevel
} from "~/backend.server/models/analytics/geographicLevels";

/**
 * Geographic Levels Handler
 * 
 * Purpose:
 * - Contains business logic for geographic levels operations
 * - Handles validation, error handling, and response formatting
 * - Provides interface between routes/loaders and data models
 */

/**
 * Response interface for geographic levels operations
 */
export interface GeographicLevelsResponse {
    success: boolean;
    levels?: GeographicLevel[];
    error?: string;
}

/**
 * Single geographic level response interface
 */
export interface GeographicLevelResponse {
    success: boolean;
    level?: GeographicLevel;
    error?: string;
}

/**
 * Get geographic levels for filters dropdown
 * 
 * Purpose:
 * - Provides a list of all available geographic levels for the Filters component
 * - Used to populate the geographic level dropdown in the UI
 * - Returns only essential data (id, name, level) to keep response size minimal
 * 
 * @param {TenantContext} countryAccountsId - The tenant context for data isolation
 * @returns {Promise<GeographicLevelsResponse>} Geographic levels data with success status
 */
export async function getGeographicLevelsHandler(countryAccountsId: string): Promise<GeographicLevelsResponse> {
    try {
        // Validate tenant context
        if (!countryAccountsId) {
            return {
                success: false,
                error: "Invalid tenant context provided"
            };
        }

        // Get geographic levels from model - pass countryAccountId as string
        const levels = await getGeographicLevels(countryAccountsId);

        // Validate response
        if (!Array.isArray(levels)) {
            return {
                success: false,
                error: "Invalid data format received from database"
            };
        }

        // Return formatted response
        return {
            success: true,
            levels
        };
    } catch (error) {
        console.error("Handler error fetching geographic levels:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to fetch geographic levels"
        };
    }
}

/**
 * Get geographic levels by specific level number
 * 
 * @param {string} countryAccountsId - The tenant context for data isolation
 * @param {number} levelNumber - The division level to filter by
 * @returns {Promise<GeographicLevelsResponse>} Geographic levels data for the specified level
 */
export async function getGeographicLevelsByLevelHandler(
    countryAccountsId: string,
    levelNumber: number
): Promise<GeographicLevelsResponse> {
    try {
        // Validate input parameters
        if (!countryAccountsId || !countryAccountsId) {
            return {
                success: false,
                error: "Invalid tenant context provided"
            };
        }

        if (!Number.isInteger(levelNumber) || levelNumber < 1) {
            return {
                success: false,
                error: "Invalid level number provided"
            };
        }

        // Get geographic levels from model - pass countryAccountId as string
        const levels = await getGeographicLevelsByLevel(countryAccountsId.toString(), levelNumber);

        return {
            success: true,
            levels
        };
    } catch (error) {
        console.error("Handler error fetching geographic levels by level:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to fetch geographic levels by level"
        };
    }
}

/**
 * Get single geographic level by ID
 * 
 * @param {string} countryAccountsId - The tenant context for data isolation
 * @param {number} levelId - The specific division ID
 * @returns {Promise<GeographicLevelResponse>} Single geographic level data
 */
export async function getGeographicLevelByIdHandler(
    countryAccountsId: string,
    levelId: number
): Promise<GeographicLevelResponse> {
    try {
        // Validate input parameters
        if (!countryAccountsId || !countryAccountsId) {
            return {
                success: false,
                error: "Invalid tenant context provided"
            };
        }

        if (!Number.isInteger(levelId) || levelId < 1) {
            return {
                success: false,
                error: "Invalid level ID provided"
            };
        }

        // Get geographic level from model - pass countryAccountId as string
        const level = await getGeographicLevelById(countryAccountsId.toString(), levelId);

        if (!level) {
            return {
                success: false,
                error: "Geographic level not found"
            };
        }

        return {
            success: true,
            level
        };
    } catch (error) {
        console.error("Handler error fetching geographic level by ID:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to fetch geographic level"
        };
    }
}