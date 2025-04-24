import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { authLoaderPublicOrWithPerm } from "~/util/auth";
import { dr } from "~/db.server";
import { fetchSectorImpactData } from "~/backend.server/models/analytics/ImpactonSectors";
import { fetchHazardImpactData } from "~/backend.server/models/analytics/hazardImpact";
import { getGeographicImpact } from "~/backend.server/models/analytics/geographicImpact";
import { getEffectDetails } from "~/backend.server/models/analytics/effectDetails";
import { getMostDamagingEvents } from "~/backend.server/models/analytics/mostDamagingEvents";
import type { HazardImpactFilters } from "~/types/hazardImpact";
import type { MostDamagingEventsParams } from "~/backend.server/models/analytics/mostDamagingEvents";
import { eq } from "drizzle-orm";
import {
  sectorTable,
  hipTypeTable,
  disasterEventTable,
  hipClusterTable as hazardClusterTable,
  hipHazardTable as specificHazardTable,
  divisionTable as geographicLevelTable
} from "~/drizzle/schema";

// Define shared filter types to match frontend
interface ExportFilters {
  sectorId: string;
  subSectorId: string | null;
  hazardTypeId: string | null;
  hazardClusterId: string | null;
  specificHazardId: string | null;
  geographicLevelId: string | null;
  fromDate: string | null;
  toDate: string | null;
  disasterEventId: string | null;
}

// Define types for export response
interface ExportResponse {
  sectorImpact: any;
  hazardImpact: any;
  geographicImpact: any;
  effectDetails: any;
  mostDamagingEvents: any;
  filters: ExportFilters;
  generatedAt: string;
  filterNames: {
    sectorName: string;
    subSectorName: string;
    hazardTypeName: string;
    hazardClusterName: string;
    specificHazardName: string;
    geographicLevelName: string;
    disasterEventName: string;
  };
  sectorIdToNameMap: Record<number, string>;
}

// Define types for effect details
export interface Damage {
  id: string;
  type: string;
  assetName: string;
  totalDamageAmount: string;
  totalRepairReplacement: string;
  totalRecovery: string;
  sectorId: number;
}

export interface Loss {
  id: string;
  type: string;
  description: string;
  publicUnit: string;
  publicUnits: number;
  publicCostTotal: string;
  privateUnit: string;
  privateUnits: number;
  privateCostTotal: string;
  sectorId: number;
}

export interface Disruption {
  id: string;
  comment: string;
  durationDays: number;
  usersAffected: number;
  peopleAffected: number;
  responseCost: string;
  sectorId: number;
}

export interface EffectDetailsResponse {
  damages: Damage[];
  losses: Loss[];
  disruptions: Disruption[];
}

// Custom error handler to ensure JSON responses
const handleError = (error: unknown) => {
  if (error instanceof Error) {
    if (error.message.includes('timeout')) {
      return json({ error: 'Request timed out. Please try again.', timestamp: new Date().toISOString() }, { status: 504 });
    }
    if (error.message.includes('database')) {
      return json({ error: 'Database error occurred. Please try again later.', timestamp: new Date().toISOString() }, { status: 503 });
    }
  }
  return json(
    {
      error: 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    },
    {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
};

// const cleanParam = (value: string | null): string | null =>
//   !value || value === "null" ? null : value;

const validateFilter = (value: string | null): string | null => {
  if (!value || value === "null" || value.trim() === "") return null;
  if (value.length > 255) return null; // Prevent potential SQL injection
  return value;
};

// Helper functions to get filter names
const getSectorName = async (id: string) => {
  const result = await dr
    .select({ name: sectorTable.sectorname })
    .from(sectorTable)
    .where(eq(sectorTable.id, parseInt(id)))
    .then((result) => result[0]?.name || 'All');
  return result;
};

const getHazardTypeName = async (id: string) => {
  const result = await dr
    .select({ name: hipTypeTable.nameEn })
    .from(hipTypeTable)
    .where(eq(hipTypeTable.id, id))
    .then((result) => result[0]?.name || 'All');
  return result;
};

const getHazardClusterName = async (id: string) => {
  const result = await dr
    .select({ name: hazardClusterTable.nameEn })
    .from(hazardClusterTable)
    .where(eq(hazardClusterTable.id, id))
    .then((result) => result[0]?.name || 'All');
  return result;
};

const getSpecificHazardName = async (id: string) => {
  const result = await dr
    .select({ name: specificHazardTable.nameEn })
    .from(specificHazardTable)
    .where(eq(specificHazardTable.id, id))
    .then((result) => result[0]?.name || 'All');
  return result;
};

const getGeographicLevelName = async (id: string) => {
  const result = await dr
    .select({ name: geographicLevelTable.name })
    .from(geographicLevelTable)
    .where(eq(geographicLevelTable.id, parseInt(id)))
    .then((result) => result[0]?.name || 'All');
  return result;
};

const getDisasterEventName = async (id: string) => {
  const result = await dr
    .select({ name: disasterEventTable.nameNational })
    .from(disasterEventTable)
    .where(eq(disasterEventTable.id, id))
    .then((result) => result[0]?.name || 'All');
  return result;
};

const resolveFilterNames = async (filters: ExportFilters) => {
  const [sector, subSector, hazardType, hazardCluster, specificHazard, geoLevel, disasterEvent] = await Promise.all([
    filters.sectorId ? getSectorName(filters.sectorId) : null,
    filters.subSectorId ? getSectorName(filters.subSectorId) : null,
    filters.hazardTypeId ? getHazardTypeName(filters.hazardTypeId) : null,
    filters.hazardClusterId ? getHazardClusterName(filters.hazardClusterId) : null,
    filters.specificHazardId ? getSpecificHazardName(filters.specificHazardId) : null,
    filters.geographicLevelId ? getGeographicLevelName(String(filters.geographicLevelId)) : null,
    filters.disasterEventId ? getDisasterEventName(filters.disasterEventId) : null
  ]);

  return {
    sectorName: sector || 'All',
    subSectorName: subSector || 'All',
    hazardTypeName: hazardType || 'All',
    hazardClusterName: hazardCluster || 'All',
    specificHazardName: specificHazard || 'All',
    geographicLevelName: geoLevel?.toString() || 'All',
    disasterEventName: disasterEvent || 'All'
  };
};

export const loader = authLoaderPublicOrWithPerm("ViewData", async (args: LoaderFunctionArgs) => {
  try {
    const url = new URL(args.request.url);

    const sectorId = url.searchParams.get("sectorId");
    if (!sectorId) {
      return json(
        { error: "Sector ID is required", timestamp: new Date().toISOString() },
        { status: 400 }
      );
    }

    const commonFilters: ExportFilters = {
      sectorId,
      subSectorId: validateFilter(url.searchParams.get("subSectorId")),
      hazardTypeId: validateFilter(url.searchParams.get("hazardTypeId")),
      hazardClusterId: validateFilter(url.searchParams.get("hazardClusterId")),
      specificHazardId: validateFilter(url.searchParams.get("specificHazardId")),
      geographicLevelId: validateFilter(url.searchParams.get("geographicLevelId")),
      fromDate: validateFilter(url.searchParams.get("fromDate")),
      toDate: validateFilter(url.searchParams.get("toDate")),
      disasterEventId: validateFilter(url.searchParams.get("disasterEventId")),
    };

    const hazardFilters: HazardImpactFilters = {
      sectorId: commonFilters.subSectorId ?? sectorId,
      hazardTypeId: commonFilters.hazardTypeId || undefined,
      hazardClusterId: commonFilters.hazardClusterId || undefined,
      specificHazardId: commonFilters.specificHazardId || undefined,
      geographicLevelId: commonFilters.geographicLevelId || undefined,
      fromDate: commonFilters.fromDate || undefined,
      toDate: commonFilters.toDate || undefined,
      disasterEventId: commonFilters.disasterEventId || undefined
    };

    const geographicFilters = {
      sectorId,
      subSectorId: commonFilters.subSectorId ?? undefined,
      hazardTypeId: commonFilters.hazardTypeId ?? undefined,
      hazardClusterId: commonFilters.hazardClusterId ?? undefined,
      specificHazardId: commonFilters.specificHazardId ?? undefined,
      geographicLevelId: commonFilters.geographicLevelId ?? undefined,
      fromDate: commonFilters.fromDate ?? undefined,
      toDate: commonFilters.toDate ?? undefined,
      disasterEventId: commonFilters.disasterEventId ?? undefined
    };

    const mostDamagingParams: MostDamagingEventsParams = {
      sectorId: commonFilters.subSectorId ?? sectorId,
      subSectorId: commonFilters.subSectorId ?? null,
      hazardTypeId: commonFilters.hazardTypeId ?? null,
      hazardClusterId: commonFilters.hazardClusterId ?? null,
      specificHazardId: commonFilters.specificHazardId ?? null,
      geographicLevelId: commonFilters.geographicLevelId ?? null,
      fromDate: commonFilters.fromDate ?? null,
      toDate: commonFilters.toDate ?? null,
      disasterEventId: commonFilters.disasterEventId ?? null,
      page: 1,
      pageSize: 10,
      sortBy: 'damages',
      sortDirection: 'desc'
    };

    const sectorFilters = {
      startDate: commonFilters.fromDate,
      endDate: commonFilters.toDate,
      hazardType: commonFilters.hazardTypeId,
      hazardCluster: commonFilters.hazardClusterId,
      specificHazard: commonFilters.specificHazardId,
      geographicLevel: commonFilters.geographicLevelId,
      disasterEvent: commonFilters.disasterEventId,
      _disasterEventId: commonFilters.disasterEventId,
    };

    console.log('Fetching data with filters:', {
      sectorId,
      commonFilters,
      sectorFilters,
      hazardFilters,
      mostDamagingParams
    });

    // Fetch names for all filters
    const filterNames = await resolveFilterNames(commonFilters);

    const [
      sectorImpact,
      hazardImpact,
      geographicImpact,
      effectDetails,
      mostDamagingEvents
    ] = await Promise.all([
      fetchSectorImpactData(commonFilters.subSectorId ?? sectorId, sectorFilters),
      fetchHazardImpactData(hazardFilters),
      getGeographicImpact(geographicFilters),
      getEffectDetails(commonFilters),
      getMostDamagingEvents(mostDamagingParams)
    ]);

    // Extract unique sectorIds from damages, losses, disruptions
    const allSectorIds = new Set<number>();
    effectDetails.damages.forEach(d => allSectorIds.add(d.sectorId));
    effectDetails.losses.forEach(l => allSectorIds.add(l.sectorId));
    effectDetails.disruptions.forEach(d => allSectorIds.add(d.sectorId));

    // Resolve all sectorId -> name mapping
    const sectorIdToNameMap: Record<number, string> = {};
    await Promise.all([...allSectorIds].map(async (id) => {
      if (!sectorIdToNameMap[id]) {
        const name = await getSectorName(id.toString());
        sectorIdToNameMap[id] = name;
      }
    }));

    console.log('Fetched successfully:', {
      hasSectorImpact: !!sectorImpact,
      hasHazardImpact: !!hazardImpact,
      hasEffectDetails: !!effectDetails,
      hasMostDamagingEvents: !!mostDamagingEvents
    });

    return json<ExportResponse>({
      sectorImpact,
      hazardImpact,
      geographicImpact,
      effectDetails,
      mostDamagingEvents,
      filters: commonFilters,
      filterNames,
      sectorIdToNameMap,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Loader error:", error);
    return handleError(error);
  }
});
