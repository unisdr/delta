import { getEffectDetails } from "~/backend.server/models/analytics/effectDetails";

/**
 * Custom error class for effect details related errors
 */
export class EffectDetailsError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'EffectDetailsError';
  }
}

/**
 * Handler for processing effect details requests
 * 
 * @param {Object} params - Filter parameters for the effect details query
 * @returns {Promise<Object>} Filtered effect details data
 * @throws {EffectDetailsError} When validation fails or data cannot be retrieved
 * 
 * Error Codes:
 * - INVALID_PARAMS: Filter parameters failed validation
 * - DB_ERROR: Database operation failed
 * - DATE_RANGE_ERROR: Invalid date range specified
 */
export async function getEffectDetailsHandler(params: {
  sectorId: string | null;
  subSectorId: string | null;
  hazardTypeId: string | null;
  hazardClusterId: string | null;
  specificHazardId: string | null;
  geographicLevelId: string | null;
  fromDate: string | null;
  toDate: string | null;
  disasterEventId: string | null;
}) {
  try {
    // Validate date parameters
    if (params.fromDate && params.toDate) {
      const fromDate = new Date(params.fromDate);
      const toDate = new Date(params.toDate);

      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        throw new EffectDetailsError('Invalid date format provided', 'INVALID_PARAMS');
      }

      if (fromDate > toDate) {
        throw new EffectDetailsError('Start date must be before end date', 'DATE_RANGE_ERROR');
      }
    }

    // Validate numeric parameters
    if (params.sectorId && isNaN(Number(params.sectorId))) {
      throw new EffectDetailsError('Invalid sector ID format', 'INVALID_PARAMS');
    }
    if (params.geographicLevelId && isNaN(Number(params.geographicLevelId))) {
      throw new EffectDetailsError('Invalid geographic level ID format', 'INVALID_PARAMS');
    }

    // Log request parameters for monitoring
    console.info('Processing effect details request', {
      timestamp: new Date().toISOString(),
      params,
      requestId: crypto.randomUUID()
    });

    const data = await getEffectDetails(params);

    // Log successful response metrics
    console.info('Effect details request completed', {
      timestamp: new Date().toISOString(),
      damagesCount: data.damages.length,
      lossesCount: data.losses.length,
      disruptionsCount: data.disruptions.length
    });

    return {
      success: true,
      data,
    };
  } catch (error) {
    // Enhance error information
    const errorDetails = {
      timestamp: new Date().toISOString(),
      params,
      error: error instanceof Error ? error.message : 'Unknown error'
    };

    if (error instanceof EffectDetailsError) {
      console.error('Effect details request failed with known error:', errorDetails);
      throw error;
    }

    console.error('Effect details request failed with unexpected error:', errorDetails);
    throw new EffectDetailsError(
      'Failed to retrieve effect details',
      'DB_ERROR'
    );
  }
}
