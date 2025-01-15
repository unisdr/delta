import React, { useEffect, useState } from "react";

interface Sector {
    id: number;
    name: string;
}

interface DisasterEvent {
    id: string;
    name: string;
}

interface FiltersProps {
    onApplyFilters: (filters: {
        sectorId: string | null;
        disasterEventId: string | null;
        dateRange: string | null;
    }) => void;
    onAdvancedSearch: () => void;
    onClearFilters: () => void; // New prop for clearing filters

}

const Filters: React.FC<FiltersProps> = ({ onApplyFilters, onAdvancedSearch }) => {
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [disasterEvents, setDisasterEvents] = useState<DisasterEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        sectorId: "",
        disasterEventId: "",
        dateRange: "",
    });

    useEffect(() => {
        const fetchFilters = async () => {
            try {
                setLoading(true);
                const [sectorsData, disasterEventsData] = await Promise.all([
                    fetch("/api/sectors").then((res) => res.json()),
                    fetch("/api/disaster-events").then((res) => res.json()),
                ]);
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

    const handleFilterChange = (field: string, value: string) => {
        setFilters((prev) => ({ ...prev, [field]: value }));
    };

    const handleApplyFilters = () => {
        onApplyFilters({
            sectorId: filters.sectorId || null,
            disasterEventId: filters.disasterEventId || null,
            dateRange: filters.dateRange || null,
        });
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
                        {loading ? "Loading sectors..." : sectors.length > 0 ? "Select Sector" : "No data"}
                    </option>
                    {sectors.map((sector) => (
                        <option key={sector.id} value={sector.id}>
                            {sector.name}
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
                    onChange={(e) => handleFilterChange("disasterEventId", e.target.value)}
                    onKeyPress={async (e) => {
                        if (e.key === 'Enter' && filters.disasterEventId.trim() !== "") {
                            try {
                                // Show loading indicator while searching
                                setLoading(true);

                                // Make a request to search for events dynamically
                                const response = await fetch(`/api/disaster-events?query=${encodeURIComponent(filters.disasterEventId)}`);
                                if (!response.ok) {
                                    throw new Error("Failed to fetch disaster events.");
                                }

                                const searchResults = await response.json();
                                setDisasterEvents(searchResults);
                            } catch (error) {
                                console.error("Error searching disaster events:", error);
                            } finally {
                                // Hide loading indicator once search is complete
                                setLoading(false);
                            }
                        }
                    }}
                />
            </div>

            {/* Date range picker */}
            <div className="dts-form-component">
                <label htmlFor="date-range">Date range</label>
                <input
                    type="date"
                    id="date-range"
                    className="filter-date"
                    placeholder="mm/dd/yyyy"
                    value={filters.dateRange}
                    onChange={(e) => handleFilterChange("dateRange", e.target.value)}
                />
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
                onClick={() => setFilters({ sectorId: "", disasterEventId: "", dateRange: "" })}
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
