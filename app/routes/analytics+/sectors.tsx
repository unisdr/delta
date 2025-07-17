import { useState, useEffect, useCallback } from "react";
import type { MetaFunction } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";
import { redirect } from "@remix-run/node";

import { authLoaderPublicOrWithPerm } from "~/util/auth";
import { requireTenantContext } from "~/util/tenant";
import { NavSettings } from "~/routes/settings/nav";
import { MainContainer } from "~/frontend/container";

import ErrorBoundary from "~/frontend/components/ErrorBoundary";

import Filters from "~/frontend/analytics/sectors/sections/Filters";
import ImpactOnSector from "~/frontend/analytics/sectors/sections/ImpactOnSector";
import ImpactByHazard from "~/frontend/analytics/sectors/sections/ImpactByHazard";
import ImpactMap from "~/frontend/analytics/sectors/sections/ImpactMap";
import EffectDetails from "~/frontend/analytics/sectors/sections/EffectDetails";
import MostDamagingEvents from "~/frontend/analytics/sectors/sections/MostDamagingEvents";

import { getCountrySettingsFromSession } from "~/util/session";
import { getImpactOnSector } from "~/backend.server/handlers/analytics/ImpactonSectors";
import { handleGeographicImpactQuery } from "~/backend.server/handlers/analytics/geographicImpact";
import { getHazardImpact } from "~/backend.server/handlers/analytics/hazardImpact";
import { getEffectDetailsHandler } from "~/backend.server/handlers/analytics/effectDetails";
import { handleMostDamagingEventsRequest } from "~/backend.server/handlers/analytics/mostDamagingEvents";
import { getSectorsWithSubsectors } from "~/backend.server/handlers/analytics/sectorsHandlers";
import { getGeographicLevelsHandler } from "~/backend.server/handlers/analytics/geographicLevelsHandler";
import { getDisasterEvents } from "~/backend.server/handlers/analytics/disaster-events";
import { getHazardTypes } from "~/backend.server/handlers/analytics/hazard-types";
import { getHazardClustersHandler } from "~/backend.server/handlers/analytics/hazard-clusters";
import { getSpecificHazardsHandler } from "~/backend.server/handlers/analytics/specific-hazards";
import { getRelatedHazardDataHandler } from "~/backend.server/handlers/analytics/related-hazard-data";

import type { HazardImpactFilters } from "~/types/hazardImpact";

// Define the type for filters to match what the component expects
interface Filters {
  disasterEventId: string | null;
  sectorId: string | null;
  hazardTypeId: string | null;
  hazardClusterId: string | null;
  specificHazardId: string | null;
  geographicLevelId: string | null;
  fromDate: string | null;
  toDate: string | null;
  subSectorId: string | null;
  assessmentType?: 'rapid' | 'detailed';
  confidenceLevel?: 'low' | 'medium' | 'high';
}

// Define the type for the API response expected by the ImpactOnSector component
interface ApiResponse {
  success: boolean;
  data: {
    eventCount: number;
    totalDamage: string;
    totalLoss: string;
    eventsOverTime: Record<string, string>;
    damageOverTime: Record<string, string>;
    lossOverTime: Record<string, string>;
    dataAvailability: {
      damage: string;
      loss: string;
    };
  };
}

// Define the type for the hazard impact API response
interface HazardImpactApiResponse {
  success: boolean;
  data: {
    eventsCount: Array<{
      hazardId: string; // Changed from number to string to match actual data
      hazardName: string;
      value: string;
      percentage: number;
    }>;
    damages: Array<{
      hazardId: string; // Changed from number to string to match actual data
      hazardName: string;
      value: string;
      percentage: number;
    }>;
    losses: Array<{
      hazardId: string; // Changed from number to string to match actual data
      hazardName: string;
      value: string;
      percentage: number;
    }>;
  };
}


/**
 * Loader with authentication restriction for sectors analytics page
 * 
 * @param {LoaderFunctionArgs} args - Loader function arguments
 * @returns {Promise<{ settings: any, currency: string, sectorImpactData?: any, requestId: string }>} - User settings and sector impact data
 */
export const loader = authLoaderPublicOrWithPerm("ViewData", async (loaderArgs: any) => {
  const { request, userSession } = loaderArgs;

  // TEMPORARY RESTRICTION: Redirect unauthenticated users to unauthorized page
  // This is a temporary measure until business rules for public access are defined
  if (!userSession) {
    return redirect("/error/unauthorized?reason=content-not-published");
  }

  try {
    // Get tenant context from session using requireTenantContext
    const tenantContext = userSession ? await requireTenantContext(userSession) : undefined;

    // Parse URL to extract query parameters
    const url = new URL(request.url);
    const sectorId = url.searchParams.get("sectorId");
    const subSectorId = url.searchParams.get("subSectorId");
    const hazardTypeId = url.searchParams.get("hazardTypeId");
    const hazardClusterId = url.searchParams.get("hazardClusterId");
    const specificHazardId = url.searchParams.get("specificHazardId");
    const geographicLevelId = url.searchParams.get("geographicLevelId");
    const fromDate = url.searchParams.get("fromDate");
    const toDate = url.searchParams.get("toDate");
    const disasterEventId = url.searchParams.get("disasterEventId");

    // Get currency from instanceSystemSettings via session
    const settings = await getCountrySettingsFromSession(loaderArgs.request);
    let currency = "USD"; // Default fallback
    if (settings && settings.currencyCodes) {
      currency = settings.currencyCodes.split(",")[0];
    }

    // Prepare filters object
    const filters: Filters = {
      disasterEventId,
      sectorId,
      hazardTypeId,
      hazardClusterId,
      specificHazardId,
      geographicLevelId,
      fromDate,
      toDate,
      subSectorId
    };

    // Only fetch sector impact data if we have a sector ID
    let sectorImpactData: ApiResponse | null = null;
    let hazardImpactData: HazardImpactApiResponse | null = null;
    let geographicImpactData: any = null;
    let effectDetailsData: any = null;
    let mostDamagingEventsData: any = null;

    // Variables for hazard-related data
    let hazardTypesData: any = null;
    let hazardClustersData: any = null;
    let specificHazardsData: any = null;
    let sectorsData = null;
    let geographicLevelsData = null;
    let disasterEventsData = null;

    // Fetch sectors data for dynamic titles
    try {
      sectorsData = await getSectorsWithSubsectors();
    } catch (error) {
      console.error('LOADER ERROR - Failed to fetch sectors data:', error);
      sectorsData = null;
    }

    // Fetch hazard types data
    try {
      const hazardTypes = await getHazardTypes();
      hazardTypesData = { hazardTypes };
    } catch (error) {
      console.error('LOADER ERROR - Failed to fetch hazard types data:', error);
      hazardTypesData = null;
    }



    // Fetch hazard clusters data
    try {
      if (hazardTypeId) {
        // Fetch clusters using the handler with the specific hazardTypeId
        const clusters = await getHazardClustersHandler(hazardTypeId);

        // Ensure clusters is always an array
        const clusterArray = Array.isArray(clusters) ? clusters : [];

        // Assign the clusters to the hazardClustersData object
        hazardClustersData = { clusters: clusterArray };
      } else {
        // If no hazardTypeId is provided, fetch all clusters
        const allClusters = await getHazardClustersHandler();
        hazardClustersData = { clusters: allClusters };
      }
    } catch (error) {
      console.error('LOADER ERROR - Failed to fetch hazard clusters data:', error);
      hazardClustersData = { clusters: [] };
    }


    // Fetch ALL specific hazards data regardless of hazardClusterId
    try {
      // Fetch all specific hazards without filtering by cluster
      const allHazards = await getSpecificHazardsHandler();
      specificHazardsData = { hazards: allHazards };
    } catch (error) {
      console.error('LOADER ERROR - Failed to fetch specific hazards data:', error);
      specificHazardsData = { hazards: [] };
    }

    // Fetch geographic levels data for filters
    try {
      if (tenantContext) {
        const geographicLevelsResponse = await getGeographicLevelsHandler(tenantContext);
        if (geographicLevelsResponse.success && geographicLevelsResponse.levels) {
          geographicLevelsData = geographicLevelsResponse;
        } else {
          console.error('LOADER ERROR - Failed to fetch geographic levels data:', geographicLevelsResponse.error);
          geographicLevelsData = null;
        }
      } else {
        console.error('LOADER ERROR - Missing tenant context for geographic levels');
        geographicLevelsData = null;
      }
    } catch (error) {
      console.error('LOADER ERROR - Failed to fetch geographic levels data:', error);
      geographicLevelsData = null;
    }

    // Fetch disaster events data for filters
    try {
      if (tenantContext) {
        // Get raw data from handler
        const rawDisasterEvents = await getDisasterEvents(tenantContext);

        // Format it to match the original API response structure
        disasterEventsData = { disasterEvents: rawDisasterEvents };

      } else {
        console.error('LOADER ERROR - Missing tenant context for disaster events');
        disasterEventsData = null;
      }
    } catch (error) {
      console.error('LOADER ERROR - Failed to fetch disaster events data:', error);
      disasterEventsData = null;
    }

    if (sectorId || subSectorId) {
      // Convert filters to the format expected by the handlers
      const handlerFilters = {
        startDate: filters.fromDate,
        endDate: filters.toDate,
        hazardType: filters.hazardTypeId,
        hazardCluster: filters.hazardClusterId,
        specificHazard: filters.specificHazardId,
        geographicLevel: filters.geographicLevelId,
        disasterEvent: filters.disasterEventId
      };

      // Call the handler directly with tenant context
      if (!tenantContext) {
        console.error('LOADER ERROR - No valid tenant context available');
        return {
          settings,
          currency,
          sectorImpactData: null,
          hazardImpactData: null,
          geographicImpactData: null
        };
      }

      // Fetch sector impact data
      const sectorHandlerResponse = await getImpactOnSector(tenantContext, subSectorId || sectorId || "", handlerFilters, currency);

      // Transform handler response to match the ApiResponse type expected by ImpactOnSector
      if (sectorHandlerResponse.success && sectorHandlerResponse.data) {
        sectorImpactData = {
          success: sectorHandlerResponse.success,
          data: {
            eventCount: sectorHandlerResponse.data.eventCount,
            totalDamage: sectorHandlerResponse.data.totalDamage || "0",
            totalLoss: sectorHandlerResponse.data.totalLoss || "0",
            eventsOverTime: sectorHandlerResponse.data.eventsOverTime || {},
            damageOverTime: sectorHandlerResponse.data.damageOverTime || {},
            lossOverTime: sectorHandlerResponse.data.lossOverTime || {},
            dataAvailability: sectorHandlerResponse.data.dataAvailability || {
              damage: "no_data",
              loss: "no_data"
            }
          }
        };
      }

      // Fetch hazard impact data
      try {
        // Convert filters to the format expected by the hazard impact handler
        const hazardFilters: HazardImpactFilters = {
          sectorId: subSectorId || sectorId || "",
          hazardTypeId: filters.hazardTypeId || undefined,
          hazardClusterId: filters.hazardClusterId || undefined,
          specificHazardId: filters.specificHazardId || undefined,
          geographicLevelId: filters.geographicLevelId || undefined,
          fromDate: filters.fromDate || undefined,
          toDate: filters.toDate || undefined,
          disasterEventId: filters.disasterEventId || undefined
        };

        const hazardHandlerResponse = await getHazardImpact(tenantContext, hazardFilters);

        if (hazardHandlerResponse.success && hazardHandlerResponse.data) {

          hazardImpactData = {
            success: hazardHandlerResponse.success,
            data: {
              eventsCount: hazardHandlerResponse.data.eventsCount || [],
              damages: hazardHandlerResponse.data.damages || [],
              losses: hazardHandlerResponse.data.losses || []
            }
          };

        }
      } catch (error) {
        hazardImpactData = null;
      }
      // Fetch geographic impact data
      try {

        // Convert filters to the format expected by the geographic impact handler
        const geoFilters = {
          sectorId: subSectorId || sectorId || undefined,
          subSectorId: subSectorId || undefined,
          hazardTypeId: filters.hazardTypeId || undefined,
          hazardClusterId: filters.hazardClusterId || undefined,
          specificHazardId: filters.specificHazardId || undefined,
          geographicLevelId: filters.geographicLevelId || undefined,
          fromDate: filters.fromDate || undefined,
          toDate: filters.toDate || undefined,
          disasterEventId: filters.disasterEventId || undefined
        };

        const geoHandlerResponse = await handleGeographicImpactQuery(tenantContext, geoFilters);

        if (geoHandlerResponse) {
          // Transform the handler response into proper GeoJSON format
          if (geoHandlerResponse.success && geoHandlerResponse.divisions) {
            const features = geoHandlerResponse.divisions.map(division => ({
              type: "Feature",
              geometry: division.geojson,
              properties: {
                id: division.id,
                name: division.name,
                level: division.level,
                parentId: division.parentId,
                values: geoHandlerResponse.values[division.id.toString()] || {
                  totalDamage: 0,
                  totalLoss: 0,
                  metadata: {
                    assessmentType: filters.assessmentType || 'rapid',
                    confidenceLevel: filters.confidenceLevel || 'low'
                  },
                  dataAvailability: 'no_data'
                }
              }
            }));

            geographicImpactData = {
              type: "FeatureCollection",
              features
            };

          } else {
            geographicImpactData = { type: "FeatureCollection", features: [] };
          }
        } else {
          geographicImpactData = { type: "FeatureCollection", features: [] };
        }
      } catch (error) {
        geographicImpactData = { type: "FeatureCollection", features: [] };
      }
    }

    // Fetch effect details data
    try {
      // Convert filters to the format expected by the effect details handler
      const effectDetailsFilters = {
        sectorId: subSectorId || sectorId || null,
        subSectorId: subSectorId || null,
        hazardTypeId: filters.hazardTypeId || null,
        hazardClusterId: filters.hazardClusterId || null,
        specificHazardId: filters.specificHazardId || null,
        geographicLevelId: filters.geographicLevelId || null,
        fromDate: filters.fromDate || null,
        toDate: filters.toDate || null,
        disasterEventId: filters.disasterEventId || null
      };

      // Ensure tenantContext is defined before calling the handler
      if (tenantContext) {
        const effectDetailsResponse = await getEffectDetailsHandler(tenantContext, effectDetailsFilters);

        if (effectDetailsResponse && effectDetailsResponse.success) {
          effectDetailsData = effectDetailsResponse;
        } else {
          effectDetailsData = null;
        }
      } else {
        console.error('LOADER ERROR - Cannot fetch effect details: tenant context is undefined');
        effectDetailsData = null;
      }
    } catch (error) {
      console.error('LOADER ERROR - Failed to fetch effect details data:', error);
      effectDetailsData = null;
    }

    // Fetch most damaging events data
    try {
      // Convert filters to the format expected by the most damaging events handler
      const mostDamagingEventsFilters = {
        sectorId: subSectorId || sectorId || null,
        subSectorId: subSectorId || null,
        hazardTypeId: filters.hazardTypeId || null,
        hazardClusterId: filters.hazardClusterId || null,
        specificHazardId: filters.specificHazardId || null,
        geographicLevelId: filters.geographicLevelId || null,
        fromDate: filters.fromDate || null,
        toDate: filters.toDate || null,
        disasterEventId: filters.disasterEventId || null,
        sortBy: 'damages',
        sortDirection: 'desc'
      };

      // Ensure tenantContext is defined before calling the handler
      if (tenantContext) {
        const mostDamagingEventsResponse = await handleMostDamagingEventsRequest(tenantContext, mostDamagingEventsFilters);

        if (mostDamagingEventsResponse && mostDamagingEventsResponse.success) {
          mostDamagingEventsData = mostDamagingEventsResponse;
        } else {
          mostDamagingEventsData = null;
        }
      } else {
        mostDamagingEventsData = null;
      }
    } catch (error) {
      mostDamagingEventsData = null;
    }

    // Fetch related hazard data for cascading filters if specificHazardId is provided
    let relatedHazardData = null;
    try {
      if (filters.specificHazardId) {
        relatedHazardData = await getRelatedHazardDataHandler(filters.specificHazardId);
      }
    } catch (error) {
      console.error('LOADER ERROR - Failed to fetch related hazard data:', error);
      relatedHazardData = null;
    }

    return {
      settings,
      currency,
      sectorImpactData,
      hazardImpactData,
      geographicImpactData,
      effectDetailsData,
      mostDamagingEventsData,
      sectorsData: { sectors: sectorsData },
      geographicLevelsData,
      disasterEventsData,
      hazardTypesData,
      hazardClustersData,
      specificHazardsData,
      relatedHazardData
    };

  } catch (error) {
    console.error("Failed to load sectors analytics data", {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    // Re-throw the error after logging
    throw error;
  }
});

// Meta function for page SEO
export const meta: MetaFunction = () => {
  return [
    { title: "Sectors Analysis - DTS" },
    { name: "description", content: "Sector analysis page under DTS." },
  ];
};
function SectorsAnalysisContent() {
  // Get data from loader
  const {
    currency,
    sectorImpactData,
    hazardImpactData,
    geographicImpactData,
    effectDetailsData,
    mostDamagingEventsData,
    sectorsData,
    geographicLevelsData,
    disasterEventsData,
    // Destructure hazard-related data
    hazardTypesData,
    hazardClustersData,
    specificHazardsData } = useLoaderData<typeof loader>();

  const submit = useSubmit();

  const [filters, setFilters] = useState<{
    sectorId: string | null;
    subSectorId: string | null;
    hazardTypeId: string | null;
    hazardClusterId: string | null;
    specificHazardId: string | null;
    geographicLevelId: string | null;
    fromDate: string | null;
    toDate: string | null;
    disasterEventId: string | null;
    assessmentType?: 'rapid' | 'detailed';
    confidenceLevel?: 'low' | 'medium' | 'high';
  } | null>(null);

  // Add loading state to track filter application
  const [pendingFilters, setPendingFilters] = useState<typeof filters>(null);

  // Apply debounced filters
  useEffect(() => {
    // Create a no-op cleanup function for code paths that don't need cleanup
    const noop = () => { };

    if (pendingFilters !== null) {
      try {
        // Update the URL with new filter parameters
        const url = new URL(window.location.href);

        // Clear existing parameters
        url.searchParams.delete("sectorId");
        url.searchParams.delete("subSectorId");
        url.searchParams.delete("hazardTypeId");
        url.searchParams.delete("hazardClusterId");
        url.searchParams.delete("specificHazardId");
        url.searchParams.delete("geographicLevelId");
        url.searchParams.delete("fromDate");
        url.searchParams.delete("toDate");
        url.searchParams.delete("disasterEventId");

        // Add new parameters if they exist
        if (pendingFilters.sectorId) url.searchParams.set("sectorId", pendingFilters.sectorId);
        if (pendingFilters.subSectorId) url.searchParams.set("subSectorId", pendingFilters.subSectorId);
        if (pendingFilters.hazardTypeId) url.searchParams.set("hazardTypeId", pendingFilters.hazardTypeId);
        if (pendingFilters.hazardClusterId) url.searchParams.set("hazardClusterId", pendingFilters.hazardClusterId);
        if (pendingFilters.specificHazardId) url.searchParams.set("specificHazardId", pendingFilters.specificHazardId);
        if (pendingFilters.geographicLevelId) url.searchParams.set("geographicLevelId", pendingFilters.geographicLevelId);
        if (pendingFilters.fromDate) url.searchParams.set("fromDate", pendingFilters.fromDate);
        if (pendingFilters.toDate) url.searchParams.set("toDate", pendingFilters.toDate);
        if (pendingFilters.disasterEventId) url.searchParams.set("disasterEventId", pendingFilters.disasterEventId);

        // Now set the filters in the state
        setFilters(pendingFilters);

        // Submit the form to trigger a loader reload with the new filters
        const formData = new FormData();
        if (pendingFilters.sectorId) formData.append("sectorId", pendingFilters.sectorId);
        if (pendingFilters.subSectorId) formData.append("subSectorId", pendingFilters.subSectorId);
        if (pendingFilters.hazardTypeId) formData.append("hazardTypeId", pendingFilters.hazardTypeId);
        if (pendingFilters.hazardClusterId) formData.append("hazardClusterId", pendingFilters.hazardClusterId);
        if (pendingFilters.specificHazardId) formData.append("specificHazardId", pendingFilters.specificHazardId);
        if (pendingFilters.geographicLevelId) formData.append("geographicLevelId", pendingFilters.geographicLevelId);
        if (pendingFilters.fromDate) formData.append("fromDate", pendingFilters.fromDate);
        if (pendingFilters.toDate) formData.append("toDate", pendingFilters.toDate);
        if (pendingFilters.disasterEventId) formData.append("disasterEventId", pendingFilters.disasterEventId);

        // Submit the form to reload the loader data
        submit(formData, { method: "get", replace: true });

        // Simulate network delay for demonstration
        const timer = setTimeout(() => {

        }, 500);

        return () => clearTimeout(timer);
      } catch (error) {
        console.error("Error applying filters", {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          businessCritical: false,
          operation: 'applyFilters'
        });

        return noop; // Return no-op cleanup function in error case
      }
    }
    // Return no-op cleanup function for the case when debouncedFilters is null
    return noop;
  }, [pendingFilters]);

  // Event handlers for Filters component
  const handleApplyFilters = useCallback((newFilters: typeof filters) => {
    setPendingFilters(newFilters);
  }, []);

  const handleAdvancedSearch = useCallback(() => {
    // TODO: Implement advanced search functionality
  }, []);

  const handleClearFilters = useCallback(() => {
    setPendingFilters(null);
    setFilters(null);
  }, []);

  return (
    <MainContainer title="Sectors Analysis" headerExtra={<NavSettings />}>
      <div style={{ maxWidth: "100%", overflow: "hidden" }}>
        {/* Main content - only shown when JavaScript is enabled */}
        <div className="sectors-page" >
          {/* Filters Section */}
          <ErrorBoundary>
            <Filters
              onApplyFilters={handleApplyFilters}
              onAdvancedSearch={handleAdvancedSearch}
              onClearFilters={handleClearFilters}
              sectorsData={sectorsData}
              geographicLevelsData={geographicLevelsData}
              disasterEventsData={disasterEventsData}
              hazardTypesData={hazardTypesData}
              hazardClustersData={hazardClustersData}
              specificHazardsData={specificHazardsData}
            />
          </ErrorBoundary>

          {/* Conditional rendering: Display this message until filters are applied */}
          {!filters && (
            <div
              style={{
                marginTop: "2rem",
                textAlign: "center",
                padding: "2rem",
                borderRadius: "8px",
                backgroundColor: "#f9f9f9",
                color: "#333",
                fontSize: "1.6rem",
                lineHeight: "1.8rem",
              }}
            >
              <h3 style={{ color: "#004f91", fontSize: "2rem", marginBottom: "1rem" }}>
                Welcome to the Sectors Dashboard! 🌟
              </h3>
              <p>Please select and apply filters above to view the analysis.</p>
            </div>
          )}

          {/* Dashboard sections */}
          {filters && (
            <>
              <div style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: "1rem",
                marginBottom: "1rem",
                gap: "1rem"
              }}>

              </div>



              <div
                className="sectors-content"
                style={{
                  marginTop: "1rem",
                  maxWidth: "100%",
                  overflow: "hidden",
                  position: "relative",
                  minHeight: "800px" // Prevent layout shift
                }}
              >
                {/* Impact on Selected Sector */}
                {filters.sectorId && (
                  <div className="space-y-8" style={{ minHeight: "300px" }}>
                    <ErrorBoundary>
                      <ImpactOnSector
                        sectorId={filters.sectorId}
                        filters={filters}
                        currency={currency}
                        sectorImpactData={sectorImpactData}
                        sectorsData={sectorsData}
                      />
                    </ErrorBoundary>
                  </div>
                )}

                {/* Impact by Hazard Section */}
                <div style={{ minHeight: "400px" }}>
                  <ErrorBoundary>
                    <ImpactByHazard
                      filters={filters}
                      currency={currency}
                      hazardImpactData={hazardImpactData}
                      sectorsData={sectorsData}
                    />
                  </ErrorBoundary>
                </div>

                {/* Impact by Geographic Level */}
                <div style={{ minHeight: "500px" }}>
                  <ErrorBoundary>
                    <ImpactMap filters={filters} currency={currency} geographicImpactData={geographicImpactData} sectorsData={sectorsData} />
                  </ErrorBoundary>
                </div>

                {/* Effect Details Section */}
                <div style={{ minHeight: "400px" }}>
                  <ErrorBoundary>
                    <EffectDetails filters={filters} currency={currency} effectDetailsData={effectDetailsData} sectorsData={sectorsData} />
                  </ErrorBoundary>
                </div>

                {/* Most Damaging Events Section */}
                <div style={{ minHeight: "300px" }}>
                  <ErrorBoundary>
                    <MostDamagingEvents
                      filters={filters}
                      currency={currency}
                      mostDamagingEventsData={mostDamagingEventsData}
                      sectorsData={sectorsData}
                    />
                  </ErrorBoundary>
                </div>
              </div>
            </>
          )}

          <p></p>
          <div className="dts-caption mt-4">
            * Data shown is based on published records
          </div>
        </div>
      </div>
    </MainContainer>
  );
}

// Wrapper component that provides QueryClient
export default function SectorsAnalysis() {
  return <SectorsAnalysisContent />;
}