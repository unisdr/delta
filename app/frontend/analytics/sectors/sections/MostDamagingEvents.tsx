import { useState, memo, useCallback, useMemo } from "react";
import { formatCurrencyWithCode } from "~/frontend/utils/formatters";


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
    disasterEventId?: string | null;
  };
  currency: string;
  mostDamagingEventsData: ApiResponse | null;
  sectorsData: any; // Using any to handle various structures from the loader
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

const MostDamagingEvents = memo(function MostDamagingEvents({ filters, currency, mostDamagingEventsData, sectorsData }: MostDamagingEventsProps) {
  const [page, setPage] = useState(1);
  const [sortState, setSortState] = useState<{ column: SortColumn; direction: "asc" | "desc" }>({
    column: "damages",
    direction: "desc"
  });

  // For backward compatibility with existing code
  const sortColumn = sortState.column;
  const sortDirection = sortState.direction;

  // Helper function to find sector and its parent
  const findSectorWithParent = (sectorsArray: Sector[] | null | undefined) => {
    // Return a function that can be used to find sectors
    return (targetId: string) => {
      if (!sectorsArray) return { sector: undefined, parent: undefined };

      for (const sector of sectorsArray) {
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
  };

  // Extract sectors array from the sectorsData prop safely
  const getSectorsArray = () => {
    try {
      if (!sectorsData) return null;

      // Handle different possible structures
      if ('sectors' in sectorsData) {
        const sectors = sectorsData.sectors;
        if (Array.isArray(sectors)) {
          return sectors;
        } else if (sectors && 'sectors' in sectors) {
          return sectors.sectors;
        }
      }
      return null;
    } catch (error) {
      console.error('Error extracting sectors array:', error);
      return null;
    }
  };

  const sectorsArray = getSectorsArray();
  const sectorFinder = findSectorWithParent(sectorsArray);

  // Memoized title calculation based on sector/subsector selection
  const sectionTitle = useMemo(() => {
    try {
      if (!sectorsArray) return "Most Damaging Events";

      if (filters.sectorId) {
        const { sector } = sectorFinder(filters.sectorId);

        if (filters.subSectorId && sector) {
          // Case: Subsector is selected
          const { sector: subsector, parent: mainSector } = sectorFinder(filters.subSectorId);
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
  }, [sectorsArray, sectorFinder, filters.sectorId, filters.subSectorId]);

  // Process the loader data
  const data = mostDamagingEventsData;
  const isLoading = false; // Loader handles loading state
  const isError = !mostDamagingEventsData?.success;

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
        if (prevState.column === column) {
          return {
            ...prevState,
            direction: prevState.direction === "asc" ? "desc" : "asc"
          };
        } else {
          return {
            column,
            direction: "desc"
          };
        }
      });
    } catch (error) {
      console.error("Error handling sort:", error);
    }
  }, []);

  return (
    <div className="dts-page-section">
      <h2 className="dts-section-title">{sectionTitle}</h2>
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
});

export default MostDamagingEvents;
