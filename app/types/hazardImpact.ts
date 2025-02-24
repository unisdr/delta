import type { DisasterImpactMetadata } from "./disasterCalculations";

export interface HazardImpactData {
    eventsCount: HazardDataPoint[];
    damages: HazardDataPoint[];
    losses: HazardDataPoint[];
    metadata: DisasterImpactMetadata;
}

export interface HazardDataPoint {
    hazardId: string;
    hazardName: string;
    value: string;
    percentage: number;
}

export interface HazardImpactFilters {
    sectorId?: string;
    hazardTypeId?: string;
    hazardClusterId?: string;
    specificHazardId?: string;
    geographicLevelId?: string;
    fromDate?: string;
    toDate?: string;
    disasterEventId?: string;
    _disasterEventId?: string;
    assessmentType?: 'rapid' | 'detailed';
    confidenceLevel?: 'low' | 'medium' | 'high';
}

export interface HazardImpactResult {
    eventsCount: HazardDataPoint[];
    damages: HazardDataPoint[];
    losses: HazardDataPoint[];
    metadata: DisasterImpactMetadata;
}

export interface HazardImpactResponse {
    success: boolean;
    data?: HazardImpactData;
    error?: string;
}
