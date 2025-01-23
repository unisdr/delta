import React, { useEffect, useState } from "react";
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
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [subSectors, setSubSectors] = useState<Sector[]>([]);
  const [disasterEvents, setDisasterEvents] = useState<DisasterEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    sectorId: "",
    subSectorId: "",
    disasterEventId: "",
    dateRange: "",
  });

  const [autocompleteResults, setAutocompleteResults] = useState<DisasterEvent[]>([]);
  const [dateRange, setDateRange] = useState([
    {
      startDate: new Date(),
      endDate: addDays(new Date(), 7),
      key: "selection",
    },
  ]);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);

  // Fetch sectors and disaster events on mount
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        setLoading(true);
        const [sectorsData, disasterEventsData] = await Promise.all([
          fetch("/api/analytics/sectors").then((res) => res.json()),
          fetch("/api/analytics/disaster-events").then((res) => res.json()),
        ]);

        setSectors(sectorsData.sectors); // Updated to match API response structure
        setDisasterEvents(disasterEventsData.disasterEvents); // Updated to match API response structure
      } catch (error) {
        console.error("Error fetching filter data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFilters();
  }, []);

  // Updated handleFilterChange function
  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));

    if (field === "sectorId") {
      const selectedSector = sectors.find((sector) => sector.id === parseInt(value, 10));
      console.log("Selected Sector:", selectedSector); // Debugging log to inspect selected sector

      // Use the subsectors field returned from the API
      setSubSectors(selectedSector?.subsectors || []);

      // Reset the sub-sector selection when sector changes
      setFilters((prev) => ({ ...prev, subSectorId: "" }));
    }
  };

  // Handle autocomplete search for disaster events
  const handleAutocomplete = async (query: string) => {
    if (query.trim() === "") {
      setAutocompleteResults([]);
      return;
    }

    try {
      setLoading(true);
      const searchResults = await fetch(
        `/api/analytics/disaster-events?query=${encodeURIComponent(query)}`
      ).then((res) => res.json());
      setAutocompleteResults(searchResults.disasterEvents); // Updated to match API response structure
    } catch (error) {
      console.error("Error fetching autocomplete results:", error);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters, including formatted date range
  const handleApplyFilters = () => {
    const startDate = format(dateRange[0].startDate, "MM/dd/yyyy");
    const endDate = format(dateRange[0].endDate, "MM/dd/yyyy");
    const dateRangeString = `${startDate} - ${endDate}`;

    onApplyFilters({
      sectorId: filters.sectorId || null,
      subSectorId: filters.subSectorId || null,
      disasterEventId: filters.disasterEventId || null,
      dateRange: dateRangeString,
    });
  };

  // Handle date range selection
  const handleDateRangeChange = (ranges: { [key: string]: DateRange }) => {
    const selectedRange = ranges["selection"];
    setDateRange([selectedRange]);
    setFilters((prev) => ({
      ...prev,
      dateRange: `${format(selectedRange.startDate, "MM/dd/yyyy")} - ${format(
        selectedRange.endDate,
        "MM/dd/yyyy"
      )}`,
    }));
    setDatePickerVisible(false); // Hide the date picker after selection
  };

  // Clear all filters
  const handleClearFilters = () => {
    setFilters({ sectorId: "", subSectorId: "", disasterEventId: "", dateRange: "" });
    setSubSectors([]);
    setDateRange([
      {
        startDate: new Date(),
        endDate: addDays(new Date(), 7),
        key: "selection",
      },
    ]);
    onClearFilters();
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
            {loading ? "Loading sectors..." : "Select Sector Type"}
          </option>
          {sectors
            .filter((sector) => sector.parentId === null) // Only top-level sectors
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
              {subSector.subsector} {/* Correctly displaying the "subsector" field */}
            </option>
          ))}
        </select>
      </div>

      {/* Disaster event search input */}
      <div className="dts-form-component">
        <label htmlFor="event-search">Disaster Event</label>
        <input
          id="event-search"
          type="text"
          className="filter-search"
          placeholder="Search events..."
          value={filters.disasterEventId}
          onChange={(e) => {
            handleFilterChange("disasterEventId", e.target.value);
            handleAutocomplete(e.target.value);
          }}
        />
        {autocompleteResults.length > 0 && (
          <ul className="autocomplete-list">
            {autocompleteResults.map((event) => (
              <li
                key={event.id}
                onClick={() => {
                  setFilters((prev) => ({ ...prev, disasterEventId: event.name }));
                  setAutocompleteResults([]);
                }}
              >
                {event.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Date range picker */}
      <div className="dts-form-component">
        <label htmlFor="date-range">Date Range</label>
        <input
          id="date-range"
          type="text"
          className="filter-date"
          value={filters.dateRange}
          placeholder="Select a date range"
          readOnly
          onClick={() => setDatePickerVisible((prev) => !prev)}
        />
        {isDatePickerVisible && (
          <DateRangePicker
            ranges={dateRange}
            onChange={handleDateRangeChange}
            staticRanges={[]} // Removes predefined ranges
            inputRanges={[]} // Removes quick input ranges
          />
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