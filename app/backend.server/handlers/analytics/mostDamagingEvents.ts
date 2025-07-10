import { getMostDamagingEvents, type MostDamagingEventsParams, type SortColumn, type SortDirection } from "~/backend.server/models/analytics/mostDamagingEvents";
import { sanitizeInput } from "~/utils/security";
import { createAssessmentMetadata } from "~/backend.server/utils/disasterCalculations";
import { TenantContext } from "~/util/tenant";

interface MostDamagingEventsRequestParams {
  sectorId: string | null;
  subSectorId: string | null;
  hazardTypeId: string | null;
  hazardClusterId: string | null;
  specificHazardId: string | null;
  geographicLevelId: string | null;
  fromDate: string | null;
  toDate: string | null;
  disasterEventId: string | null;
  sortBy?: string | null;
  sortDirection?: string | null;
}

const VALID_SORT_COLUMNS: readonly SortColumn[] = ['damages', 'losses', 'eventName', 'createdAt'] as const;

export async function handleMostDamagingEventsRequest(tenantContext: TenantContext, params: MostDamagingEventsRequestParams) {
  try {
    // Create assessment metadata for logging
    const metadata = await createAssessmentMetadata('rapid', 'medium');
    console.log('Starting most damaging events request:', {
      metadata,
      tenantId: tenantContext.countryAccountId,
      requestParams: { ...params, sectorId: params.sectorId ? '[REDACTED]' : null }
    });

    // Validate and sanitize all input parameters
    const sanitizedParams = {
      sectorId: params.sectorId ? sanitizeInput(String(params.sectorId)) : null,
      subSectorId: params.subSectorId ? sanitizeInput(String(params.subSectorId)) : null,
      hazardTypeId: params.hazardTypeId ? sanitizeInput(String(params.hazardTypeId)) : null,
      hazardClusterId: params.hazardClusterId ? sanitizeInput(String(params.hazardClusterId)) : null,
      specificHazardId: params.specificHazardId ? sanitizeInput(String(params.specificHazardId)) : null,
      geographicLevelId: params.geographicLevelId ? sanitizeInput(String(params.geographicLevelId)) : null,
      fromDate: params.fromDate ? sanitizeInput(String(params.fromDate)) : null,
      toDate: params.toDate ? sanitizeInput(String(params.toDate)) : null,
      disasterEventId: params.disasterEventId ? sanitizeInput(String(params.disasterEventId)) : null,
    };

    // Validate sort parameters
    let sortBy: SortColumn = 'damages';
    const sortParam = sanitizeInput(params.sortBy || '');
    if (sortParam && VALID_SORT_COLUMNS.includes(sortParam as SortColumn)) {
      sortBy = sortParam as SortColumn;
    }

    // Validate sort direction
    let sortDirection: SortDirection = 'desc';
    const directionParam = sanitizeInput(params.sortDirection || '');
    if (directionParam === 'asc') {
      sortDirection = 'asc';
    }

    // Prepare sanitized parameters for model
    const modelParams: MostDamagingEventsParams = {
      ...sanitizedParams,
      page: 1,
      pageSize: 20,
      sortBy,
      sortDirection,
    };

    // Get the data from the model with tenant context
    const result = await getMostDamagingEvents(tenantContext, modelParams);

    console.log('Successfully processed most damaging events request', {
      metadata,
      resultCount: result.events.length
    });

    return {
      success: true,
      data: {
        events: result.events,
        pagination: result.pagination,
        metadata: {
          ...metadata,
          ...result.metadata
        }
      }
    };
  } catch (error) {
    console.error("Error in handleMostDamagingEventsRequest:", {
      error,
      params: { ...params, sectorId: params.sectorId ? '[REDACTED]' : null }
    });
    throw {
      success: false,
      error: "Failed to fetch most damaging events. Please try again later.",
      code: 'QUERY_ERROR'
    };
  }
}