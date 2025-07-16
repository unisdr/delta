import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { AiOutlineSearch } from "react-icons/ai";








// Define initial filters for type safety
const initialFilters = {
  sectorId: "",
  subSectorId: "",
  hazardTypeId: "",
  hazardClusterId: "",
  specificHazardId: "",
  geographicLevelId: "",
  fromDate: "",
  toDate: "",
  disasterEventId: "",
  _disasterEventId: "", // Internal field for search
};

// Interfaces for filter data
interface Sector {
  id: string;
  sectorname: string;
  parentId: string | null;
  description: string | null;
  subsectors?: Sector[];
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
  // Props to receive data from loader instead of fetching via API
  sectorsData?: any;
  geographicLevelsData?: any;
  disasterEventsData?: any;
}

const Filters: React.FC<FiltersProps> = ({
  onApplyFilters,
  onClearFilters,
  sectorsData,
  geographicLevelsData,
  disasterEventsData,
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

  // Fetch data from the REST API
  // Interface for disaster events data structure
  // Note: Using the DisasterEvent interface directly instead of a response wrapper

  // Use sectorsData from props instead of fetching via API
  // Track loading state for sectors
  const [sectorsLoading, setSectorsLoading] = useState(true);

  // Effect to update loading state when sectorsData changes
  useEffect(() => {
    setSectorsLoading(sectorsData === undefined || sectorsData === null);
  }, [sectorsData]);

  // Handle error case if sectorsData is missing
  useEffect(() => {
    if (!sectorsLoading && !sectorsData) {
      Swal.fire({
        icon: 'error',
        title: 'Error Loading Sectors',
        text: 'Failed to load sector data. Please try again later.',
        confirmButtonText: 'OK',
        buttonsStyling: false,
        customClass: {
          popup: 'swal2-custom-popup',
          confirmButton: 'swal2-custom-button',
        },
      });
    }
  }, [sectorsData, sectorsLoading]);

  // Use disasterEventsData from props instead of API call
  // Track loading state for disaster events
  const [disasterEvents, setDisasterEvents] = useState<DisasterEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  // Initialize disaster events from props passed by the loader
  useEffect(() => {
    // Get disaster events data from the route loader via props
    const initializeDisasterEvents = () => {
      try {
        // Simulate API call timing for smooth transition
        setEventsLoading(true);

        // Use disaster events from the route's loader data
        // Handle different possible data structures
        if (disasterEventsData) {
          if (Array.isArray(disasterEventsData)) {
            // If it's directly an array
            setDisasterEvents(disasterEventsData);
          } else if (disasterEventsData.rows && Array.isArray(disasterEventsData.rows)) {
            // If it has a rows property that is an array
            setDisasterEvents(disasterEventsData.rows);
          } else if (disasterEventsData.disasterEvents) {
            // If it has a disasterEvents property
            if (Array.isArray(disasterEventsData.disasterEvents)) {
              setDisasterEvents(disasterEventsData.disasterEvents);
            } else if (disasterEventsData.disasterEvents.rows && Array.isArray(disasterEventsData.disasterEvents.rows)) {
              setDisasterEvents(disasterEventsData.disasterEvents.rows);
            } else {
              console.warn('Disaster events data structure not recognized:', disasterEventsData);
              setDisasterEvents([]);
            }
          } else {
            console.warn('Disaster events data structure not recognized:', disasterEventsData);
            setDisasterEvents([]);
          }
        } else {
          // Handle case where data is not provided
          console.warn('No disaster events data provided');
          setDisasterEvents([]);
        }
        setEventsLoading(false);
      } catch (error) {
        console.error('Error initializing disaster events:', error);
        setEventsLoading(false);

        // Show user-friendly error message
        Swal.fire({
          icon: 'error',
          title: 'Error Loading Events',
          text: 'Failed to load disaster events. Please try again later.',
          confirmButtonText: 'OK',
          buttonsStyling: false,
          customClass: {
            popup: 'swal2-custom-popup',
            confirmButton: 'swal2-custom-button',
          },
        });
      }
    };

    initializeDisasterEvents();
  }, [disasterEventsData]);

  // Define response interfaces for type safety
  interface HazardTypesResponse {
    hazardTypes: Array<{ id: string; name: string }>;
  }

  interface HazardClustersResponse {
    clusters: Array<{ id: string; name: string }>;
  }

  interface SpecificHazardsResponse {
    hazards: Array<{ id: string; name: string }>;
  }

  // React Query for fetching hazard types with enhanced logging and type safety
  const { data: hazardTypesData } = useQuery<HazardTypesResponse, Error>({
    queryKey: ["hazardTypes", filters.hazardTypeId],
    queryFn: async () => {




      try {
        const response = await fetch(`/api/analytics/hazard-types`);
        if (!response.ok) {
          const error = new Error(`HTTP error! status: ${response.status}`);

          throw error;
        }

        const responseData = await response.json();


        // Transform data to ensure Hazard interface compatibility (id as string)
        const transformedData: HazardTypesResponse = {
          hazardTypes: Array.isArray(responseData.hazardTypes)
            ? responseData.hazardTypes.map((hazard: any) => ({
              ...hazard,
              id: String(hazard.id) // Ensure ID is string to match Hazard interface
            }))
            : []
        };



        return transformedData;
      } catch (error) {




        // Show user-friendly error message
        Swal.fire({
          icon: 'error',
          title: 'Error Loading Hazard Types',
          text: 'Failed to load hazard types. Please try again later.',
          confirmButtonText: 'OK',
          buttonsStyling: false,
          customClass: {
            popup: 'swal2-custom-popup',
            confirmButton: 'swal2-custom-button',
          },
        });

        throw error;
      }
    }
  });

  // React Query for fetching hazard clusters with enhanced logging
  const { data: hazardClustersData, isFetching: isFetchingClusters } = useQuery<HazardClustersResponse, Error>({
    queryKey: ["hazardClusters", filters.hazardTypeId],
    queryFn: async () => {
      if (!filters.hazardTypeId) {
        return { clusters: [] };
      }




      try {
        const response = await fetch(`/api/analytics/hazard-clusters?typeId=${filters.hazardTypeId}`);
        if (!response.ok) {
          const error = new Error(`HTTP error! status: ${response.status}`);

          throw error;
        }

        const data: HazardClustersResponse = await response.json();





        // Transform data to match Hazard interface (id must be string)
        const transformedClusters = {
          clusters: data.clusters?.map(cluster => ({
            ...cluster,
            id: String(cluster.id) // Ensure ID is string to match Hazard interface
          })) || []
        };

        return transformedClusters;
      } catch (error) {




        // Show user-friendly error message
        Swal.fire({
          icon: 'error',
          title: 'Error Loading Hazard Clusters',
          text: 'Failed to load hazard clusters. Please try again later.',
          confirmButtonText: 'OK',
          buttonsStyling: false,
          customClass: {
            popup: 'swal2-custom-popup',
            confirmButton: 'swal2-custom-button',
          },
        });

        throw error;
      }
    },
    enabled: !!filters.hazardTypeId,
  });

  // React Query for fetching specific hazards with enhanced logging
  const [searchQuery, setSearchQuery] = useState("");
  const { data: specificHazardsData } = useQuery<SpecificHazardsResponse, Error>({
    queryKey: ["specificHazards", filters.hazardClusterId, searchQuery],
    queryFn: async () => {
      if (!filters.hazardClusterId) {
        return { hazards: [] };
      }




      try {
        const response = await fetch(
          `/api/analytics/specific-hazards?clusterId=${filters.hazardClusterId}&searchQuery=${searchQuery}`
        );

        if (!response.ok) {
          const error = new Error(`HTTP error! status: ${response.status}`);

          throw error;
        }

        const responseData = await response.json();


        // Transform data to ensure Hazard interface compatibility (id as string)
        const transformedData: SpecificHazardsResponse = {
          hazards: Array.isArray(responseData.hazards)
            ? responseData.hazards.map((hazard: any) => ({
              ...hazard,
              id: String(hazard.id) // Ensure ID is string to match Hazard interface
            }))
            : []
        };



        return transformedData;
      } catch (error) {

        throw error;
      }
    },
    enabled: !!filters.hazardClusterId,
  });

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
        hazardClusterId: hazardClusterId?.toString() || "",
        hazardTypeId: hazardTypeId?.toString() || "",
      }));
    } catch (error) {
      console.error("Error fetching related hazard data:", error);
    }
  };



  // State to hold processed sectors
  const [processedSectors, setSectors] = useState<Sector[]>([]);

  // Process sectorsData to extract sectors regardless of structure
  useEffect(() => {
    if (sectorsData) {
      try {
        // If sectorsData is already an array, use it directly
        if (Array.isArray(sectorsData)) {
          setSectors(sectorsData as unknown as Sector[]);
        }
        // If sectorsData has a sectors property that is an array, use that
        else if (sectorsData.sectors && Array.isArray(sectorsData.sectors)) {
          setSectors(sectorsData.sectors as unknown as Sector[]);
        }
      } catch (error) {
        console.error('Error processing sectors data:', error);
      }
    }
  }, [sectorsData]);
  const hazardTypes: Hazard[] = hazardTypesData?.hazardTypes || [];
  const hazardClusters: Hazard[] = hazardClustersData?.clusters || [];
  const specificHazards: Hazard[] = specificHazardsData?.hazards || [];
  const geographicLevels: Hazard[] =
    geographicLevelsData?.levels.map((level: { id: number; name: { en: string } }) => ({
      id: String(level.id), // Convert number ID to string to match Hazard interface
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

  // Use the disasterEvents state that was set in the useEffect

  // Filter events based on search input with enhanced logging
  const filteredEvents = React.useMemo(() => {
    if (!filters.disasterEventId || !disasterEvents) return [];

    const searchTerm = filters.disasterEventId.toLowerCase();
    const startTime = performance.now();

    const results = disasterEvents.filter(event => {
      return (
        (event.name || '').toLowerCase().includes(searchTerm) ||
        (event.id || '').toLowerCase().includes(searchTerm) ||
        (event.glide || '').toLowerCase().includes(searchTerm) ||
        (event.national_disaster_id || '').toLowerCase().includes(searchTerm) ||
        (event.other_id1 || '').toLowerCase().includes(searchTerm)
      );
    });

    const endTime = performance.now();

    // Log the search operation if it took significant time
    if (endTime - startTime > 50) { // Only log if search took more than 50ms

    }

    return results;
  }, [filters.disasterEventId, disasterEvents]);


  // Handle filter changes with enhanced logging
  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    const operationId = `filter-change-${field}-${Date.now()}`;


    setFilters((prev) => {
      const updatedFilters = { ...prev, [field]: value };
      const logPayload: Record<string, any> = {
        operationId,
        field,
        value,
        previousValue: prev[field],
        updatedFields: [field]
      };

      // Validate date ranges
      if (field === "fromDate" && prev.toDate && value > prev.toDate) {
        // If fromDate is later than toDate, clear toDate
        updatedFilters.toDate = "";
        logPayload.updatedFields.push('toDate');

        // Log the validation warning



        // Show warning to user
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
        updatedFilters.subSectorId = ""; // Reset sub-sector
        logPayload.updatedFields.push('subSectorId');
        logPayload.reason = 'sectorId changed';
      }

      // Reset dependent fields for hazard filtering
      if (field === "hazardTypeId") {
        updatedFilters.hazardClusterId = "";
        updatedFilters.specificHazardId = "";
        logPayload.updatedFields.push('hazardClusterId', 'specificHazardId');
        logPayload.reason = 'hazardTypeId changed';

        setDisplayValues((prev) => ({
          ...prev,
          hazardClusterId: "",
          specificHazardId: "",
        }));
      } else if (field === "hazardClusterId") {
        updatedFilters.specificHazardId = "";
        logPayload.updatedFields.push('specificHazardId');
        logPayload.reason = 'hazardClusterId changed';

        setDisplayValues((prev) => ({
          ...prev,
          specificHazardId: "",
        }));
      }

      // Log the filter update


      // Trigger back-propagation when specificHazardId is updated
      if (field === "specificHazardId") {
        handleSpecificHazardSelection(value);
      }

      // Immediately apply filters when geographic level changes
      if (field === "geographicLevelId") {

        onApplyFilters(updatedFilters);
      }




      return updatedFilters;
    });
  };


  const toggleDropdown = (field: keyof typeof filters, visible: boolean) => {
    setDropdownVisibility((prev) => ({ ...prev, [field]: visible }));
  };

  // Apply filters with enhanced logging and validation
  const handleApplyFilters = () => {




    // Validate sector is selected
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

    // Log the filter application
    const appliedFilters = {
      sectorId: filters.sectorId || null,
      subSectorId: filters.subSectorId || null,
      hazardTypeId: filters.hazardTypeId || null,
      hazardClusterId: filters.hazardClusterId || null,
      specificHazardId: filters.specificHazardId || null,
      geographicLevelId: filters.geographicLevelId || null,
      fromDate: filters.fromDate || null,
      toDate: filters.toDate || null,
      disasterEventId: filters._disasterEventId || null,
    };



    // Apply the filters
    onApplyFilters(appliedFilters);
  };


  // Clear all filters with enhanced logging
  const handleClearFilters = () => {


    // Reset all filters to initial state
    setFilters(initialFilters);

    // Reset display values
    const resetDisplayValues = {
      hazardTypeId: "",
      hazardClusterId: "",
      specificHazardId: "",
      geographicLevelId: "",
    };
    setDisplayValues(resetDisplayValues);

    // Log the completion of the clear operation


    // Call parent clear handler
    onClearFilters();
  };

  const [displayValues, setDisplayValues] = useState<{
    [key: string]: string;
  }>({
    hazardTypeId: "",
    hazardClusterId: "",
    specificHazardId: "",
    geographicLevelId: "",
  });

  const [showResults, setShowResults] = useState(true);

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
      <>
        <label htmlFor={`${field}-input`}>{placeholder}</label>
        <span>{placeholder}</span>
        <div style={{ position: "relative" }}>
          <input
            id={`${field}-input`}
            type="text"
            className="filter-search"
            placeholder={`Type to search by ${placeholder.toLowerCase()}...`}
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
            handleFilterChange("subSectorId", ""); // Reset subsector when sector changes
          }}
        >
          <option value="" disabled>
            {sectorsLoading ? "Loading sectors..." : "Select Sector"}
          </option>
          {processedSectors.length === 0 ? (
            <option disabled>No sectors found in database</option>
          ) : (
            [...processedSectors]
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
            const selectedSector = processedSectors.find((s: Sector) => s.id.toString() === filters.sectorId);
            const subsectors = selectedSector?.subsectors || [];

            if (subsectors.length === 0 && filters.sectorId) {
              return <option disabled>No subsectors found</option>;
            }

            return subsectors
              .sort((a: Sector, b: Sector) => a.sectorname.localeCompare(b.sectorname))
              .map((subsector: Sector) => (
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

        <label>
          <div className="dts-form-component__label">
            <span>Geographic Level</span>
          </div>
          {renderAutocomplete(geographicLevels, "geographicLevelId", false, "Geographic Level")}
        </label>

      </div>

      <div className="dts-form-component mg-grid__col--span-2">

        <label>
          <div className="dts-form-component__label">
            <span>From</span>
          </div>
          <input
            type="date"
            id="from-date"
            value={filters.fromDate || ""}
            onChange={(e) => handleFilterChange("fromDate", e.target.value)}
          />
        </label>

      </div>

      <div className="dts-form-component mg-grid__col--span-2">

        <label>
          <div className="dts-form-component__label">
            <span>To</span>
          </div>
          <input
            type="date"
            id="to-date"
            value={filters.toDate || ""}
            min={filters.fromDate || undefined}
            onChange={(e) => handleFilterChange("toDate", e.target.value)}
          />
        </label>

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
            placeholder="Type to search by name, ID, GLIDE number..."
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
                          const input = document.getElementById('event-search') as HTMLInputElement;
                          if (input) {
                            input.value = event.name;
                          }
                          setFilters((prev) => ({
                            ...prev,
                            disasterEventId: event.name,
                            _disasterEventId: event.id, // Store UUID separately
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
