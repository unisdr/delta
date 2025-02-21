export interface HazardImpactData {
    eventsCount: HazardDataPoint[];
    damages: HazardDataPoint[];
    losses: HazardDataPoint[];
}

export interface HazardDataPoint {
    hazardId: string;
    hazardName: string;
    value: number | string;
    percentage: number;
}

export interface HazardImpactFilters {
    sectorId: string | null;
    hazardTypeId: string | null;
    hazardClusterId: string | null;
    specificHazardId: string | null;
    geographicLevelId: string | null;
    fromDate: string | null;
    toDate: string | null;
}

export interface HazardImpactResponse {
    success: boolean;
    data?: HazardImpactData;
    error?: string;
}
