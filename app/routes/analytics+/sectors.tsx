import { useState, useEffect, useCallback } from "react";
import type { MetaFunction } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";


import { authLoaderPublicOrWithPerm } from "~/util/auth";
import { NavSettings } from "~/routes/settings/nav";
import { MainContainer } from "~/frontend/container";
import { ErrorMessage } from "~/frontend/components/ErrorMessage";
import ErrorBoundary from "~/frontend/components/ErrorBoundary";

import Filters from "~/frontend/analytics/sectors/sections/Filters";
import ImpactOnSector from "~/frontend/analytics/sectors/sections/ImpactOnSector";
import ImpactByHazard from "~/frontend/analytics/sectors/sections/ImpactByHazard";
import ImpactMap from "~/frontend/analytics/sectors/sections/ImpactMap";
import EffectDetails from "~/frontend/analytics/sectors/sections/EffectDetails";
import MostDamagingEvents from "~/frontend/analytics/sectors/sections/MostDamagingEvents";


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
  assessmentType?: "rapid" | "detailed";
  confidenceLevel?: "low" | "medium" | "high";
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



// JavaScript Disabled Message Component
function JavaScriptDisabledMessage() {
  return (
    <div className="dts-page-section">
      <div className="mg-container">
        <div className="dts-data-box" style={{ textAlign: "center", padding: "4rem 2rem" }}>
          <h2 className="dts-heading-2" style={{ color: "#c10920", marginBottom: "2rem" }}>
            JavaScript Required
          </h2>
          <ErrorMessage message="JavaScript is currently disabled in your browser. This interactive dashboard requires JavaScript to function properly." />
          <div style={{ marginTop: "2rem" }}>
            <h3 className="dts-heading-4" style={{ marginBottom: "1.6rem" }}>
              To enable JavaScript:
            </h3>
            <div className="dts-body-text" style={{ textAlign: "left", maxWidth: "600px", margin: "0 auto" }}>
              <strong>Chrome, Firefox, Safari, Edge:</strong>
              <ol style={{ marginLeft: "2rem", marginTop: "0.8rem" }}>
                <li>Click on the settings/menu icon in your browser</li>
                <li>Go to "Settings" or "Preferences"</li>
                <li>Find "Privacy & Security" or "Advanced"</li>
                <li>Look for "JavaScript" or "Site Settings"</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// import { utils as xlsxUtils, write as xlsxWrite } from 'xlsx';
// import { Damage, Loss, Disruption } from '~/routes/api+/analytics+/export-sector-analysis';


// Loader with public access or specific permission check for "ViewData"
export const loader = authLoaderPublicOrWithPerm("ViewData", async (loaderArgs: any) => {
  // Get currency from environment variable
  const currency = process.env.CURRENCY_CODES?.split(',')[0] || 'PHP';

  // Parse URL to extract query parameters
  const url = new URL(loaderArgs.request.url);
  const sectorId = url.searchParams.get("sectorId");
  const subSectorId = url.searchParams.get("subSectorId");
  const hazardTypeId = url.searchParams.get("hazardTypeId");
  const hazardClusterId = url.searchParams.get("hazardClusterId");
  const specificHazardId = url.searchParams.get("specificHazardId");
  const geographicLevelId = url.searchParams.get("geographicLevelId");
  const fromDate = url.searchParams.get("fromDate");
  const toDate = url.searchParams.get("toDate");
  const disasterEventId = url.searchParams.get("disasterEventId");


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
    subSectorId,
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
    console.error("LOADER ERROR - Failed to fetch sectors data:", error);
    sectorsData = null;
  }

  // Fetch hazard types data
  try {
    const hazardTypes = await getHazardTypes();
    hazardTypesData = { hazardTypes };
  } catch (error) {
    console.error(
      "LOADER ERROR - Failed to fetch hazard types data:",
      error
    );
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
    console.error(
      "LOADER ERROR - Failed to fetch hazard clusters data:",
      error
    );
    hazardClustersData = { clusters: [] };
  }

  // Fetch ALL specific hazards data regardless of hazardClusterId
  try {
    // Fetch all specific hazards without filtering by cluster
    const allHazards = await getSpecificHazardsHandler();
    specificHazardsData = { hazards: allHazards };
  } catch (error) {
    console.error(
      "LOADER ERROR - Failed to fetch specific hazards data:",
      error
    );
    specificHazardsData = { hazards: [] };
  }

  // Fetch geographic levels data for filters
  try {
    const geographicLevelsResponse = await getGeographicLevelsHandler();
    if (
      geographicLevelsResponse.success &&
      geographicLevelsResponse.levels
    ) {
      geographicLevelsData = geographicLevelsResponse;
    } else {
      console.error(
        "LOADER ERROR - Failed to fetch geographic levels data:",
        geographicLevelsResponse.error
      );
      geographicLevelsData = null;
    }
  } catch (error) {
    console.error(
      "LOADER ERROR - Failed to fetch geographic levels data:",
      error
    );
    geographicLevelsData = null;
  }

  // Fetch disaster events data for filters
  try {
    // Get raw data from handler
    const rawDisasterEvents = await getDisasterEvents();

    // Format it to match the original API response structure
    disasterEventsData = { disasterEvents: rawDisasterEvents };
  } catch (error) {
    console.error(
      "LOADER ERROR - Failed to fetch disaster events data:",
      error
    );
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
      disasterEvent: filters.disasterEventId,
    };

    // Fetch sector impact data
    const sectorHandlerResponse = await getImpactOnSector(
      subSectorId || sectorId || "",
      handlerFilters,
    );

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
            loss: "no_data",
          },
        },
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
        disasterEventId: filters.disasterEventId || undefined,
      };

      const hazardHandlerResponse = await getHazardImpact(
        hazardFilters
      );

      if (hazardHandlerResponse.success && hazardHandlerResponse.data) {
        hazardImpactData = {
          success: hazardHandlerResponse.success,
          data: {
            eventsCount: hazardHandlerResponse.data.eventsCount || [],
            damages: hazardHandlerResponse.data.damages || [],
            losses: hazardHandlerResponse.data.losses || [],
          },
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
        disasterEventId: filters.disasterEventId || undefined,
      };

      const geoHandlerResponse = await handleGeographicImpactQuery(
        geoFilters
      );

      if (geoHandlerResponse) {
        // Transform the handler response into proper GeoJSON format
        if (geoHandlerResponse.success && geoHandlerResponse.divisions) {
          const features = geoHandlerResponse.divisions.map((division) => ({
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
                  assessmentType: filters.assessmentType || "rapid",
                  confidenceLevel: filters.confidenceLevel || "low",
                },
                dataAvailability: "no_data",
              },
            },
          }));

          geographicImpactData = {
            type: "FeatureCollection",
            features,
          };
        } else {
          geographicImpactData = {
            type: "FeatureCollection",
            features: [],
          };
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
      disasterEventId: filters.disasterEventId || null,
    };

    const effectDetailsResponse = await getEffectDetailsHandler(
      effectDetailsFilters
    );

    if (effectDetailsResponse && effectDetailsResponse.success) {
      effectDetailsData = effectDetailsResponse;
    } else {
      effectDetailsData = null;
    }
  } catch (error) {
    console.error(
      "LOADER ERROR - Failed to fetch effect details data:",
      error
    );
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
      sortBy: "damages",
      sortDirection: "desc",
    };

    const mostDamagingEventsResponse =
      await handleMostDamagingEventsRequest(
        mostDamagingEventsFilters
      );

    if (mostDamagingEventsResponse && mostDamagingEventsResponse.success) {
      mostDamagingEventsData = mostDamagingEventsResponse;
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
      relatedHazardData = await getRelatedHazardDataHandler(
        filters.specificHazardId
      );
    }
  } catch (error) {
    console.error(
      "LOADER ERROR - Failed to fetch related hazard data:",
      error
    );
    relatedHazardData = null;
  }


  return {
    currency,
    loaderArgs,
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
    relatedHazardData,
  };
});

// Meta function for page SEO
export const meta: MetaFunction = () => {
  return [
    { title: "Sectors Analysis - DTS" },
    { name: "description", content: "Sector analysis page under DTS." },
  ];
};



// React component for Sectors Analysis page
function SectorsAnalysisContent() {
  const { currency, sectorImpactData, hazardImpactData, geographicImpactData, effectDetailsData, mostDamagingEventsData, sectorsData, geographicLevelsData, disasterEventsData, hazardTypesData, hazardClustersData, specificHazardsData } = useLoaderData<typeof loader>();

  const submit = useSubmit();

  // Effect to show content when JavaScript is enabled
  useEffect(() => {
    const jsContent = document.getElementById('js-content');
    if (jsContent) {
      jsContent.style.display = 'block';
    }
  }, []);

  // State declarations
  // const [isExportingExcel, setIsExportingExcel] = useState(false);
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
    assessmentType?: "rapid" | "detailed";
    confidenceLevel?: "low" | "medium" | "high";
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
        if (pendingFilters.sectorId)
          url.searchParams.set("sectorId", pendingFilters.sectorId);
        if (pendingFilters.subSectorId)
          url.searchParams.set("subSectorId", pendingFilters.subSectorId);
        if (pendingFilters.hazardTypeId)
          url.searchParams.set("hazardTypeId", pendingFilters.hazardTypeId);
        if (pendingFilters.hazardClusterId)
          url.searchParams.set(
            "hazardClusterId",
            pendingFilters.hazardClusterId
          );
        if (pendingFilters.specificHazardId)
          url.searchParams.set(
            "specificHazardId",
            pendingFilters.specificHazardId
          );
        if (pendingFilters.geographicLevelId)
          url.searchParams.set(
            "geographicLevelId",
            pendingFilters.geographicLevelId
          );
        if (pendingFilters.fromDate)
          url.searchParams.set("fromDate", pendingFilters.fromDate);
        if (pendingFilters.toDate)
          url.searchParams.set("toDate", pendingFilters.toDate);
        if (pendingFilters.disasterEventId)
          url.searchParams.set(
            "disasterEventId",
            pendingFilters.disasterEventId
          );

        // Now set the filters in the state
        setFilters(pendingFilters);

        // Submit the form to trigger a loader reload with the new filters
        const formData = new FormData();
        if (pendingFilters.sectorId)
          formData.append("sectorId", pendingFilters.sectorId);
        if (pendingFilters.subSectorId)
          formData.append("subSectorId", pendingFilters.subSectorId);
        if (pendingFilters.hazardTypeId)
          formData.append("hazardTypeId", pendingFilters.hazardTypeId);
        if (pendingFilters.hazardClusterId)
          formData.append("hazardClusterId", pendingFilters.hazardClusterId);
        if (pendingFilters.specificHazardId)
          formData.append("specificHazardId", pendingFilters.specificHazardId);
        if (pendingFilters.geographicLevelId)
          formData.append(
            "geographicLevelId",
            pendingFilters.geographicLevelId
          );
        if (pendingFilters.fromDate)
          formData.append("fromDate", pendingFilters.fromDate);
        if (pendingFilters.toDate)
          formData.append("toDate", pendingFilters.toDate);
        if (pendingFilters.disasterEventId)
          formData.append("disasterEventId", pendingFilters.disasterEventId);

        // Submit the form to reload the loader data
        submit(formData, { method: "get", replace: true });

        // Simulate network delay for demonstration
        const timer = setTimeout(() => { }, 500);

        return () => clearTimeout(timer);
      } catch (error) {
        console.error("Error applying filters", {
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
          businessCritical: false,
          operation: "applyFilters",
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

  const handleAdvancedSearch = () => {
    // TODO: Implement advanced search functionality
    if (process.env.NODE_ENV === 'development') {
      console.log('Advanced search clicked');
    }
  };

  const handleClearFilters = useCallback(() => {
    setPendingFilters(null);
    setFilters(null);
  }, []);

  // Function to export Excel data
  /*const handleExportToExcel = async () => {
    console.log("Start export to Excel");
    if (!filters) return;
    console.log('handleExportToExcel triggered');
    try {
      setIsExportingExcel(true);
      // const response = await fetch(new URL(`/api/analytics/export?${new URLSearchParams(filters as any)}`, window.location.origin));
      const cleanedFilters = Object.fromEntries(
        Object.entries(filters ?? {}).filter(([_, v]) => v !== null && v !== "null")
      );

      const queryString = new URLSearchParams(cleanedFilters as any).toString();
      const response = await fetch(`/api/analytics/export-sector-analysis?${queryString}`);

      const data = await response.json().catch(() => ({
        error: 'Failed to parse server response'
      }));

      if (!response.ok || data.error) {
        throw new Error(data.error || `Export failed with status ${response.status}`);
      }

      // Create workbook
      const wb = xlsxUtils.book_new();

      // Add title and metadata sheet
      const metadataWs = xlsxUtils.aoa_to_sheet([
        ['Sectors Analysis Data'],
        [''],
        ['Generated on:', new Date().toLocaleString()],
        [''],
        ['Applied Filters:'],
        ['Sector:', data.filterNames.sectorName || 'All'],
        ['Sub Sector:', data.filterNames.subSectorName || 'All'],
        ['Hazard Type:', data.filterNames.hazardTypeName || 'All'],
        ['Hazard Cluster:', data.filterNames.hazardClusterName || 'All'],
        ['Specific Hazard:', data.filterNames.specificHazardName || 'All'],
        ['Geographic Level:', data.filterNames.geographicLevelName || 'All'],
        ['From:', data.filters.fromDate || 'All'],
        ['To:', data.filters.toDate || 'All'],
        ['Disaster Event:', data.filterNames.disasterEventName || 'All'],
      ]);
      xlsxUtils.book_append_sheet(wb, metadataWs, 'Overview');

      // Add sector impact data
      if (data.sectorImpact) {
        const { eventCount, totalDamage, totalLoss, eventsOverTime, damageOverTime, lossOverTime } = data.sectorImpact;

        const sectorImpactData = [];

        // Section: Summary
        sectorImpactData.push({
          Section: "Summary",
          "Number of Events": "",
          "Total Damages": "",
          "Total Losses": ""
        });
        sectorImpactData.push({
          Section: "",
          "Number of Events": eventCount,
          "Total Damages": totalDamage,
          "Total Losses": totalLoss
        });

        // Section: Yearly Breakdown
        sectorImpactData.push({
          Section: "Yearly Breakdown",
          "Number of Events": "",
          "Total Damages": "",
          "Total Losses": ""
        });

        Object.entries(eventsOverTime ?? {}).forEach(([year, events]) => {
          sectorImpactData.push({
            Section: year,
            "Number of Events": events,
            "Total Damages": damageOverTime?.[year] ?? "0",
            "Total Losses": lossOverTime?.[year] ?? "0"
          });
        });

        const sectorImpactWs = xlsxUtils.json_to_sheet(sectorImpactData);
        xlsxUtils.book_append_sheet(wb, sectorImpactWs, "Sector Impact");
      }




      // Add hazard impact data
      if (data.hazardImpact) {
        const { eventsCount = [], damages = [], losses = [] } = data.hazardImpact;

        const sheetData = [];

        // Transformer for eventsCount
        const transformEvent = (item: any) => ({
          "Hazard Type": item.hazardName,
          "Number of Events": item.value,
          Percentage: item.percentage
        });

        // Transformer for damages/losses
        const transformImpact = (item: any) => ({
          "Hazard Type": item.hazardName,
          Value: item.value,
          Percentage: item.percentage
        });

        if (eventsCount.length > 0) {
          sheetData.push({ Section: "Events Count" });
          sheetData.push(...eventsCount.map(transformEvent));
          sheetData.push({});
        }

        if (damages.length > 0) {
          sheetData.push({ Section: "Damages" });
          sheetData.push(...damages.map(transformImpact));
          sheetData.push({});
        }

        if (losses.length > 0) {
          sheetData.push({ Section: "Losses" });
          sheetData.push(...losses.map(transformImpact));
          sheetData.push({});
        }

        if (sheetData.length > 0) {
          const hazardImpactWs = xlsxUtils.json_to_sheet(sheetData);
          xlsxUtils.book_append_sheet(wb, hazardImpactWs, "Hazard Impact");
        }
      }


      // Add geographic impact data
      if (data.geographicImpact?.success && data.geographicImpact.divisions?.length > 0) {
        const geoRows = data.geographicImpact.divisions.map((div: any) => {
          const val = data.geographicImpact.values?.[div.id];
          return {
            "Name of region": div.name?.en || `Division ${div.id}`,
            "Total Damages": val?.dataAvailability === 'no_data' ? 'No data' : val?.totalDamage ?? 'No data',
            "Total Losses": val?.dataAvailability === 'no_data' ? 'No data' : val?.totalLoss ?? 'No data',
          };
        });

        if (geoRows.length > 0) {
          const geoWs = xlsxUtils.json_to_sheet(geoRows);
          xlsxUtils.book_append_sheet(wb, geoWs, 'Geographic Impact');
        }
      }

      // Add effect details
      const damages = data?.effectDetails?.damages ?? [];
      const losses = data?.effectDetails?.losses ?? [];
      const disruptions = data?.effectDetails?.disruptions ?? [];

      // Create a mapping of sector IDs to names
      const sectorIdToName = new Map<number, string>(
        Object.entries(data.sectorIdToNameMap || {}).map(([k, v]) => [parseInt(k), v as string])
      );

      // Determine the selected subsector or fallback to sector
      const selectedSectorId = parseInt(data.filters.sectorId || '0');
      const selectedSubSectorId = data.filters.subSectorId ? parseInt(data.filters.subSectorId) : null;

      const allSectorIds = new Set<number>();
      (damages as Damage[]).forEach((d: Damage) => allSectorIds.add(d.sectorId));
      (losses as Loss[]).forEach((l: Loss) => allSectorIds.add(l.sectorId));
      (disruptions as Disruption[]).forEach((d: Disruption) => allSectorIds.add(d.sectorId));

      // Filter records to match the selected subsector only
      let allowedSectorIds: number[] = [];

      if (selectedSubSectorId) {
        // Include the selected subsector + any children (e.g., 1101001, 1101002)
        allowedSectorIds = Array.from(allSectorIds).filter(
          id => id === selectedSubSectorId || Math.floor(id / 10) === selectedSubSectorId
        );
      } else {
        // Sector selected → include all its subsectors (e.g., 1101, 1102)
        allowedSectorIds = Array.from(allSectorIds).filter(
          id => Math.floor(id / 100) === selectedSectorId
        );
      }

      const filteredDamages = (damages as Damage[]).filter(d => allowedSectorIds.includes(d.sectorId));
      const filteredLosses = (losses as Loss[]).filter(l => allowedSectorIds.includes(l.sectorId));
      const filteredDisruptions = (disruptions as Disruption[]).filter(d => allowedSectorIds.includes(d.sectorId));

      // Process damages with specific columns
      const damageData = (filteredDamages as Damage[]).map((damage: Damage) => ({
        Asset: damage.assetName,
        'Total Damage': damage.totalDamageAmount,
        'Repair/Replacement': damage.totalRepairReplacement,
        'Recovery': damage.totalRecovery,
        // Sector: damage.sectorId.toString()
        // Sector: data.filterNames.subSectorName || data.filterNames.sectorName || 'Unknown'
        Sector: sectorIdToName.get(damage.sectorId) || damage.sectorId.toString()
      }));

      // Process losses with specific columns
      const lossData = (filteredLosses as Loss[]).map((loss: Loss) => ({
        Type: loss.type,
        Description: loss.description,
        'Public Cost': loss.publicCostTotal,
        'Private Cost': loss.privateCostTotal,
        // Sector: loss.sectorId.toString()
        // Sector: data.filterNames.subSectorName || data.filterNames.sectorName || 'Unknown'
        Sector: sectorIdToName.get(loss.sectorId) || loss.sectorId.toString()
      }));

      // Process disruptions with specific columns
      const disruptionData = (filteredDisruptions as Disruption[]).map((disruption: Disruption) => ({
        Description: disruption.comment,
        'Duration (Days)': disruption.durationDays,
        'Users Affected': disruption.usersAffected,
        'People Affected': disruption.peopleAffected,
        'Response Cost': disruption.responseCost,
        // Sector: disruption.sectorId.toString()
        // Sector: data.filterNames.subSectorName || data.filterNames.sectorName || 'Unknown'
        Sector: sectorIdToName.get(disruption.sectorId) || disruption.sectorId.toString()
      }));

      // Create worksheet with formatted data
      const effectDetailsData = [];

      // Damages section
      effectDetailsData.push(["Damages"]);
      effectDetailsData.push(["Asset", "Total Damage", "Repair/Replacement", "Recovery", "Sector"]);
      if (damageData.length > 0) {
        damageData.forEach(row => {
          effectDetailsData.push([
            row.Asset,
            row["Total Damage"],
            row["Repair/Replacement"],
            row.Recovery,
            row.Sector
          ]);
        });
      } else {
        effectDetailsData.push(["No data"]);
      }
      effectDetailsData.push([]);

      // Losses section
      effectDetailsData.push(["Losses"]);
      effectDetailsData.push(["Sector", "Type", "Description", "Public Cost", "Private Cost"]);
      if (lossData.length > 0) {
        lossData.forEach(row => {
          effectDetailsData.push([
            row.Sector,
            row.Type,
            row.Description,
            row["Public Cost"],
            row["Private Cost"]
          ]);
        });
      } else {
        effectDetailsData.push(["No data"]);
      }
      effectDetailsData.push([]);

      // Disruptions section
      effectDetailsData.push(["Disruptions"]);
      effectDetailsData.push(["Sector", "Description", "Duration (Days)", "Users Affected", "People Affected", "Response Cost"]);
      if (disruptionData.length > 0) {
        disruptionData.forEach(row => {
          effectDetailsData.push([
            row.Sector,
            row.Description,
            row["Duration (Days)"],
            row["Users Affected"],
            row["People Affected"],
            row["Response Cost"]
          ]);
        });
      } else {
        effectDetailsData.push(["No data"]);
      }
      effectDetailsData.push([]);

      // Create worksheet with header option
      const effectDetailsWs = xlsxUtils.json_to_sheet(effectDetailsData, { skipHeader: true });
      xlsxUtils.book_append_sheet(wb, effectDetailsWs, 'Effect Details');


      // Add most damaging events
      if (data.mostDamagingEvents?.events?.length > 0) {
        const transformedEvents = data.mostDamagingEvents.events.map((e: any) => ({
          "Disaster Event Name": e.eventName,
          "Total Damages": e.totalDamages,
          "Total Losses": e.totalLosses,
          Created: e.createdAt?.split("T")[0] ?? ""
        }));

        const eventsWs = xlsxUtils.json_to_sheet(transformedEvents);
        xlsxUtils.book_append_sheet(wb, eventsWs, "Most Damaging Events");
      }

      console.log('Workbook Sheets:', wb.SheetNames);

      // Generate Excel file
      const excelBuffer = xlsxWrite(wb, { bookType: 'xlsx', type: 'array' });

      // Create blob and download
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sectors-analysis-data.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert(error instanceof Error ? error.message : 'Failed to export data. Please try again.');
    } finally {
      setIsExportingExcel(false);
    }
  };*/


  return (
    <MainContainer title="Sectors Analysis" headerExtra={<NavSettings />}>
      <div style={{ maxWidth: "100%", overflow: "hidden" }}>

        {/* Show message when JavaScript is disabled */}
        <noscript>
          <JavaScriptDisabledMessage />
        </noscript>


        {/* Main content - only shown when JavaScript is enabled */}
        <div className="sectors-page" style={{ display: "none" }} id="js-content">
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
                {/* <button
                  className="mg-button mg-button--small mg-button-primary"
                  onClick={() => console.log("Generate report button clicked")}
                  disabled={isGeneratingReport}
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "0.5rem",
                    opacity: isGeneratingReport ? 0.7 : 1
                  }}
                >
                  <FaFileDownload />
                  {isGeneratingReport ? "Generating Report..." : "Generate Report"}
                </button> */}
                {/* <button
                  className="mg-button mg-button--small mg-button-primary"
                  onClick={handleExportToExcel}
                  disabled={isExportingExcel}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    opacity: isExportingExcel ? 0.7 : 1
                  }}
                >
                  <FaFileDownload />
                  {isExportingExcel ? "Exporting Data..." : "Download Data"}
                </button> */}
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
                  <ErrorBoundary>
                    <ImpactOnSector
                      sectorId={filters.sectorId}
                      filters={filters}
                      currency={currency}
                      sectorImpactData={sectorImpactData}
                      sectorsData={sectorsData}
                    />
                  </ErrorBoundary>
                )}

                {/* Impact by Hazard Section */}
                <ErrorBoundary>
                  <ImpactByHazard filters={filters}
                    currency={currency}
                    hazardImpactData={hazardImpactData}
                    sectorsData={sectorsData}
                  />
                </ErrorBoundary>

                {/* Impact by Geographic Level */}
                <ErrorBoundary>
                  <ImpactMap filters={filters}
                    currency={currency}
                    geographicImpactData={geographicImpactData}
                    sectorsData={sectorsData}
                  />
                </ErrorBoundary>

                {/* Effect Details Section */}
                <ErrorBoundary>
                  <EffectDetails filters={filters}
                    currency={currency}
                    effectDetailsData={effectDetailsData}
                    sectorsData={sectorsData}
                  />
                </ErrorBoundary>

                {/* Most Damaging Events Section */}
                <ErrorBoundary>
                  <MostDamagingEvents filters={filters}
                    currency={currency}
                    mostDamagingEventsData={mostDamagingEventsData}
                    sectorsData={sectorsData}
                  />
                </ErrorBoundary>
              </div>
            </>
          )}

          <div className="dts-caption mt-4">
            * Data shown is based on published records
          </div>
        </div>
      </div>
    </MainContainer>
  );
}

export default function SectorsAnalysis() {
  return <SectorsAnalysisContent />;
}