import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { AiOutlineSearch } from "react-icons/ai";
import createClientLogger from "~/utils/clientLogger";

// Initialize component loggers with appropriate context
const logger = createClientLogger('Filters', {
  feature: 'analytics',
  section: 'sectors',
  componentType: 'filter-controls'
});

// Create specialized loggers for different categories
const userLogger = logger.withTags({
  category: 'user-interaction',
  operation: 'filter-selection',
  businessCritical: true
});

const apiLogger = logger.withTags({
  category: 'api-call',
  operation: 'data-fetch',
  businessCritical: false
});

const validationLogger = logger.withTags({
  category: 'form-validation',
  operation: 'user-input-validation'
});

const performanceLogger = logger.withTags({
  category: 'performance',
  operation: 'filter-processing'
});

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
    _disasterEventId: "", // Store UUID separately
  });

  // Component lifecycle logging
  useEffect(() => {
    logger.info('Filters component mounted', {
      componentState: 'mounted',
      initialFilters: Object.keys(filters).filter(key => filters[key as keyof typeof filters] !== '').length
    });

    setIsMounted(true);

    return () => {
      logger.debug('Filters component unmounting', {
        finalFiltersState: filters,
        totalInteractions: Object.keys(filters).length
      });
    };
  }, []);

  const [dropdownVisibility, setDropdownVisibility] = useState<{
    [key: string]: boolean;
  }>({
    hazardTypeId: false,
    hazardClusterId: false,
    specificHazardId: false,
    geographicLevelId: false,
  });

  // Fetch data from the REST API
  // Define response interfaces for sectors and disaster events
  interface SectorsResponse {
    sectors: Sector[];
  }

  interface DisasterEventsResponse {
    disasterEvents: {
      rows: DisasterEvent[];
    };
  }

  // React Query for fetching sectors with enhanced logging
  const { data: sectorsData, isLoading: sectorsLoading } = useQuery<SectorsResponse, Error>({
    queryKey: ["sectors"],
    queryFn: async () => {
      const startTime = performance.now();
      const operationId = `sectors-fetch-${Date.now()}`;

      apiLogger.info('Fetching sectors data', { operationId });

      try {
        const response = await fetch("/api/analytics/sectors");
        if (!response.ok) {
          const error = new Error(`HTTP error! status: ${response.status}`);
          apiLogger.error('Sectors API request failed', {
            operationId,
            status: response.status,
            statusText: response.statusText,
            error: error.message
          });
          throw error;
        }

        const data = await response.json();
        const endTime = performance.now();
        const loadTime = endTime - startTime;

        apiLogger.info('Sectors data loaded successfully', {
          operationId,
          sectorsCount: data.sectors?.length || 0,
          loadTimeMs: loadTime,
          isSlowLoad: loadTime > 1000
        });

        return data;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorType = error instanceof Error ? error.constructor.name : 'Unknown';

        apiLogger.error('Failed to fetch sectors', {
          operationId,
          error: errorMessage,
          errorType,
          durationMs: performance.now() - startTime
        });

        // Show user-friendly error message
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

        throw error;
      }
    }
  });

  // React Query for fetching disaster events with enhanced logging
  const { data: disasterEventsData, isLoading: eventsLoading } = useQuery<DisasterEventsResponse, Error>({
    queryKey: ["disasterEvents"],
    queryFn: async () => {
      const startTime = performance.now();
      const operationId = `disaster-events-fetch-${Date.now()}`;

      apiLogger.info('Fetching disaster events data', { operationId });

      try {
        const response = await fetch("/api/analytics/disaster-events");
        if (!response.ok) {
          const error = new Error(`HTTP error! status: ${response.status}`);
          apiLogger.error('Disaster events API request failed', {
            operationId,
            status: response.status,
            statusText: response.statusText
          });
          throw error;
        }

        const data = await response.json();
        const endTime = performance.now();
        const loadTime = endTime - startTime;

        apiLogger.info('Disaster events data loaded', {
          operationId,
          eventsCount: data.disasterEvents?.rows?.length || 0,
          loadTimeMs: loadTime,
          isSlowLoad: loadTime > 1000
        });

        return data;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorType = error instanceof Error ? error.constructor.name : 'Unknown';

        apiLogger.error('Failed to fetch disaster events', {
          operationId,
          error: errorMessage,
          errorType,
          durationMs: performance.now() - startTime
        });

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

        throw error;
      }
    }
  });

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

  interface GeographicLevelsResponse {
    levels: Array<{ id: number; name: { en: string } }>;
  }

  // React Query for fetching hazard types with enhanced logging and type safety
  const { data: hazardTypesData } = useQuery<HazardTypesResponse, Error>({
    queryKey: ["hazardTypes", filters.hazardTypeId],
    queryFn: async () => {
      const startTime = performance.now();
      const operationId = `hazard-types-fetch-${Date.now()}`;

      apiLogger.info('Fetching hazard types', { operationId });

      try {
        const response = await fetch(`/api/analytics/hazard-types`);
        if (!response.ok) {
          const error = new Error(`HTTP error! status: ${response.status}`);
          apiLogger.error('Hazard types API request failed', {
            operationId,
            status: response.status,
            statusText: response.statusText
          });
          throw error;
        }

        const responseData = await response.json();
        const endTime = performance.now();
        const loadTime = endTime - startTime;

        // Transform data to ensure Hazard interface compatibility (id as string)
        const transformedData: HazardTypesResponse = {
          hazardTypes: Array.isArray(responseData.hazardTypes)
            ? responseData.hazardTypes.map((hazard: any) => ({
              ...hazard,
              id: String(hazard.id) // Ensure ID is string to match Hazard interface
            }))
            : []
        };

        apiLogger.info('Hazard types loaded', {
          operationId,
          count: transformedData.hazardTypes.length,
          loadTimeMs: loadTime,
          isSlowLoad: loadTime > 1000
        });

        return transformedData;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorType = error instanceof Error ? error.constructor.name : 'Unknown';

        apiLogger.error('Failed to fetch hazard types', {
          operationId,
          error: errorMessage,
          errorType,
          durationMs: performance.now() - startTime
        });

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

      const startTime = performance.now();
      const operationId = `hazard-clusters-fetch-${Date.now()}`;

      apiLogger.info('Fetching hazard clusters', {
        operationId,
        hazardTypeId: filters.hazardTypeId
      });

      try {
        const response = await fetch(`/api/analytics/hazard-clusters?typeId=${filters.hazardTypeId}`);
        if (!response.ok) {
          const error = new Error(`HTTP error! status: ${response.status}`);
          apiLogger.error('Hazard clusters API request failed', {
            operationId,
            status: response.status,
            statusText: response.statusText,
            hazardTypeId: filters.hazardTypeId
          });
          throw error;
        }

        const data: HazardClustersResponse = await response.json();
        const endTime = performance.now();
        const loadTime = endTime - startTime;

        apiLogger.info('Hazard clusters loaded', {
          operationId,
          count: data.clusters?.length || 0,
          loadTimeMs: loadTime,
          isSlowLoad: loadTime > 1000,
          hazardTypeId: filters.hazardTypeId
        });

        // Transform data to match Hazard interface (id must be string)
        const transformedClusters = {
          clusters: data.clusters?.map(cluster => ({
            ...cluster,
            id: String(cluster.id) // Ensure ID is string to match Hazard interface
          })) || []
        };

        return transformedClusters;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorType = error instanceof Error ? error.constructor.name : 'Unknown';

        apiLogger.error('Failed to fetch hazard clusters', {
          operationId,
          error: errorMessage,
          errorType,
          hazardTypeId: filters.hazardTypeId,
          durationMs: performance.now() - startTime
        });

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

      const startTime = performance.now();
      const operationId = `specific-hazards-fetch-${Date.now()}`;

      apiLogger.info('Fetching specific hazards', {
        operationId,
        hazardClusterId: filters.hazardClusterId,
        searchQuery: searchQuery || '(none)'
      });

      try {
        const response = await fetch(
          `/api/analytics/specific-hazards?clusterId=${filters.hazardClusterId}&searchQuery=${searchQuery}`
        );

        if (!response.ok) {
          const error = new Error(`HTTP error! status: ${response.status}`);
          apiLogger.error('Specific hazards API request failed', {
            operationId,
            status: response.status,
            statusText: response.statusText,
            hazardClusterId: filters.hazardClusterId,
            searchQuery: searchQuery || '(none)'
          });
          throw error;
        }

        const responseData = await response.json();
        const endTime = performance.now();
        const loadTime = endTime - startTime;

        // Transform data to ensure Hazard interface compatibility (id as string)
        const transformedData: SpecificHazardsResponse = {
          hazards: Array.isArray(responseData.hazards)
            ? responseData.hazards.map((hazard: any) => ({
              ...hazard,
              id: String(hazard.id) // Ensure ID is string to match Hazard interface
            }))
            : []
        };

        apiLogger.info('Specific hazards loaded', {
          operationId,
          count: transformedData.hazards.length,
          loadTimeMs: loadTime,
          isSlowLoad: loadTime > 1000,
          hazardClusterId: filters.hazardClusterId,
          hasSearchQuery: !!searchQuery
        });

        return transformedData;
      } catch (error) {
        apiLogger.error('Failed to fetch specific hazards', {
          error: error instanceof Error ? error.message : String(error),
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          hazardClusterId: filters.hazardClusterId,
          searchQuery: searchQuery || '(none)',
          durationMs: performance.now() - startTime
        });
        throw error;
      }
    },
    enabled: !!filters.hazardClusterId,
  });

  // React Query for fetching geographic levels with enhanced logging
  const { data: geographicLevelsData } = useQuery<GeographicLevelsResponse, Error>({
    queryKey: ["geographicLevels", filters.geographicLevelId],
    queryFn: async () => {
      const startTime = performance.now();
      apiLogger.info('Fetching geographic levels');

      try {
        const response = await fetch(`/api/analytics/geographic-levels`);
        if (!response.ok) {
          const error = new Error(`HTTP error! status: ${response.status}`);
          apiLogger.error('Geographic levels API request failed', {
            status: response.status,
            statusText: response.statusText
          });
          throw error;
        }

        const data = await response.json();
        const endTime = performance.now();

        apiLogger.info('Geographic levels loaded', {
          count: data.levels?.length || 0,
          loadTimeMs: endTime - startTime
        });

        return data;
      } catch (error) {
        apiLogger.error('Failed to fetch geographic levels', {
          error: error instanceof Error ? error.message : String(error),
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          durationMs: performance.now() - startTime
        });
        throw error;
      }
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



  // Extract data from the fetched data
  const sectors: Sector[] = sectorsData?.sectors || [];
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

  const disasterEvents: DisasterEvent[] = disasterEventsData?.disasterEvents?.rows || [];

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
      performanceLogger.debug('Event search completed', {
        searchTerm: searchTerm,
        totalEvents: disasterEvents.length,
        resultsCount: results.length,
        searchTimeMs: endTime - startTime
      });
    }

    return results;
  }, [filters.disasterEventId, disasterEvents]);

  // Debug to ensure correct data mapping
  // console.log("Hazard Types:", hazardTypes);
  // console.log("Hazard Clusters:", hazardClusters);
  // console.log("Specific Hazards:", specificHazards);
  // console.log("Geographic Levels:", geographicLevels);

  // Handle filter changes with enhanced logging
  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    const startTime = performance.now();
    const operationId = `filter-change-${field}-${Date.now()}`;

    userLogger.info('Filter change initiated', {
      operationId,
      field,
      value,
      previousValue: filters[field]
    });

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
        validationLogger.warn('Date validation: fromDate > toDate', {
          operationId,
          fromDate: value,
          toDate: prev.toDate,
          action: 'toDate cleared'
        });

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
      userLogger.debug('Filter state updated', logPayload);

      // Trigger back-propagation when specificHazardId is updated
      if (field === "specificHazardId") {
        handleSpecificHazardSelection(value);
      }

      // Immediately apply filters when geographic level changes
      if (field === "geographicLevelId") {
        userLogger.info('Auto-applying filters due to geographic level change', {
          operationId,
          geographicLevelId: value
        });
        onApplyFilters(updatedFilters);
      }

      const endTime = performance.now();
      performanceLogger.debug('Filter update processed', {
        operationId,
        field,
        processingTimeMs: endTime - startTime,
        updatedFields: logPayload.updatedFields
      });

      return updatedFilters;
    });
  };


  const toggleDropdown = (field: keyof typeof filters, visible: boolean) => {
    setDropdownVisibility((prev) => ({ ...prev, [field]: visible }));
  };

  // Apply filters with enhanced logging and validation
  const handleApplyFilters = () => {
    const operationId = `apply-filters-${Date.now()}`;
    const startTime = performance.now();

    userLogger.info('Applying filters', {
      operationId,
      filters: {
        ...filters,
        // Don't log the entire disaster event ID for privacy
        _disasterEventId: filters._disasterEventId ? '[FILTERED]' : ''
      }
    });

    // Validate sector is selected
    if (!filters.sectorId) {
      const errorMessage = 'Sector is required';
      validationLogger.warn('Validation failed: missing sector', {
        operationId,
        error: errorMessage,
        validation: 'sector-required'
      });

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
      const errorMessage = 'From date cannot be later than To date';
      validationLogger.warn('Validation failed: invalid date range', {
        operationId,
        error: errorMessage,
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        validation: 'date-range'
      });

      Swal.fire({
        icon: 'warning',
        text: errorMessage + '. Please adjust your date selection.',
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

    userLogger.info('Filters applied successfully', {
      operationId,
      filterCount: Object.values(appliedFilters).filter(Boolean).length,
      processingTimeMs: performance.now() - startTime
    });

    // Apply the filters
    onApplyFilters(appliedFilters);
  };


  // Clear all filters with enhanced logging
  const handleClearFilters = () => {
    const operationId = `clear-filters-${Date.now()}`;
    const startTime = performance.now();

    // Log the current filter state before clearing
    const activeFilterCount = Object.values(filters).filter(Boolean).length;
    userLogger.info('Clearing all filters', {
      operationId,
      activeFilterCount,
      previousFilters: Object.keys(filters).filter(key => filters[key as keyof typeof filters])
    });

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
    userLogger.info('All filters cleared', {
      operationId,
      processingTimeMs: performance.now() - startTime
    });

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
