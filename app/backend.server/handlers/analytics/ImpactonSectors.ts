import { fetchSectorImpactData } from "~/backend.server/models/analytics/ImpactonSectors";

interface SectorImpactResponse {
  success: boolean;
  data?: {
    eventCount: number;
    totalDamage: string;
    totalLoss: string;
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

export const getImpactOnSector = async (sectorId: string, filters?: Filters): Promise<SectorImpactResponse> => {
  try {
    // Input validation
    if (!sectorId) {
      return {
        success: false,
        error: "Invalid sector ID provided",
      };
    }

    // Fetch data from the model
    const data = await fetchSectorImpactData(sectorId, filters);

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
