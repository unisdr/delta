import { fetchDisasterEvents } from "~/backend.server/models/analytics/disaster-events";
import { TenantContext } from "~/util/tenant";

/**
 * Handler to get disaster events with business logic.
 * @param tenantContext The tenant context for filtering by country account
 * @param query Search query string (optional).
 * @returns Array of disaster events with applied transformations.
 */
export const getDisasterEvents = async (tenantContext: TenantContext, query?: string) => {
  try {
    // Fetch the full QueryResult object from the model with tenant isolation
    const result = await fetchDisasterEvents(tenantContext, query);

    // Return the full QueryResult object as is
    return result;
  } catch (error) {
    console.error(`[getDisasterEvents] Error for tenant=${tenantContext.countryAccountId}:`, error);
    throw new Error("Failed to fetch disaster events");
  }
};
