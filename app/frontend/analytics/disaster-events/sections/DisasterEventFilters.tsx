import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AiOutlineSearch } from "react-icons/ai";

interface DisasterEvent {
  id: string;
  name: string;
  glide: string;
  national_disaster_id: string;
  other_id1: string;
}

interface FiltersProps {
  onApplyFilters: (filters: {
    disasterEventId: string | null;
  }) => void;
  onAdvancedSearch: () => void;
  onClearFilters: () => void;
}

export function Filters({
  onApplyFilters,
  onAdvancedSearch,
  onClearFilters,
}: FiltersProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [filters, setFilters] = useState({
    disasterEventId: "",
    _disasterEventId: "", // Store UUID separately
  });

  // React Query for fetching disaster events
  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ["disasterEvents"],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/disaster-events`);
      if (!response.ok) throw new Error("Failed to fetch disaster events");
      return response.json();
    }
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Filter events based on search input
  const disasterEvents = eventsData?.disasterEvents?.rows || [];
  const filteredEvents = filters.disasterEventId
    ? disasterEvents.filter((event: DisasterEvent) =>
      event.name?.toLowerCase().includes(filters.disasterEventId.toLowerCase()) ||
      event.id?.toLowerCase().includes(filters.disasterEventId.toLowerCase()) ||
      (event.glide || "").toLowerCase().includes(filters.disasterEventId.toLowerCase()) ||
      (event.national_disaster_id || "").toLowerCase().includes(filters.disasterEventId.toLowerCase()) ||
      (event.other_id1 || "").toLowerCase().includes(filters.disasterEventId.toLowerCase())
    )
    : [];

  // Handle filter changes
  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  // Apply filters
  const handleApplyFilters = () => {
    onApplyFilters({
      disasterEventId: filters._disasterEventId || null,
    });
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setFilters({
      disasterEventId: "",
      _disasterEventId: "",
    });
    onClearFilters();
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
      {/* Row 1: Disaster Event Search */}
      <div className="dts-form-component mg-grid__col--span-6">
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
                    .sort((a: DisasterEvent, b: DisasterEvent) => a.name.localeCompare(b.name))
                    .map((event: DisasterEvent) => (
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

      {/* Action buttons - Exactly as in Sectors component */}
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
}
