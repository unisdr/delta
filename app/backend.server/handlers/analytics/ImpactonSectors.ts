import { fetchSectorImpactData } from "~/backend.server/models/analytics/ImpactonSectors";
import { TenantContext } from "~/util/tenant";

interface SectorImpactResponse {
  success: boolean;
  data?: {
    eventCount: number;
    totalDamage: string | null;
    totalLoss: string | null;
    eventsOverTime: { [key: string]: string };
    damageOverTime: { [key: string]: string };
    lossOverTime: { [key: string]: string };
  };
  error?: string;
}

interface Filters {
  startDate?: string | null;
  endDate?: string | null;
  hazardType?: string | null;
  hazardCluster?: string | null;
  specificHazard?: string | null;
  geographicLevel?: string | null;
  disasterEvent?: string | null;
}

export const getImpactOnSector = async (tenantContext: TenantContext, sectorId: string, filters?: Filters): Promise<SectorImpactResponse> => {
  try {
    // Input validation
    if (!sectorId) {
      return {
        success: false,
        error: "Invalid sector ID provided",
      };
    }

    // Fetch data from the model with tenant context for isolation
    const data = await fetchSectorImpactData(tenantContext, sectorId, filters);

    // Return successful response
    return {
      success: true,
      data
    };
  } catch (error) {
    console.error("Error in getImpactOnSector:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred"
    };
  }
};
