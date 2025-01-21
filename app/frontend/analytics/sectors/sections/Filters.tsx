import React, { useEffect, useState } from "react";
import { DateRange, DateRangePicker } from "react-date-range";
import { format, addDays } from "date-fns";
import "react-date-range/dist/styles.css"; // Main styles
import "react-date-range/dist/theme/default.css"; // Theme styles

// Interfaces for filter data
interface Sector {
  id: number;
  name: string;
  type: string;
  parent_id: number | null;
}

interface Subsector {
  id: number;
  name: string;
  parent_id: number | null;
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
  const [subSectors, setSubSectors] = useState<Subsector[]>([]);
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

        console.log("Fetched sectors:", sectorsData); // Log fetched data here
        setSectors(sectorsData);
        setDisasterEvents(disasterEventsData);
      } catch (error) {
        console.error("Error fetching filter data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFilters();
  }, []);

  // Handle filter change for dropdowns
  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  
    if (field === "sectorId") {
      const selectedSector = sectors.find((sector) => sector.id.toString() === value);
      if (selectedSector) {
        const filteredSubSectors = sectors.filter(
          (sector) => sector.parent_id === selectedSector.id
        );
        setSubSectors(filteredSubSectors);
      } else {
        setSubSectors([]);
      }
  
      // Reset sub-sector selection if sector changes
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
        `/api/disaster-events?query=${encodeURIComponent(query)}`
      ).then((res) => res.json());
      setAutocompleteResults(searchResults);
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
   setFilters((prev) => ({
     ...prev,
     dateRange: `${format(selectedRange.startDate, "MM/dd/yyyy")} - ${format(
       selectedRange.endDate,
       "MM/dd/yyyy"
     )}`,
   }));
   setDatePickerVisible(false); // Hide the date picker after selection
 };

  return (
    <div className="mg-grid mg-grid__col-3">
      {/* Sector dropdown */}
      <div className="dts-form-component">
      <label htmlFor="sector-select">Sector</label>
  <select
    id="sector-select"
    className="filter-select"
    value={filters.sectorId}
    onChange={(e) => handleFilterChange("sectorId", e.target.value)}
  >
    <option value="" disabled>
      {loading ? "Loading sectors..." : sectors.length > 0 ? "Select Sector Type" : "No data"}
    </option>
    {sectors
      .filter((sector) => sector.parent_id === null) // Filter only top-level sectors
      .map((sector) => (
        <option key={sector.id} value={sector.id}>
          {sector.name} {/* Display the name instead of type */}
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
            {loading
              ? "Loading sub-sectors..."
              : subSectors.length > 0
              ? "Select Sub Sector"
              : "No data"}
          </option>
          {subSectors.map((subSector) => (
            <option key={subSector.id} value={subSector.id}>
              {subSector.name}
            </option>
          ))}
        </select>
      </div>

      {/* Disaster event search input */}
      <div className="dts-form-component">
        <label htmlFor="event-search">Disaster event</label>
        <input
          id="event-search"
          type="text"
          className="filter-search"
          placeholder={loading ? "Loading events..." : "Search events..."}
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
      <div className="dts-form-component" style={{ position: "relative" }}>
        <label htmlFor="date-range">Date range</label>
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
          <div
          style={{
            position: "absolute",
            top: "100%", // Position below the input
            left: 0, // Align to the left of the input
            zIndex: 1000, // Ensure it appears above other content
          }}
        >
          <DateRangePicker
            ranges={dateRange}
            onChange={handleDateRangeChange}
            showSelectionPreview={false}
            moveRangeOnFirstSelection={false}
            editableDateInputs={false}
            rangeColors={["#007bff"]}
            staticRanges={[]} // Removes extra options like "Today", "Yesterday"
            inputRanges={[]} // Removes predefined input ranges
          />
        </div>
        )}
      </div>

      {/* Action buttons */}
      <div
        className="mg-grid mg-grid__col-3 dts-form__actions"
        style={{
          gridColumn: "1 / -1",
          display: "flex",
          justifyContent: "flex-end",
          gap: "1rem",
        }}
      >
        <button
          className="mg-button mg-button--small mg-button-outline"
          type="button"
          onClick={() => {
            setFilters({ sectorId: "", subSectorId: "", disasterEventId: "", dateRange: "" });
            setDateRange([
              {
                startDate: new Date(),
                endDate: addDays(new Date(), 7),
                key: "selection",
              },
            ]);
          }}
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
