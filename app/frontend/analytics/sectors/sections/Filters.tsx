import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "react-query";
import { DateRange, DateRangePicker } from "react-date-range";
import { format, addDays } from "date-fns";
import Swal from "sweetalert2";

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

interface Hazard {
  id: string;
  name: string;
}

interface FiltersProps {
  onApplyFilters: (filters: {
    sectorId: string | null;
    subSectorId: string | null;
    hazardTypeId: string | null;
    hazardClusterId: string | null;
    specificHazardId: string | null;
    geographicLevelId: string | null;
    fromDate: string | null;
    toDate: string | null;
    disasterEventId: string | null;
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

  const [isMounted, setIsMounted] = useState(false); // Ensure hydration consistency
  const [filters, setFilters] = useState({
    sectorId: "",
    subSectorId: "",
    hazardTypeId: "",
    hazardClusterId: "",
    specificHazardId: "",
    geographicLevelId: "",
    fromDate: "",
    toDate: "",
    disasterEventId: "",
  });



  // Ensure the component is mounted before running client-side code
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [subSectors, setSubSectors] = useState<Sector[]>([]); // For filtered subsectors
  const [dateRange, setDateRange] = useState<DateRange[] | null>(null); // Initialize as null
  const [isDatePickerVisible, setDatePickerVisible] = useState(false); // Toggle visibility of calendar

  const [dropdownVisibility, setDropdownVisibility] = useState<{
    [key: string]: boolean;
  }>({
    hazardTypeId: false,
    hazardClusterId: false,
    specificHazardId: false,
    geographicLevelId: false,
  });

  // Fetch data from the REST API
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

  // React Query for fetching hazard types
  const { data: hazardTypesData } = useQuery(
    ["hazardTypes", filters.hazardTypeId],
    async () => {
      const response = await fetch(`/api/analytics/hazard-types`);
      return response.json();
    }
  );

  // React Query for fetching hazard clusters
  const { data: hazardClustersData } = useQuery(
    ["hazardClusters", filters.hazardClusterId],
    async () => {
      const response = await fetch(`/api/analytics/hazard-clusters`);
      return response.json();
    }
  );

  // React Query for fetching specific hazards
  const { data: specificHazardsData } = useQuery(
    ["specificHazards", filters.specificHazardId],
    async () => {
      const response = await fetch(`/api/analytics/specific-hazards`);
      return response.json();
    }
  );

  // React Query for fetching geographic levels
  const { data: geographicLevelsData } = useQuery(
    ["geographicLevels", filters.geographicLevelId],
    async () => {
      const response = await fetch(`/api/analytics/geographic-levels`);
      return response.json();
    }
  );

  // Extract data from the fetched data
  const sectors: Sector[] = sectorsData?.sectors || [];
  const hazardTypes: Hazard[] = hazardTypesData?.hazardTypes || [];
  const hazardClusters: Hazard[] = hazardClustersData?.clusters || [];
  const specificHazards: Hazard[] = specificHazardsData?.hazards || [];
  const geographicLevels: Hazard[] =
    geographicLevelsData?.levels.map((level: { id: number; name: { en: string } }) => ({
      id: level.id,
      name: level.name.en,
    })) || [];

  const disasterEvents: DisasterEvent[] = disasterEventsData?.disasterEvents?.rows || [];

  // Debug to ensure correct data mapping
  // console.log("Hazard Types:", hazardTypes);
  // console.log("Hazard Clusters:", hazardClusters);
  // console.log("Specific Hazards:", specificHazards);
  // console.log("Geographic Levels:", geographicLevels);

  // Handle filter changes
  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));

    if (field === "sectorId") {
      const selectedSector = sectors.find((sector) => sector.id === parseInt(value, 10));
      setSubSectors(selectedSector?.subsectors || []); // Update subsectors dropdown
      setFilters((prev) => ({ ...prev, subSectorId: "" })); // Reset subsector
    }
  };

  const toggleDropdown = (field: keyof typeof filters, visible: boolean) => {
    setDropdownVisibility((prev) => ({ ...prev, [field]: visible }));
  };

  // Apply filters and include the date range conditionally
  const handleApplyFilters = () => {
    if (!filters.sectorId) {
      Swal.fire({
        icon: 'warning',
        // title: 'Missing Sector',
        text: 'Please select a sector first.',
        confirmButtonText: 'OK'
      });
      return;
    }


    onApplyFilters({
      sectorId: filters.sectorId || null,
      subSectorId: filters.subSectorId || null,
      hazardTypeId: filters.hazardTypeId || null,
      hazardClusterId: filters.hazardClusterId || null,
      specificHazardId: filters.specificHazardId || null,
      geographicLevelId: filters.geographicLevelId || null,
      fromDate: filters.fromDate || null,
      toDate: filters.toDate || null,
      disasterEventId: filters.disasterEventId || null,
    });
  };


  // Clear all filters
  const handleClearFilters = () => {
    setFilters({
      sectorId: "",
      subSectorId: "",
      hazardTypeId: "",
      hazardClusterId: "",
      specificHazardId: "",
      geographicLevelId: "",
      fromDate: "",
      toDate: "",
      disasterEventId: ""
    });
    setSubSectors([]); // Clear sub-sector options
    onClearFilters(); // Call parent clear handler
  };

  // Render autocomplete list
  const renderAutocomplete = (
    items: Array<{ id: string | number; name: string }>,
    field: keyof typeof filters,
    loading: boolean,
    placeholder: string
  ) => {
    const filteredItems = items.filter((item) =>
      item.name.toLowerCase().includes(filters[field].toLowerCase())
    );

    return (
      <div className="dts-form-component">
        <label>{placeholder}</label>
        <div style={{ position: "relative" }}>
          <input
            type="text"
            className="filter-search"
            placeholder={`Search ${placeholder.toLowerCase()}...`}
            value={filters[field]}
            onChange={(e) => {
              handleFilterChange(field, e.target.value);
              toggleDropdown(field, true);
            }}
            onFocus={() => toggleDropdown(field, true)}
            onBlur={() => toggleDropdown(field, false)}
          />
          {loading && <p>Loading...</p>}
          {!loading && dropdownVisibility[field] && (
            <ul className="autocomplete-list">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <li
                    key={item.id}
                    onMouseDown={() => {
                      setFilters((prev) => ({ ...prev, [field]: item.name }));
                      queryClient.invalidateQueries([field]);
                      toggleDropdown(field, false);
                    }}
                  >
                    {item.name}
                  </li>
                ))
              ) : (
                <li className="no-results">No matching {placeholder.toLowerCase()} found</li>
              )}
            </ul>
          )}
        </div>
      </div>
    );
  };

  if (!isMounted) {
    return null; // Avoid rendering until the client has mounted
  }

  return (
    <div className="mg-grid mg-grid__col-6">
      {/* Row 1: Sector and Sub Sector */}
      <div className="dts-form-component mg-grid__col--span-3">
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
            .filter((sector) => sector.parentId === null)
            .map((sector) => (
              <option key={sector.id} value={sector.id}>
                {sector.sectorname}
              </option>
            ))}
        </select>
      </div>

      <div className="dts-form-component mg-grid__col--span-3">
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

      {/* Row 2: Hazard Type, Hazard Cluster, and Specific Hazard */}
      <div className="dts-form-component mg-grid__col--span-2">
        {renderAutocomplete(hazardTypes, "hazardTypeId", false, "Hazard Type")}
      </div>

      <div className="dts-form-component mg-grid__col--span-2">
        {renderAutocomplete(hazardClusters, "hazardClusterId", false, "Hazard Cluster")}
      </div>

      <div className="dts-form-component mg-grid__col--span-2">
        {renderAutocomplete(specificHazards, "specificHazardId", false, "Specific Hazard")}
      </div>

      {/* Row 3: Geographic Level, From, and To */}
      <div className="dts-form-component mg-grid__col--span-2">
        {renderAutocomplete(geographicLevels, "geographicLevelId", false, "Geographic Level")}
      </div>

      <div className="dts-form-component mg-grid__col--span-2">
        <label>From</label>
        <input
          type="date"
          className="filter-date"
          value={filters.fromDate}
          onChange={(e) => handleFilterChange("fromDate", e.target.value)}
        />
      </div>

      <div className="dts-form-component mg-grid__col--span-2">
        <label>To</label>
        <input
          type="date"
          className="filter-date"
          value={filters.toDate}
          onChange={(e) => handleFilterChange("toDate", e.target.value)}
        />
      </div>

      {/* Row 4: Disaster Event and Action Buttons */}
      <div className="dts-form-component mg-grid__col--span-4">
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
            filters.disasterEventId.trim() !== "" &&
            !disasterEvents.some((event) => event.name === filters.disasterEventId) && (
              <ul className="autocomplete-list">
                {disasterEvents.length > 0 ? (
                  disasterEvents.map((event) => (
                    <li
                      key={event.id}
                      onClick={() => {
                        setFilters((prev) => ({
                          ...prev,
                          disasterEventId: event.name,
                        }));
                        queryClient.invalidateQueries("disasterEvents");
                      }}
                    >
                      {event.name}
                    </li>
                  ))
                ) : (
                  <li className="no-results">No matching events found</li>
                )}
              </ul>
            )
          )}
        </div>
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
