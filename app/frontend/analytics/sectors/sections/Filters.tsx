import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "react-query";
import Swal from "sweetalert2";
import { AiOutlineSearch } from "react-icons/ai"; // Import the Search Icon from react-icons

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
  const [searchTimeout, setSearchTimeout] = useState<number | null>(null);

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
      initialData: { disasterEvents: { rows: [] } }, // Ensure consistent initial state
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
  const { data: hazardClustersData, isFetching: isFetchingClusters } = useQuery(
    ["hazardClusters", filters.hazardClusterId],
    async () => {
      const response = await fetch(`/api/analytics/hazard-clusters?hazardTypeId=${filters.hazardTypeId}`);
      return response.json();
    },
    {
      enabled: !!filters.hazardTypeId, // Only run this query if hazardTypeId is set
    }
  );
  // console.log("Selected Hazard Cluster ID:", filters.hazardClusterId);

  // React Query for fetching specific hazards
  const [searchQuery, setSearchQuery] = useState(""); // Add searchQuery state

  const { data: specificHazardsData } = useQuery(
    ["specificHazards", filters.hazardClusterId, searchQuery], // Include searchQuery
    async () => {
      if (!filters.hazardClusterId) {
        return { hazards: [] }; // Return empty results if hazardClusterId is invalid
      }
      const response = await fetch(
        `/api/analytics/specific-hazards?clusterId=${filters.hazardClusterId}&searchQuery=${searchQuery}`
      );
      if (!response.ok) throw new Error("Failed to fetch specific hazards");
      return response.json();
    },
    {
      enabled: !!filters.hazardClusterId, // Only run the query if hazardClusterId is set
    }
  );



  // console.log("Selected Hazard Cluster ID:", filters.hazardClusterId);
  // console.log("Specific Hazards Data:", specificHazardsData);

  // React Query for fetching geographic levels
  const { data: geographicLevelsData } = useQuery(
    ["geographicLevels", filters.geographicLevelId],
    async () => {
      const response = await fetch(`/api/analytics/geographic-levels`);
      return response.json();
    }
  );

  // Function to handle specific hazard selection
  const handleSpecificHazardSelection = async (specificHazardId: string) => {
    try {
      const response = await fetch(`/api/analytics/related-hazard-data?specificHazardId=${specificHazardId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch related hazard data");
      }

      const { hazardClusterId, hazardTypeId } = await response.json();

      // Convert IDs to strings before updating the filters
      setFilters((prev) => ({
        ...prev,
        hazardClusterId: hazardClusterId.toString(),
        hazardTypeId: hazardTypeId.toString(),
      }));
    } catch (error) {
      console.error("Error fetching related hazard data:", error);
    }
  };



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

  const disasterEvents: DisasterEvent[] = disasterEventsData?.disasterEvents?.rows || [
    // Provide placeholder/default data if needed
  ];

  // Debug to ensure correct data mapping
  // console.log("Hazard Types:", hazardTypes);
  // console.log("Hazard Clusters:", hazardClusters);
  // console.log("Specific Hazards:", specificHazards);
  // console.log("Geographic Levels:", geographicLevels);

  // Handle filter changes
  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    setFilters((prev) => {
      const updatedFilters = { ...prev, [field]: value };

      // Reset dependent fields for sectors
      if (field === "sectorId") {
        const selectedSector = sectors.find((sector) => sector.id === parseInt(value, 10));
        setSubSectors(selectedSector?.subsectors || []); // Update subsectors dropdown
        updatedFilters.subSectorId = ""; // Reset sub-sector
      }

      // Reset dependent fields for hazard filtering
      if (field === "hazardTypeId") {
        updatedFilters.hazardClusterId = ""; // Reset Hazard Cluster
        updatedFilters.specificHazardId = ""; // Reset Specific Hazard

        setDisplayValues((prev) => ({
          ...prev,
          hazardClusterId: "",
          specificHazardId: "",
        })); // Reset display values
      } else if (field === "hazardClusterId") {
        updatedFilters.specificHazardId = ""; // Reset Specific Hazard

        setDisplayValues((prev) => ({
          ...prev,
          specificHazardId: "",
        })); // Reset display value
      }

      // Trigger back-propagation when specificHazardId is updated
      if (field === "specificHazardId") {
        handleSpecificHazardSelection(value);
      }

      return updatedFilters;
    });
    console.log(`Filter updated: ${field} = ${value}`);
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
        confirmButtonText: 'OK',
        buttonsStyling: false, // Disable default button styling
        customClass: {
          popup: 'swal2-custom-popup', // Apply the custom popup styles
          confirmButton: 'swal2-custom-button', // Apply the custom button styles
        },
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
    setDisplayValues({
      hazardTypeId: "",
      hazardClusterId: "",
      specificHazardId: "",
      geographicLevelId: "",
    });
    setSubSectors([]); // Clear sub-sector options
    onClearFilters(); // Call parent clear handler
  };

  const [displayValues, setDisplayValues] = useState<{
    [key: string]: string;
  }>({
    hazardTypeId: "",
    hazardClusterId: "",
    specificHazardId: "",
    geographicLevelId: "",
  });

  // Render autocomplete list
  const renderAutocomplete = (
    items: Array<{ id: string | number; name: string }>,
    field: keyof typeof filters,
    loading: boolean,
    placeholder: string
  ) => {
    const filteredItems = items.filter(
      (item) =>
        item.name.toLowerCase().includes(displayValues[field].toLowerCase()) || // Match by name
        item.id.toString().toLowerCase().includes(displayValues[field].toLowerCase()) // Match by ID
    );

    return (
      <div className="dts-form-component">
        <label htmlFor={`${field}-input`}>{placeholder}</label>
        <span>{placeholder}</span>
        <div style={{ position: "relative" }}>
          <input
            id={`${field}-input`}
            type="text"
            className="filter-search"
            placeholder={`Search ${placeholder.toLowerCase()}...`}
            value={displayValues[field]} // Use displayValues from state
            onChange={(e) => {
              setDisplayValues((prev) => ({
                ...prev,
                [field]: e.target.value,
              }));

              if (searchTimeout) {
                clearTimeout(searchTimeout); // Clear the previous timeout
              }

              const newTimeout = window.setTimeout(() => {
                setSearchQuery(e.target.value);
              }, 300); // Debounce: Wait 300ms before updating search

              setSearchTimeout(newTimeout); // Save the timeout ID

              toggleDropdown(field, true);
            }}
            onFocus={() => toggleDropdown(field, true)}
            onBlur={() => toggleDropdown(field, false)}
          />
          <AiOutlineSearch className="search-icon" />
          {loading && <p style={{ color: "blue", fontStyle: "italic" }}>Loading {placeholder.toLowerCase()}...</p>}
          {!loading && dropdownVisibility[field] && (
            <ul className="autocomplete-list">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <li
                    key={item.id}
                    onMouseDown={() => {
                      setFilters((prev) => ({
                        ...prev,
                        [field]: item.id, // Save the ID for API calls
                      }));
                      // Trigger the back-propagation for Specific Hazard
                      if (field === "specificHazardId") {
                        handleSpecificHazardSelection(item.id.toString());
                      }
                      setDisplayValues((prev) => ({
                        ...prev,
                        [field]: item.name, // Display the name in the input
                      }));
                      toggleDropdown(field, false);
                    }}
                  >
                    {item.name} {/* Only display the name */}
                  </li>
                ))
              ) : (
                <li className="no-results">
                  No matching {placeholder.toLowerCase()} found
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    );
  };




  // Render skeleton/loading state during server-side rendering
  if (!isMounted) {
    return (
      <div className="mg-grid mg-grid__col-6">
        <p>Loading filters...</p>
      </div>
    );
  }

  return (
    <div className="mg-grid mg-grid__col-6">
      {/* Row 1: Sector and Sub Sector */}
      <div className="dts-form-component mg-grid__col--span-3">
        <label htmlFor="sector-select" >Sector *</label>
        <select
          id="sector-select"
          name="sector"// Optional, but improves accessibility
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
          name="sub-sector"
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
        {renderAutocomplete(hazardClusters, "hazardClusterId", isFetchingClusters, "Hazard Cluster")}
      </div>

      <div className="dts-form-component mg-grid__col--span-2">
        {renderAutocomplete(specificHazards, "specificHazardId", false, "Specific Hazard")}
      </div>

      {/* Row 3: Geographic Level, From, and To */}
      <div className="dts-form-component mg-grid__col--span-2">
        {renderAutocomplete(geographicLevels, "geographicLevelId", false, "Geographic Level")}
      </div>

      <div className="dts-form-component mg-grid__col--span-2">
        <label htmlFor="from-date">From</label>
        <input
          id="from-date"
          type="date"
          className="filter-date"
          value={filters.fromDate}
          onChange={(e) => handleFilterChange("fromDate", e.target.value)}
        />
      </div>

      <div className="dts-form-component mg-grid__col--span-2">
        <label htmlFor="to-date">To</label>
        <input
          id="to-date"
          type="date"
          className="filter-date"
          value={filters.toDate}
          onChange={(e) => handleFilterChange("toDate", e.target.value)}
        />
      </div>

      {/* Row 4: Disaster Event and Action Buttons */}
      <div className="dts-form-component mg-grid__col--span-4">
        <label htmlFor="event-search" >Disaster Event</label>
        <div style={{ position: "relative" }}>
          <AiOutlineSearch className="search-icon" />
          <input
            id="event-search"
            aria-label="Search for disaster events"
            type="text"
            className="filter-search"
            placeholder="All disaster events"
            value={filters.disasterEventId || ""} // Ensure consistent initial value
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
      </div>
    </div>
  );
};

export default Filters;
