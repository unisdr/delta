import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { AiOutlineSearch } from "react-icons/ai";

// Interfaces for filter data
interface Sector {
  id: number;
  sectorname: string;
  parentId: number | null;
  description: string | null;
  subsectors: Sector[];
}

interface DisasterEvent {
  id: string;
  name: string;
  glide: string;
  national_disaster_id: string;
  other_id1: string;
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
  onClearFilters,
}) => {
  const [searchTimeout, setSearchTimeout] = useState<number | null>(null);

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
    _disasterEventId: "", // Store UUID separately
  });

  const [dropdownVisibility, setDropdownVisibility] = useState<{
    [key: string]: boolean;
  }>({
    hazardTypeId: false,
    hazardClusterId: false,
    specificHazardId: false,
    geographicLevelId: false,
  });

  const [displayValues, setDisplayValues] = useState<{
    [key: string]: string;
  }>({
    hazardTypeId: "",
    hazardClusterId: "",
    specificHazardId: "",
    geographicLevelId: "",
  });

  const [showResults, setShowResults] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch data from the REST API
  const { data: sectorsData, isLoading: sectorsLoading } = useQuery({
    queryKey: ["sectors"],
    queryFn: async () => {
      const response = await fetch("/api/analytics/sectors");
      if (!response.ok) throw new Error("Failed to fetch sectors");
      return response.json();
    }
  });

  const { data: disasterEventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ["disasterEvents"],
    queryFn: async () => {
      const response = await fetch("/api/analytics/disaster-events");
      if (!response.ok) throw new Error("Failed to fetch disaster events");
      return response.json();
    }
  });

  const { data: hazardTypesData } = useQuery({
    queryKey: ["hazardTypes"],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/hazard-types`);
      if (!response.ok) throw new Error("Failed to fetch hazard types");
      return response.json();
    },
  });

  // Fix: Use hazardTypeId as dependency, not hazardClusterId
  const { data: hazardClustersData, isFetching: isFetchingClusters } = useQuery({
    queryKey: ["hazardClusters", filters.hazardTypeId],
    queryFn: async () => {
      if (!filters.hazardTypeId) {
        return { clusters: [] };
      }
      const response = await fetch(`/api/analytics/hazard-clusters?typeId=${filters.hazardTypeId}`);
      if (!response.ok) throw new Error("Failed to fetch hazard clusters");
      return response.json();
    },
    enabled: !!filters.hazardTypeId,
  });

  const { data: specificHazardsData } = useQuery({
    queryKey: ["specificHazards", filters.hazardClusterId, searchQuery],
    queryFn: async () => {
      if (!filters.hazardClusterId) {
        return { hazards: [] };
      }
      const response = await fetch(
        `/api/analytics/specific-hazards?clusterId=${filters.hazardClusterId}&searchQuery=${searchQuery}`
      );
      if (!response.ok) throw new Error("Failed to fetch specific hazards");
      return response.json();
    },
    enabled: !!filters.hazardClusterId,
  });

  const { data: geographicLevelsData } = useQuery({
    queryKey: ["geographicLevels"],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/geographic-levels`);
      if (!response.ok) throw new Error("Failed to fetch geographic levels");
      return response.json();
    }
  });

  // Function to handle specific hazard selection
  const handleSpecificHazardSelection = async (specificHazardId: string) => {
    try {
      const response = await fetch(`/api/analytics/related-hazard-data?specificHazardId=${specificHazardId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch related hazard data");
      }

      const { hazardClusterId, hazardTypeId } = await response.json();

      setFilters((prev) => ({
        ...prev,
        hazardClusterId: hazardClusterId?.toString() || "",
        hazardTypeId: hazardTypeId?.toString() || "",
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
    geographicLevelsData?.levels?.map((level: { id: number; name: { en: string } }) => ({
      id: String(level.id), // Convert to string to match Hazard interface
      name: level.name.en,
    })) || [];

  // Auto-select hazard cluster when there's only one option available
  useEffect(() => {
    if (filters.hazardTypeId && hazardClusters.length === 1) {
      const cluster = hazardClusters[0];
      setFilters(prev => ({
        ...prev,
        hazardClusterId: cluster.id?.toString() || ""
      }));
      setDisplayValues(prev => ({
        ...prev,
        hazardClusterId: cluster.name
      }));
    }
  }, [hazardClusters, filters.hazardTypeId]);

  // Auto-select specific hazard when there's only one option available
  useEffect(() => {
    if (filters.hazardClusterId && specificHazards.length === 1) {
      const hazard = specificHazards[0];
      setFilters(prev => ({
        ...prev,
        specificHazardId: hazard.id?.toString() || ""
      }));
      setDisplayValues(prev => ({
        ...prev,
        specificHazardId: hazard.name
      }));
    }
  }, [specificHazards, filters.hazardClusterId]);

  const disasterEvents: DisasterEvent[] = disasterEventsData?.disasterEvents?.rows || [];

  // Filter events based on search input
  const filteredEvents = filters.disasterEventId
    ? disasterEvents.filter(event =>
      event.name?.toLowerCase().includes(filters.disasterEventId.toLowerCase()) ||
      event.id?.toLowerCase().includes(filters.disasterEventId.toLowerCase()) ||
      (event.glide || "").toLowerCase().includes(filters.disasterEventId.toLowerCase()) ||
      (event.national_disaster_id || "").toLowerCase().includes(filters.disasterEventId.toLowerCase()) ||
      (event.other_id1 || "").toLowerCase().includes(filters.disasterEventId.toLowerCase())
    )
    : [];

  // Handle filter changes
  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    setFilters((prev) => {
      const updatedFilters = { ...prev, [field]: value };

      // Validate date ranges
      if (field === "fromDate" && prev.toDate && value > prev.toDate) {
        updatedFilters.toDate = "";
        Swal.fire({
          icon: 'warning',
          text: 'From date is later than To date. The To date has been cleared.',
          confirmButtonText: 'OK',
          buttonsStyling: false,
          customClass: {
            popup: 'swal2-custom-popup',
            confirmButton: 'swal2-custom-button',
          },
        });
      }

      // Reset dependent fields for sectors
      if (field === "sectorId") {
        updatedFilters.subSectorId = "";
      }

      // Reset dependent fields for hazard filtering
      if (field === "hazardTypeId") {
        updatedFilters.hazardClusterId = "";
        updatedFilters.specificHazardId = "";
        setDisplayValues((prev) => ({
          ...prev,
          hazardClusterId: "",
          specificHazardId: "",
        }));
      } else if (field === "hazardClusterId") {
        updatedFilters.specificHazardId = "";
        setDisplayValues((prev) => ({
          ...prev,
          specificHazardId: "",
        }));
      }

      // Trigger back-propagation when specificHazardId is updated
      if (field === "specificHazardId") {
        handleSpecificHazardSelection(value);
      }

      // Immediately apply filters when geographic level changes
      if (field === "geographicLevelId") {
        onApplyFilters({
          sectorId: updatedFilters.sectorId || null,
          subSectorId: updatedFilters.subSectorId || null,
          hazardTypeId: updatedFilters.hazardTypeId || null,
          hazardClusterId: updatedFilters.hazardClusterId || null,
          specificHazardId: updatedFilters.specificHazardId || null,
          geographicLevelId: updatedFilters.geographicLevelId || null,
          fromDate: updatedFilters.fromDate || null,
          toDate: updatedFilters.toDate || null,
          disasterEventId: updatedFilters._disasterEventId || null,
        });
      }

      return updatedFilters;
    });
  };

  const toggleDropdown = (field: keyof typeof filters, visible: boolean) => {
    setDropdownVisibility((prev) => ({ ...prev, [field]: visible }));
  };

  // Apply filters
  const handleApplyFilters = () => {
    if (!filters.sectorId) {
      Swal.fire({
        icon: 'warning',
        text: 'Please select a sector first.',
        confirmButtonText: 'OK',
        buttonsStyling: false,
        customClass: {
          popup: 'swal2-custom-popup',
          confirmButton: 'swal2-custom-button',
        },
      });
      return;
    }

    // Validate date range
    if (filters.fromDate && filters.toDate && filters.fromDate > filters.toDate) {
      Swal.fire({
        icon: 'warning',
        text: 'From date cannot be later than To date. Please adjust your date selection.',
        confirmButtonText: 'OK',
        buttonsStyling: false,
        customClass: {
          popup: 'swal2-custom-popup',
          confirmButton: 'swal2-custom-button',
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
      disasterEventId: filters._disasterEventId || null,
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
      disasterEventId: "",
      _disasterEventId: "",
    });
    setDisplayValues({
      hazardTypeId: "",
      hazardClusterId: "",
      specificHazardId: "",
      geographicLevelId: "",
    });
    onClearFilters();
  };

  // Render autocomplete list
  const renderAutocomplete = (
    items: Array<{ id: string | number; name: string }>,
    field: keyof typeof filters,
    loading: boolean,
    placeholder: string
  ) => {
    const filteredItems = items.filter(
      (item) =>
        item.name.toLowerCase().includes(displayValues[field]?.toLowerCase() || "") ||
        item.id.toString().toLowerCase().includes(displayValues[field]?.toLowerCase() || "")
    );

    return (
      <>
        <label htmlFor={`${field}-input`}>{placeholder}</label>
        <div style={{ position: "relative" }}>
          <input
            id={`${field}-input`}
            type="text"
            className="filter-search"
            placeholder={`Search ${placeholder.toLowerCase()}...`}
            value={displayValues[field] || ""}
            onChange={(e) => {
              setDisplayValues((prev) => ({
                ...prev,
                [field]: e.target.value,
              }));

              if (searchTimeout) {
                clearTimeout(searchTimeout);
              }

              const newTimeout = window.setTimeout(() => {
                setSearchQuery(e.target.value);
              }, 300);

              setSearchTimeout(newTimeout);
              toggleDropdown(field, true);
            }}
            onFocus={() => toggleDropdown(field, true)}
            onBlur={() => setTimeout(() => toggleDropdown(field, false), 200)}
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
                        [field]: item.id.toString(),
                      }));
                      if (field === "specificHazardId") {
                        handleSpecificHazardSelection(item.id.toString());
                      }
                      setDisplayValues((prev) => ({
                        ...prev,
                        [field]: item.name,
                      }));
                      toggleDropdown(field, false);
                    }}
                  >
                    {item.name}
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
      </>
    );
  };

  return (
    <div className="mg-grid mg-grid__col-6">
      {/* Row 1: Sector and Sub Sector */}
      <div className="dts-form-component mg-grid__col--span-3">
        <label htmlFor="sector-select">Sector *</label>
        <select
          id="sector-select"
          name="sector"
          className="filter-select"
          value={filters.sectorId || ""}
          required
          onChange={(e) => {
            handleFilterChange("sectorId", e.target.value);
            handleFilterChange("subSectorId", "");
          }}
        >
          <option value="" disabled>
            {sectorsLoading ? "Loading sectors..." : "Select Sector"}
          </option>
          {sectors.length === 0 ? (
            <option disabled>No sectors found in database</option>
          ) : (
            [...sectors]
              .sort((a, b) => a.sectorname.localeCompare(b.sectorname))
              .map((sector) => (
                <option key={sector.id} value={sector.id}>
                  {sector.sectorname}
                </option>
              ))
          )}
        </select>
      </div>

      <div className="dts-form-component mg-grid__col--span-3">
        <label htmlFor="sub-sector-select">Sub Sector</label>
        <select
          id="sub-sector-select"
          name="sub-sector"
          className="filter-select"
          value={filters.subSectorId || ""}
          onChange={(e) => handleFilterChange("subSectorId", e.target.value)}
          disabled={!filters.sectorId}
        >
          <option value="" disabled>
            {filters.sectorId ? "Select Sub Sector" : "Select Sector First"}
          </option>
          {(() => {
            const selectedSector = sectors.find(s => s.id.toString() === filters.sectorId);
            const subsectors = selectedSector?.subsectors || [];

            if (subsectors.length === 0 && filters.sectorId) {
              return <option disabled>No subsectors found</option>;
            }

            return subsectors
              .sort((a, b) => a.sectorname.localeCompare(b.sectorname))
              .map((subsector) => (
                <option key={subsector.id} value={subsector.id}>
                  {subsector.sectorname}
                </option>
              ));
          })()}
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
          min={filters.fromDate || undefined}
          onChange={(e) => handleFilterChange("toDate", e.target.value)}
        />
      </div>

      {/* Row 4: Disaster Event and Action Buttons */}
      <div className="dts-form-component mg-grid__col--span-4">
        <label htmlFor="event-search">Disaster Event</label>
        <div style={{ position: "relative" }}>
          <AiOutlineSearch className="search-icon" />
          <input
            id="event-search"
            aria-label="Search for disaster events"
            type="text"
            className="filter-search"
            placeholder="Search by name, ID, GLIDE number..."
            value={filters.disasterEventId || ""}
            onChange={(e) => {
              handleFilterChange("disasterEventId", e.target.value);
              setShowResults(true);
            }}
          />
          {eventsLoading ? (
            <div style={{ marginTop: "0.5rem", color: "#004f91" }}>Loading...</div>
          ) : (
            filters.disasterEventId && showResults && (
              <ul className="autocomplete-list">
                {filteredEvents.length > 0 ? (
                  filteredEvents
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((event) => (
                      <li
                        key={event.id}
                        onClick={() => {
                          setFilters((prev) => ({
                            ...prev,
                            disasterEventId: event.name,
                            _disasterEventId: event.id,
                          }));
                          setShowResults(false);
                        }}
                      >
                        <div>{event.name}</div>
                        <small style={{ display: 'block', color: '#666' }}>
                          GLIDE: {event.glide} | ID: {event.national_disaster_id} | {event.other_id1}
                        </small>
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
          gridColumn: "1 / -1",
          display: "flex",
          justifyContent: "flex-end",
          gap: "1rem",
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