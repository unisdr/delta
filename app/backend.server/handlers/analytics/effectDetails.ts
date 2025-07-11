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
 * Interface for pagination parameters
 */
interface PaginationParams {
  page: number;
  pageSize: number;
  table?: 'damages' | 'losses' | 'disruptions';
}

// PaginatedResponse type is used in the implementation but not directly exposed

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
interface EffectDetailsHandlerParams {
  sectorId: string | number | null;
  subSectorId: string | number | null;
  hazardTypeId: string | null;
  hazardClusterId: string | null;
  specificHazardId: string | null;
  geographicLevelId: string | null;
  fromDate: string | null;
  toDate: string | null;
  disasterEventId: string | null;
  page?: number;
  pageSize?: number;
  table?: 'damages' | 'losses' | 'disruptions';
}

// normalizeId is kept for future use in ID normalization

export async function getEffectDetailsHandler(params: EffectDetailsHandlerParams) {
  // Set default pagination values if not provided
  const pagination: PaginationParams = {
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 10,
    table: params.table
  };

  // Validate pagination parameters
  if (pagination.page < 1) {
    throw new EffectDetailsError('Page must be greater than 0', 'INVALID_PAGINATION');
  }
  if (![10, 20, 30, 40, 50].includes(pagination.pageSize)) {
    throw new EffectDetailsError('Page size must be one of: 10, 20, 30, 40, 50', 'INVALID_PAGINATION');
  }
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

    // Get the full data first (we'll handle pagination in memory for now)
    // In a production environment with large datasets, you'd want to push this down to the database level
    const fullData = await getEffectDetails(params);

    // Apply pagination based on the requested table
    let paginatedData: any;
    let totalItems: number;

    if (pagination.table) {
      // If a specific table is requested, paginate just that table
      const tableData = fullData[pagination.table];
      totalItems = tableData.length;
      const startIndex = (pagination.page - 1) * pagination.pageSize;
      const endIndex = Math.min(startIndex + pagination.pageSize, totalItems);

      paginatedData = {
        [pagination.table]: tableData.slice(startIndex, endIndex),
        pagination: {
          total: totalItems,
          page: pagination.page,
          pageSize: pagination.pageSize,
          totalPages: Math.ceil(totalItems / pagination.pageSize)
        }
      };
    } else {
      // If no specific table is requested, return all data with counts
      // Note: This is not ideal for large datasets and should be avoided in production
      totalItems = Math.max(
        fullData.damages.length,
        fullData.losses.length,
        fullData.disruptions.length
      );

      paginatedData = {
        ...fullData,
        pagination: {
          total: totalItems,
          page: pagination.page,
          pageSize: pagination.pageSize,
          totalPages: Math.ceil(totalItems / pagination.pageSize)
        }
      };
    }

    // Log successful response metrics
    console.info('Effect details request completed', {
      timestamp: new Date().toISOString(),
      damagesCount: fullData.damages.length,
      lossesCount: fullData.losses.length,
      disruptionsCount: fullData.disruptions.length,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalItems: totalItems
      }
    });

    return {
      success: true,
      data: paginatedData
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
