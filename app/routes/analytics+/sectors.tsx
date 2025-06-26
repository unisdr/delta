import { useState, useEffect, useCallback, memo, useRef } from "react";
import type { MetaFunction } from "@remix-run/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useLoaderData } from "@remix-run/react";
import { createClientLogger } from "~/utils/clientLogger";

import { authLoaderPublicOrWithPerm } from "~/util/auth";
import { NavSettings } from "~/routes/settings/nav";
import { MainContainer } from "~/frontend/container";
import createLogger from "~/utils/logger.server";
import { ErrorMessage } from "~/frontend/components/ErrorMessage";
import ErrorBoundary from "~/frontend/components/ErrorBoundary";

import Filters from "~/frontend/analytics/sectors/sections/Filters";
import ImpactOnSector from "~/frontend/analytics/sectors/sections/ImpactOnSector";
import ImpactByHazard from "~/frontend/analytics/sectors/sections/ImpactByHazard";
import ImpactMap from "~/frontend/analytics/sectors/sections/ImpactMap";
import EffectDetails from "~/frontend/analytics/sectors/sections/EffectDetails";
import MostDamagingEvents from "~/frontend/analytics/sectors/sections/MostDamagingEvents";
import { getInstanceSystemSettings } from "~/backend.server/models/instanceSystemSettingDAO";

// Performance optimization hooks
// Enhanced debounce hook with adaptive timing and user interaction awareness
const useDebounce = <T,>(value: T, baseDelay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const lastInteractionTime = useRef<number>(Date.now());
  const interactionCount = useRef<number>(0);
  const isTyping = useRef<boolean>(false);
  const lastValue = useRef<T>(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Track user interaction patterns
  useEffect(() => {
    const now = Date.now();
    const timeSinceLastInteraction = now - lastInteractionTime.current;

    // Detect typing patterns (rapid successive changes)
    if (timeSinceLastInteraction < 1000) { // If changes within 1 second
      interactionCount.current++;
      isTyping.current = true;
    } else {
      interactionCount.current = 0;
      isTyping.current = false;
    }

    lastInteractionTime.current = now;

    // Calculate adaptive delay based on interaction pattern
    let adaptiveDelay = baseDelay;

    if (isTyping.current) {
      // If user is actively typing, use a longer delay
      adaptiveDelay = Math.min(baseDelay * 1.5, 1000); // Cap at 1s
    } else if (interactionCount.current > 3) {
      // If user is rapidly changing values, use a shorter delay
      adaptiveDelay = Math.max(baseDelay * 0.5, 100); // At least 100ms
    }

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout with adaptive delay
    timeoutRef.current = setTimeout(() => {
      try {
        // Only update if value has actually changed
        if (lastValue.current !== value) {
          lastValue.current = value;
          setDebouncedValue(value);

          // Log debounce application for performance monitoring
          componentLogger.debug('Debounced value updated', {
            originalValue: value,
            debouncedValue: value,
            delayUsed: adaptiveDelay,
            interactionCount: interactionCount.current,
            wasTyping: isTyping.current,
            businessCritical: false
          });
        }
      } catch (error) {
        componentLogger.error("Error in debounce hook", {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          businessCritical: false,
          operation: 'debounceUpdate'
        });
        // Fallback to non-debounced value in case of error
        setDebouncedValue(value);
      }

      // Reset typing state after delay
      isTyping.current = false;
    }, adaptiveDelay);

    // Cleanup function to clear timeout on unmount or value change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, baseDelay]);

  return debouncedValue;
};

// Memoize expensive components
const MemoizedImpactOnSector = memo(ImpactOnSector);
const MemoizedImpactByHazard = memo(ImpactByHazard);
const MemoizedImpactMap = memo(ImpactMap);
const MemoizedEffectDetails = memo(EffectDetails);
const MemoizedMostDamagingEvents = memo(MostDamagingEvents);

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
                <li>Enable JavaScript for all sites or this site specifically</li>
                <li>Refresh this page</li>
              </ol>
            </div>
          </div>
          <div style={{ marginTop: "2rem" }}>
            <button
              className="mg-button mg-button-primary"
              onClick={() => window.location.reload()}
              style={{ margin: "0 auto" }}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Create logger for this module
const logger = createLogger("routes/analytics/sectors.tsx");

// Create client-side logger for user interactions
const componentLogger = createClientLogger('sectors-analytics', {
  component: 'SectorsAnalysisContent',
  feature: 'dashboard-filters'
});

// import { utils as xlsxUtils, write as xlsxWrite } from 'xlsx';
// import { Damage, Loss, Disruption } from '~/routes/api+/analytics+/export-sector-analysis';


// Types
// interface Sector {
//   id: number;
//   sectorname: string;
//   subsectors?: Sector[];
// }

// Define custom error type for API errors
interface ApiError extends Error {
  status?: number;
  response?: {
    status?: number;
    data?: any;
  };
}

// Type-safe error handler
const handleError = (error: unknown, context: string) => {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const stack = error instanceof Error ? error.stack : undefined;

  componentLogger.error(`Error in ${context}`, {
    error: errorMessage,
    stack,
    businessCritical: true
  });
};

// Create QueryClient instance with enhanced configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache configuration
      staleTime: 5 * 60 * 1000,     // 5 minutes before data becomes stale
      gcTime: 10 * 60 * 1000,       // 10 minutes before garbage collection
      refetchOnWindowFocus: false,  // Prevent refetch on window focus
      refetchOnMount: false,        // Prevent refetch on component mount
      refetchOnReconnect: 'always', // Always refetch on reconnect
      retry: (failureCount, error: unknown) => {
        try {
          // Type guard to check if error is an instance of Error
          if (!(error instanceof Error)) {
            return failureCount < 1; // Only retry once for non-Error types
          }

          const apiError = error as ApiError;
          const errorMessage = error.message || 'Unknown error';

          // Check for rate limit errors
          const isRateLimit = errorMessage.includes('rate limited') ||
            apiError.status === 429 ||
            apiError.response?.status === 429;

          if (isRateLimit) {
            // Log rate limit hit
            componentLogger.warn('Rate limit hit, applying retry logic', {
              attempt: failureCount + 1,
              error: errorMessage,
              stack: error.stack,
              businessCritical: true
            });
            return failureCount < 3; // Max 3 retries for rate limits
          }

          // For other errors, only retry once
          return failureCount < 1;
        } catch (err) {
          handleError(err, 'retry logic');
          return false; // Don't retry if error handling fails
        }
      },
      retryDelay: (attemptIndex) => {
        // Exponential backoff with jitter
        const baseDelay = Math.min(1000 * 2 ** attemptIndex, 30000); // Cap at 30s
        const jitter = Math.random() * 1000; // Add up to 1s of jitter
        return baseDelay + jitter;
      },
      // Optimistic updates configuration
      networkMode: 'online',
      // Query options
      structuralSharing: true // Prevent unnecessary re-renders
    }
  }
});

// Set up global query cache event handlers
const queryCache = queryClient.getQueryCache();

// Subscribe to query cache events with type-safe handling
queryCache.subscribe((event) => {
  try {
    // Handle error events
    if ('error' in event && event.error) {
      handleError(event.error, 'query cache');
    }

    // Handle query updates
    if ('query' in event) {
      componentLogger.debug('Query cache updated', {
        queryKey: event.query.queryKey,
        timestamp: new Date().toISOString(),
        eventType: event.type
      });
    }
  } catch (error) {
    handleError(error, 'query cache subscription');
  }
});

// Set up global error handler for uncaught query errors
queryClient.getQueryCache().config = {
  ...queryClient.getQueryCache().config,
  onError: (error: unknown) => {
    handleError(error, 'global query cache');
  }
};

// Set up global mutation error handler
queryClient.getMutationCache().config = {
  ...queryClient.getMutationCache().config,
  onError: (error: unknown) => {
    handleError(error, 'global mutation cache');
  }
};

// Loader with public access or specific permission check for "ViewData"
export const loader = authLoaderPublicOrWithPerm("ViewData", async (loaderArgs: any) => {
  const { request, userSession } = loaderArgs;

  // Generate request ID for tracking
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Create context logger with user details (if authenticated)
  const contextLogger = logger.withContext({
    requestId,
    userId: userSession?.user?.id?.toString() || 'public_user',
    userRole: userSession?.user?.role || 'public',
    action: 'sectors_analytics_view'
  });

  contextLogger.info("Sectors analytics page requested", {
    isPublicAccess: !userSession,
    userAgent: request.headers.get("user-agent"),
    referer: request.headers.get("referer"),
    url: request.url
  });

  try {

    // Get currency from environment variable
    const settings  = await getInstanceSystemSettings();
    let currency = "PHP";
    if(settings){
      currency = settings.currencyCodes?.split(",")[0]
    }
    contextLogger.info("Successfully loaded sectors analytics data", {
      currency,
      hasAuthentication: !!userSession,
      timestamp: new Date().toISOString(),
      requestId
    });

    return {
      currency,
      loaderArgs,
      requestId
    };

  } catch (error) {
    contextLogger.error("Failed to load sectors analytics data", {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      requestId
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



// React component for Sectors Analysis page
function SectorsAnalysisContent() {
  const { currency } = useLoaderData<typeof loader>();

  // Effect to show content when JavaScript is enabled
  useEffect(() => {
    try {
      const jsContent = document.getElementById('js-content');
      if (jsContent) {
        jsContent.style.display = 'block';
      }
    } catch (error) {
      componentLogger.error('Error showing main content', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        businessCritical: false,
        operation: 'showJsContent'
      });
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
  } | null>(null);

  // Add loading state to track filter application
  const [isLoading, setIsLoading] = useState(false);
  const [pendingFilters, setPendingFilters] = useState<typeof filters>(null);

  // Debounce the filter changes to reduce API calls
  const debouncedFilters = useDebounce(pendingFilters, 1000);

  // Apply debounced filters
  useEffect(() => {
    // Create a no-op cleanup function for code paths that don't need cleanup
    const noop = () => { };

    if (debouncedFilters !== null) {
      try {
        setIsLoading(true);
        setFilters(debouncedFilters);

        // Log filter application for analytics
        componentLogger.info('Filters applied', {
          userAction: 'apply_filters',
          filterCount: Object.values(debouncedFilters || {}).filter(v => v !== null).length,
          hasHazardFilter: !!debouncedFilters?.hazardTypeId || !!debouncedFilters?.hazardClusterId || !!debouncedFilters?.specificHazardId,
          hasSectorFilter: !!debouncedFilters?.sectorId || !!debouncedFilters?.subSectorId,
          hasDateFilter: !!debouncedFilters?.fromDate || !!debouncedFilters?.toDate,
          hasEventFilter: !!debouncedFilters?.disasterEventId,
          businessCritical: false
        });

        // Simulate network delay for demonstration
        const timer = setTimeout(() => {
          setIsLoading(false);
        }, 500);

        return () => clearTimeout(timer);
      } catch (error) {
        componentLogger.error("Error applying filters", {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          businessCritical: false,
          operation: 'applyFilters'
        });
        setIsLoading(false);
        return noop; // Return no-op cleanup function in error case
      }
    }

    // Return no-op cleanup function for the case when debouncedFilters is null
    return noop;
  }, [debouncedFilters]);

  // Event handlers for Filters component
  const handleApplyFilters = useCallback((newFilters: typeof filters) => {
    setPendingFilters(newFilters);
  }, []);

  const handleAdvancedSearch = useCallback(() => {
    // TODO: Implement advanced search functionality
    componentLogger.info('Advanced search clicked', {
      userAction: 'advanced_search',
      businessCritical: false,
      currentFiltersCount: filters ? Object.values(filters).filter(v => v !== null).length : 0
    });
  }, []);

  const handleClearFilters = useCallback(() => {
    setPendingFilters(null);
    setFilters(null);
    setIsLoading(false);

    // Log filter clearing for analytics
    componentLogger.info('Filters cleared', {
      userAction: 'clear_filters',
      businessCritical: false,
      previousFiltersCount: filters ? Object.values(filters).filter(v => v !== null).length : 0
    });
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

              {/* Loading overlay */}
              {isLoading && (
                <div
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(255, 255, 255, 0.7)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 10,
                    borderRadius: "8px"
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "1rem"
                    }}
                  >
                    <div className="dts-loading-spinner" aria-label="Loading data" aria-hidden="true"></div>
                    <div style={{ fontSize: "1.4rem", fontWeight: 500 }}>
                      <span className="mg-u-sr-only">Loading data, please wait.</span>
                      Loading data...
                    </div>
                  </div>
                </div>
              )}

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
                      <MemoizedImpactOnSector
                        sectorId={filters.sectorId}
                        filters={filters}
                        currency={currency}
                      />
                    </ErrorBoundary>
                  </div>
                )}

                {/* Impact by Hazard Section */}
                <div style={{ minHeight: "400px" }}>
                  <ErrorBoundary>
                    <MemoizedImpactByHazard filters={filters}
                    currency={currency} />
                  </ErrorBoundary>
                </div>

                {/* Impact by Geographic Level */}
                <div style={{ minHeight: "500px" }}>
                  <ErrorBoundary>
                    <MemoizedImpactMap filters={filters} currency={currency} />
                  </ErrorBoundary>
                </div>

                {/* Effect Details Section */}
                <div style={{ minHeight: "400px" }}>
                  <ErrorBoundary>
                    <MemoizedEffectDetails filters={filters} currency={currency} />
                  </ErrorBoundary>
                </div>

                {/* Most Damaging Events Section */}
                <div style={{ minHeight: "300px" }}>
                  <ErrorBoundary>
                    <MemoizedMostDamagingEvents filters={filters} currency={currency} />
                  </ErrorBoundary>
                </div>
              </div>
            </>
          )}

          {/* Work In Progress Message - Updated list
          <div
            className="construction-message"
            style={{
              marginTop: "2rem",
              padding: "1.6rem",
              backgroundColor: "#f9f9f9",
              borderRadius: "8px",
              border: "1px solid #ddd",
            }}
          >
            <h3
              style={{
                fontSize: "1.8rem",
                marginBottom: "1rem",
                fontWeight: "600",
                color: "#333",
              }}
            >
              🚧 Work In Progress
            </h3>
            <p style={{ fontSize: "1.4rem", lineHeight: "1.5", color: "#555" }}>
              The remaining sections of this dashboard, including:
            </p>
            <ul
              style={{
                marginTop: "1rem",
                marginBottom: "1rem",
                paddingLeft: "1.5rem",
                fontSize: "1.4rem",
                lineHeight: "1.6",
                color: "#555",
              }}
            >
              <li>The most damaging events for sectors</li>
            </ul>
            <p style={{ fontSize: "1.4rem", lineHeight: "1.5", color: "#555" }}>
              are still under construction. Please stay tuned for future updates!
            </p>
          </div> */}

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
  return (
    <QueryClientProvider client={queryClient}>
      <SectorsAnalysisContent />
    </QueryClientProvider>
  );
}