import React, { useState } from "react";
import { useQuery, useQueryClient } from "react-query";
import { DateRange, DateRangePicker } from "react-date-range";
import { format, addDays } from "date-fns";
import "react-date-range/dist/styles.css"; // Main styles
import "react-date-range/dist/theme/default.css"; // Theme styles

// Interfaces for filter data
interface Sector {
  id: number;
  sectorname: string;
  parentId: number | null;
  subsector: string;
  description: string | null;
  subsectors?: Sector[];
}

interface DisasterEvent {
  id: string;
  name: string;
}

interface FiltersProps {
  onApplyFilters: (filters: {
    sectorId: string | null;
    subSectorId: string | null;
    disasterEventId: string | null;
    dateRange: string | null;
  }) => void;
  onAdvancedSearch: () => void;
  onClearFilters: () => void;
}

const Filters: React.FC<FiltersProps> = ({
  onApplyFilters,
  onAdvancedSearch,
  onClearFilters,
}) => {
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({
    sectorId: "",
    subSectorId: "",
    disasterEventId: "",
    dateRange: "",
  });

  
  const [subSectors, setSubSectors] = useState<Sector[]>([]); // For filtered subsectors
  const [dateRange, setDateRange] = useState<DateRange[] | null>(null); // Initialize as null
  const [isDatePickerVisible, setDatePickerVisible] = useState(false); // Toggle visibility of calendar

  // React Query for fetching sectors
  const { data: sectorsData, isLoading: sectorsLoading } = useQuery("sectors", async () => {
    const response = await fetch("/api/analytics/sectors");
    if (!response.ok) throw new Error("Failed to fetch sectors");
    return response.json();
  });

  // React Query for fetching disaster events
  const { data: disasterEventsData, isLoading: eventsLoading } = useQuery(
    ["disasterEvents", filters.disasterEventId],
    async () => {
      const response = await fetch(
        `/api/analytics/disaster-events?query=${encodeURIComponent(filters.disasterEventId)}`
      );
      if (!response.ok) throw new Error("Failed to fetch disaster events");
      return response.json();
    },
    {
      enabled: !!filters.disasterEventId, // Only fetch if disasterEventId is non-empty
    }
  );

  // Extract sectors and disaster events
  const sectors: Sector[] = sectorsData?.sectors || [];
  const disasterEvents: DisasterEvent[] = disasterEventsData?.disasterEvents?.rows || [];

  // Handle filter changes
  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));

    if (field === "sectorId") {
      const selectedSector = sectors.find((sector) => sector.id === parseInt(value, 10));
      setSubSectors(selectedSector?.subsectors || []); // Update subsectors dropdown
      setFilters((prev) => ({ ...prev, subSectorId: "" })); // Reset subsector
    }
  };

  // Apply filters and include the date range conditionally
  const handleApplyFilters = () => {
    const formattedDateRange =
      dateRange && dateRange[0]?.startDate && dateRange[0]?.endDate
        ? `${format(dateRange[0].startDate, "MM/dd/yyyy")} - ${format(
            dateRange[0].endDate,
            "MM/dd/yyyy"
          )}`
        : null;

    onApplyFilters({
      sectorId: filters.sectorId || null,
      subSectorId: filters.subSectorId || null,
      disasterEventId: filters.disasterEventId || null,
      dateRange: formattedDateRange, // Pass null if no date range is selected
    });
  };


  // Handle date range selection
  const handleDateRangeChange = (ranges: { [key: string]: DateRange }) => {
    const selectedRange = ranges["selection"];
    setDateRange([selectedRange]);
    setFilters((prev) => ({
      ...prev,
      dateRange: selectedRange.startDate && selectedRange.endDate
        ? `${format(selectedRange.startDate, "MM/dd/yyyy")} - ${format(
            selectedRange.endDate,
            "MM/dd/yyyy"
          )}`
        : "",
    }));
    setDatePickerVisible(false); // Close the calendar after selection
  };


  // Clear all filters
  const handleClearFilters = () => {
    setFilters({ sectorId: "", subSectorId: "", disasterEventId: "", dateRange: "" });
    setSubSectors([]); // Clear sub-sector options
    setDateRange(null); // Reset the date range to null
    onClearFilters(); // Call parent clear handler
  };

  return (
    <div className="mg-grid mg-grid__col-3">
      {/* Sector dropdown */}
      <div className="dts-form-component">
        <label htmlFor="sector-select">Sector *</label>
        <select
          id="sector-select"
          className="filter-select"
          value={filters.sectorId}
          required
          onChange={(e) => handleFilterChange("sectorId", e.target.value)}
        >
          <option value="" disabled>
            {sectorsLoading ? "Loading sectors..." : "Select Sector Type"}
          </option>
          {sectors
            .filter((sector) => sector.parentId === null) // Filter top-level sectors
            .map((sector) => (
              <option key={sector.id} value={sector.id}>
                {sector.sectorname}
              </option>
            ))}
        </select>
      </div>

      {/* Sub Sector dropdown */}
      <div className="dts-form-component">
        <label htmlFor="sub-sector-select">Sub Sector</label>
        <select
          id="sub-sector-select"
          className="filter-select"
          value={filters.subSectorId}
          onChange={(e) => handleFilterChange("subSectorId", e.target.value)}
          disabled={!filters.sectorId}
        >
          <option value="" disabled>
            {filters.sectorId ? "Select Sub Sector" : "Select Sector First"}
          </option>
          {subSectors.map((subSector) => (
            <option key={subSector.id} value={subSector.id}>
              {subSector.subsector}
            </option>
          ))}
        </select>
      </div>

      {/* Disaster event search input */}
      <div className="dts-form-component">
        <label htmlFor="event-search">Disaster Event</label>
        <div style={{ position: "relative" }}>
          <input
            id="event-search"
            type="text"
            className="filter-search"
            placeholder="Search events..."
            value={filters.disasterEventId}
            onChange={(e) => handleFilterChange("disasterEventId", e.target.value)}
          />
          {eventsLoading ? (
            <div style={{ marginTop: "0.5rem", color: "#004f91" }}>Loading...</div>
          ) : (
            filters.disasterEventId.trim() !== "" && !disasterEvents.some(event => event.name === filters.disasterEventId) && ( // Show dropdown only if input is not empty and no event is selected
              <ul className="autocomplete-list">
                {disasterEvents.length > 0 ? (
                  disasterEvents.map((event) => (
                    <li
                      key={event.id}
                      onClick={() => {
                        setFilters((prev) => ({
                          ...prev,
                          disasterEventId: event.name, // Update input with the selected event
                        }));
                        queryClient.invalidateQueries("disasterEvents"); // Hide dropdown
                      }}
                    >
                      {event.name}
                    </li>
                  ))
                ) : (
                  <li className="no-results">No matching events found</li> // Show only when no results
                )}
              </ul>
            )
          )}
        </div>
      </div>

      {/* Date range picker */}
      <div className="dts-form-component" style={{ position: "relative" }}>
        <label htmlFor="date-range">Date Range</label>
        <input
          id="date-range"
          type="text"
          className="filter-date"
          value={filters.dateRange || ""}
          placeholder="Select a date range"
          readOnly
          onClick={() => setDatePickerVisible(!isDatePickerVisible)}
        />
        {isDatePickerVisible && (
          <div style={{ position: "absolute", zIndex: 10 }}>
            <DateRangePicker
              ranges={
                dateRange || [
                  {
                    startDate: new Date(), // Provide a default value if null
                    endDate: new Date(),   // Provide a default value if null
                    key: "selection",
                  },
                ]
              }
              onChange={handleDateRangeChange}
              staticRanges={[]} // Removes predefined ranges
              inputRanges={[]} // Removes quick input ranges
            />
          </div>
        )}
      </div>
      

      {/* Action buttons */}
      <div className="mg-grid mg-grid__col-3 dts-form__actions"
        style={{
          gridColumn: "1 / -1", // Span all columns
          display: "flex",      // Flex display for alignment
          justifyContent: "flex-end", // Align buttons to the right
          gap: "1rem",          // Add spacing between buttons
        }}
      >
        <button
          className="mg-button mg-button--small mg-button-outline"
          type="button"
          onClick={handleClearFilters}
        >
          Clear
        </button>
        <button
          className="mg-button mg-button--small mg-button-primary"
          type="button"
          onClick={handleApplyFilters}
        >
          Apply filters
        </button>
        <button
          className="mg-button mg-button--small mg-button-ghost"
          type="button"
          onClick={onAdvancedSearch}
        >
          Advanced search
        </button>
      </div>
    </div>
  );
};

export default Filters;
