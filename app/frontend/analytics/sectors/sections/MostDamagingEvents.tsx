import { useState, memo, useCallback, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrencyWithCode } from "~/frontend/utils/formatters";
import { useDebounce } from "~/frontend/hooks/useDebounce";
import { Pagination } from "~/frontend/pagination/view";
import { useSearchParams } from "@remix-run/react";

type SortDirection = "asc" | "desc";

// Client-side URL parameter parsing
const parseUrlParams = (searchParams: URLSearchParams) => {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10)) || 1;
  const pageSize = Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10)) || 10;

  const extraParams: Record<string, string[]> = {};
  const allowedParams = [
    'sectorId', 'subSectorId', 'hazardTypeId', 'hazardClusterId',
    'specificHazardId', 'geographicLevelId', 'fromDate', 'toDate'
  ];

  searchParams.forEach((value, key) => {
    if (allowedParams.includes(key)) {
      if (!extraParams[key]) {
        extraParams[key] = [];
      }
      extraParams[key].push(value);
    }
  });

  return {
    page,
    pageSize,
    extraParams
  };
};

interface MostDamagingEventsProps {
  filters: {
    sectorId: string | null;
    subSectorId: string | null;
    hazardTypeId: string | null;
    hazardClusterId: string | null;
    specificHazardId: string | null;
    geographicLevelId: string | null;
    fromDate: string | null;
    toDate: string | null;
  };
  currency: string;
}

interface DisasterEvent {
  eventId: string;
  eventName: string;
  totalDamages: number;
  totalLosses: number;
  createdAt: string;
}

interface Sector {
  id: number;
  sectorname: string;
  subsectors?: Sector[];
}

type SortColumn = "damages" | "losses" | "eventName" | "createdAt";

interface ApiResponse {
  success: boolean;
  data: {
    events: DisasterEvent[];
    pagination: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
      extraParams?: Record<string, string[]>;
    };
    metadata: {
      assessmentType: string;
      confidenceLevel: string;
      currency: string;
      assessmentDate: string;
      assessedBy: string;
      notes: string;
    };
  };
}

const MostDamagingEvents = memo(function MostDamagingEvents({ filters, currency }: MostDamagingEventsProps) {
  const [urlSearchParams, setUrlSearchParams] = useSearchParams();
  const [sortState, setSortState] = useState<{ column: SortColumn; direction: SortDirection }>({
    column: "damages",
    direction: "desc"
  });

  // For backward compatibility with existing code
  const sortColumn = sortState.column;
  const sortDirection = sortState.direction;

  // Parse URL parameters for pagination
  const { page, pageSize, extraParams: urlExtraParams } = useMemo(() =>
    parseUrlParams(urlSearchParams),
    [urlSearchParams]
  );

  // Fetch sectors data for dynamic title
  const { data: sectorsData } = useQuery({
    queryKey: ["sectors"],
    queryFn: async () => {
      const response = await fetch("/api/analytics/sectors");
      if (!response.ok) throw new Error("Failed to fetch sectors");
      return response.json() as Promise<{ sectors: Sector[] }>;
    }
  });

  // Helper function to find sector and its parent
  const findSectorWithParent = (sectors: Sector[], targetId: string) => {
    for (const sector of sectors) {
      // Check if this is the main sector
      if (sector.id.toString() === targetId) {
        return { sector, parent: undefined };
      }
      // Check subsectors
      if (sector.subsectors) {
        const subsector = sector.subsectors.find(sub => sub.id.toString() === targetId);
        if (subsector) {
          return { sector: subsector, parent: sector };
        }
      }
    }
    return { sector: undefined, parent: undefined };
  };

  // Memoized title calculation based on sector/subsector selection
  const sectionTitle = useMemo(() => {
    try {
      if (!sectorsData?.sectors) return "Most Damaging Events";

      if (filters.sectorId) {
        const { sector } = findSectorWithParent(sectorsData.sectors, filters.sectorId);

        if (filters.subSectorId && sector) {
          // Case: Subsector is selected
          const { sector: subsector, parent: mainSector } = findSectorWithParent(sectorsData.sectors, filters.subSectorId);
          if (subsector && mainSector) {
            return `The Most Damaging Events for ${subsector.sectorname} (${mainSector.sectorname} Sector)`;
          }
        }

        // Case: Only sector is selected
        if (sector) {
          return `The Most Damaging Events for the ${sector.sectorname} Sector`;
        }
      }

      return "The Most Damaging Events";
    } catch (error) {
      console.error("Error generating section title:", error);
      return "The Most Damaging Events";
    }
  }, [sectorsData?.sectors, filters.sectorId, filters.subSectorId]);

  // Debounce filters to prevent too many API calls
  const debouncedFilters = useDebounce(filters, 300);

  // Build query parameters
  const buildQueryParams = useCallback((filters: typeof debouncedFilters, page: number, pageSize: number) => {
    const params = new URLSearchParams();

    // Only use sectorId if no subsectorId is selected
    if (filters.subSectorId) {
      params.append('sectorId', filters.subSectorId);
    } else if (filters.sectorId) {
      params.append('sectorId', filters.sectorId);
    }

    // Add other filters (excluding sectorId and subSectorId since we handled them above)
    Object.entries(filters).forEach(([key, value]) => {
      if (value && key !== 'sectorId' && key !== 'subSectorId') {
        params.append(key, value);
      }
    });

    // Add pagination params
    params.append("page", page.toString());
    params.append("pageSize", pageSize.toString());

    return params;
  }, []);

  // Update URL when filters or pagination changes
  useEffect(() => {
    const params = buildQueryParams(debouncedFilters, page, pageSize);
    setUrlSearchParams(params, { replace: true });
  }, [debouncedFilters, page, pageSize, buildQueryParams, setUrlSearchParams]);

  // Fetch data using React Query
  const { data, isLoading, isError } = useQuery<ApiResponse>({
    queryKey: ["mostDamagingEvents", debouncedFilters, page, pageSize],
    queryFn: async () => {
      try {
        const params = buildQueryParams(debouncedFilters, page, pageSize);
        const response = await fetch(`/api/analytics/most-damaging-events?${params}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("No data found for the selected criteria");
          }
          throw new Error(`Failed to fetch data: ${response.statusText}`);
        }
        return response.json();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
        throw new Error(`Error fetching data: ${errorMessage}`);
      }
    },
    retry: 1,
    enabled: !!(debouncedFilters.sectorId || debouncedFilters.subSectorId || debouncedFilters.hazardTypeId ||
      debouncedFilters.hazardClusterId || debouncedFilters.specificHazardId ||
      debouncedFilters.geographicLevelId || debouncedFilters.fromDate || debouncedFilters.toDate),
  });

  // Client-side sorting of events
  const sortedEvents = useMemo(() => {
    if (!data?.data?.events) return [];

    return [...data.data.events].sort((a, b) => {
      let valueA, valueB;

      // Handle different sort columns
      switch (sortColumn) {
        case 'eventName':
          valueA = a.eventName.toLowerCase();
          valueB = b.eventName.toLowerCase();
          return sortDirection === 'asc'
            ? valueA.localeCompare(valueB)
            : valueB.localeCompare(valueA);

        case 'createdAt':
          valueA = new Date(a.createdAt).getTime();
          valueB = new Date(b.createdAt).getTime();
          break;

        case 'damages':
          valueA = a.totalDamages;
          valueB = b.totalDamages;
          break;

        case 'losses':
          valueA = a.totalLosses;
          valueB = b.totalLosses;
          break;

        default:
          // Default to sorting by damages if sortColumn is invalid
          valueA = a.totalDamages;
          valueB = b.totalDamages;
      }

      // Handle numeric comparisons
      if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data?.data?.events, sortColumn, sortDirection]);

  // Memoized currency formatting function to prevent recreation on each render
  const formatCurrencyValue = useCallback((amount: number) => {
    try {
      const scale = amount >= 1_000_000_000 ? 'billions' :
        amount >= 1_000_000 ? 'millions' :
          amount >= 1_000 ? 'thousands' :
            undefined;

      return formatCurrencyWithCode(amount, currency, {}, scale);
    } catch (error) {
      console.error("Error formatting currency:", error);
      return `${amount} ${currency}`; // Fallback formatting
    }
  }, [currency]);

  // Memoized sort handler to prevent recreation on each render
  const handleSort = useCallback((column: SortColumn) => {
    try {
      setSortState(prevState => {
        const direction: SortDirection = prevState.column === column
          ? (prevState.direction === "asc" ? "desc" : "asc")
          : "desc";

        // Update URL with sort parameters
        const params = new URLSearchParams(urlSearchParams);
        params.set('sortBy', column);
        params.set('sortDirection', direction);
        setUrlSearchParams(params, { replace: true });

        return { column, direction };
      });
    } catch (error) {
      console.error("Error handling sort:", error);
    }
  }, [urlSearchParams, setUrlSearchParams]);

  return (
    <div className="dts-page-section">
      <h2 className="dts-section-title">{sectionTitle}</h2>
      <p className="dts-body-text mb-6">
        Displays key disasters by damage, losses, and dates.
      </p>

      {isLoading ? (
        <div className="mg-container">
          <div className="dts-table-wrapper">
            <table className="dts-table">
              <thead>
                <tr>
                  <th>Event Name</th>
                  <th>Total Damages</th>
                  <th>Total Losses</th>
                  <th>Created</th>
                </tr>
              </thead>
            </table>
          </div>
          <div className="py-8">
            <p>Loading data...</p>
          </div>
        </div>
      ) : isError ? (
        <div className="text-center p-4 text-red-600">
          <p>Error loading data. Please try again.</p>
        </div>
      ) : !data?.success || !sortedEvents?.length ? (
        <div className="text-center p-4">
          <p>No events found for the selected filters.</p>
        </div>
      ) : (
        <div className="mg-container">
          <div className="dts-table-wrapper">
            <table className="dts-table">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("eventName")}
                  >
                    Event Name
                    {sortColumn === "eventName" && (
                      <span className="ml-2">{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("damages")}
                  >
                    Total Damages
                    {sortColumn === "damages" && (
                      <span className="ml-2">{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("losses")}
                  >
                    Total Losses
                    {sortColumn === "losses" && (
                      <span className="ml-2">{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("createdAt")}
                  >
                    Created
                    {sortColumn === "createdAt" && (
                      <span className="ml-2">{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedEvents.map((event: DisasterEvent) => (
                  <tr key={event.eventId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {event.eventName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrencyValue(event.totalDamages)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrencyValue(event.totalLosses)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(event.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data?.data?.pagination && (
            <div className="mt-4 w-full">

              <div className="inline-block">
                <Pagination
                  itemsOnThisPage={data.data.events?.length || 0}
                  totalItems={data.data.pagination.total}
                  page={data.data.pagination.page}
                  pageSize={data.data.pagination.pageSize}
                  extraParams={urlExtraParams}
                  onPageSizeChange={(newSize) => {
                    const params = new URLSearchParams(urlSearchParams);
                    params.set('pageSize', newSize.toString());
                    params.set('page', '1'); // Reset to first page when changing page size
                    setUrlSearchParams(params, { replace: true });
                  }}
                />
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default MostDamagingEvents;
