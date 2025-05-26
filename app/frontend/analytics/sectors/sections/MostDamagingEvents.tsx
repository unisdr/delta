import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrencyWithCode } from "~/frontend/utils/formatters";
import { useDebounce } from "~/frontend/hooks/useDebounce";

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

export default function MostDamagingEvents({ filters, currency }: MostDamagingEventsProps) {
  const [page, setPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<SortColumn>("damages");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

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

  // Construct title based on sector/subsector selection
  const sectionTitle = () => {
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
  };

  // Debounce filters to prevent too many API calls
  const debouncedFilters = useDebounce(filters, 300);

  // Fetch data using React Query
  const { data, isLoading, isError } = useQuery<ApiResponse>({
    queryKey: ["mostDamagingEvents", debouncedFilters, page, sortColumn, sortDirection],
    queryFn: async () => {
      try {
        const searchParams = new URLSearchParams();

        // Only use sectorId if no subsectorId is selected
        if (debouncedFilters.subSectorId) {
          searchParams.append('sectorId', debouncedFilters.subSectorId);
        } else if (debouncedFilters.sectorId) {
          searchParams.append('sectorId', debouncedFilters.sectorId);
        }

        // Add other filters (excluding sectorId and subSectorId since we handled them above)
        Object.entries(debouncedFilters).forEach(([key, value]) => {
          if (value && key !== 'sectorId' && key !== 'subSectorId') {
            searchParams.append(key, value);
          }
        });

        // Add pagination and sorting params
        searchParams.append("page", page.toString());
        searchParams.append("pageSize", "20");
        searchParams.append("sortBy", sortColumn);
        searchParams.append("sortDirection", sortDirection);

        const response = await fetch(`/api/analytics/most-damaging-events?${searchParams}`);
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
    enabled: !!(debouncedFilters.sectorId || debouncedFilters.subSectorId || debouncedFilters.hazardTypeId || debouncedFilters.hazardClusterId || debouncedFilters.specificHazardId || debouncedFilters.geographicLevelId || debouncedFilters.fromDate || debouncedFilters.toDate),
  });

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  return (
    <div className="dts-page-section">
      <h2 className="dts-section-title">{sectionTitle()}</h2>
      <p className="dts-body-text mb-6">
        Displays key disasters by damage, losses, and dates.
      </p>

      {isLoading ? (
        <div className="text-center p-4">
          <p>Loading data...</p>
        </div>
      ) : isError ? (
        <div className="text-center p-4 text-red-600">
          <p>Error loading data. Please try again.</p>
        </div>
      ) : !data?.success || !data?.data?.events?.length ? (
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
                {data.data.events.map((event: DisasterEvent) => (
                  <tr key={event.eventId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {event.eventName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrencyWithCode(event.totalDamages, currency, {}, 
                        event.totalDamages >= 1_000_000_000 ? 'billions' : 
                        event.totalDamages >= 1_000_000 ? 'millions' : 
                        event.totalDamages >= 1_000 ? 'thousands' : 
                        undefined
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrencyWithCode(event.totalLosses, currency, {}, 
                        event.totalLosses >= 1_000_000_000 ? 'billions' : 
                        event.totalLosses >= 1_000_000 ? 'millions' : 
                        event.totalLosses >= 1_000 ? 'thousands' : 
                        undefined
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(event.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.data.pagination.totalPages > 1 && (
            <div className="mt-4 flex justify-end items-center gap-4">
              <span className="text-sm text-gray-700">
                Page {page} of {data.data.pagination.totalPages}
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= data.data.pagination.totalPages}
                  className="px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
