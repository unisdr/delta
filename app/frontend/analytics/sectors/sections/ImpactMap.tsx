import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ImpactMapOl from "./Map/ImpactMapOl";

interface Sector {
  id: number;
  sectorname: string;
  subsectors?: Sector[];
}

// Define the filter shape
type FilterValues = {
  sectorId: string | null;
  subSectorId: string | null;
  hazardTypeId: string | null;
  hazardClusterId: string | null;
  specificHazardId: string | null;
  geographicLevelId: string | null;
  fromDate: string | null;
  toDate: string | null;
  disasterEventId: string | null;
};

type Filters = FilterValues | null;

type ImpactMapProps = {
  filters: Filters;
};

const DEFAULT_FILTERS: FilterValues = {
  sectorId: null,
  subSectorId: null,
  hazardTypeId: null,
  hazardClusterId: null,
  specificHazardId: null,
  geographicLevelId: null,
  fromDate: null,
  toDate: null,
  disasterEventId: null,
};

export default function ImpactMap({ filters }: ImpactMapProps) {
  const [geoData, setGeoData] = useState<any>(null);
  const [selectedMetric, setSelectedMetric] = useState<"totalDamage" | "totalLoss">("totalDamage");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add sectors query for dynamic titles
  const { data: sectorsData } = useQuery({
    queryKey: ["sectors"],
    queryFn: async () => {
      const response = await fetch("/api/analytics/sectors");
      if (!response.ok) throw new Error("Failed to fetch sectors");
      return response.json() as Promise<{ sectors: Sector[] }>;
    }
  });

  // Helper function to find sector and its parent
  const findSectorWithParent = (sectors: Sector[], targetId: string): { sector: Sector | undefined; parent: Sector | undefined } => {
    for (const sector of sectors) {
      // Check if this is the main sector
      if (sector.id.toString() === targetId) {
        return { sector, parent: undefined };
      }
      // Check subsectors
      if (sector.subsectors) {
        const subsector = sector.subsectors.find(sub => sub.id.toString() === targetId);
        if (subsector) {
          return { sector: subsector, parent: sector };
        }
      }
    }
    return { sector: undefined, parent: undefined };
  };

  // Get dynamic title based on selected sector/subsector
  const getGeographicImpactTitle = () => {
    if (!filters?.sectorId || !sectorsData?.sectors) return "Geographic Impact Map";

    if (filters.subSectorId) {
      // Case: Subsector is selected
      const { sector: subsector, parent: mainSector } = findSectorWithParent(sectorsData.sectors, filters.subSectorId);
      if (subsector && mainSector) {
        return `Impact in ${subsector.sectorname} (${mainSector.sectorname} Sector)`;
      }
    }

    // Case: Only main sector is selected
    const { sector } = findSectorWithParent(sectorsData.sectors, filters.sectorId);
    if (sector) {
      return `Impact in ${sector.sectorname} Sector`;
    }

    return "Geographic Impact Map";
  };

  // Fetch geographic impact data when filters change
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const url = new URL('/api/analytics/geographic-impacts', window.location.origin);
        
        // Add sector filters
        if (filters.sectorId) {
          url.searchParams.append('sectorId', filters.sectorId);
        }
        if (filters.subSectorId) {
          url.searchParams.append('subSectorId', filters.subSectorId);
        }
        
        // Add other filters
        Object.entries(filters).forEach(([key, value]) => {
          if (value && key !== 'sectorId' && key !== 'subSectorId') {
            url.searchParams.append(key, value);
          }
        });

        const response = await fetch(url.toString());
        if (!response.ok) throw new Error("Failed to fetch geographic impact data");
        const data = await response.json();
        setGeoData(data);
      } catch (error) {
        console.error("Error fetching geographic impact data:", error);
        setError(error instanceof Error ? error.message : "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters]);

  if (!geoData) return null;

  return (
    <section className="dts-page-section">
      <div className="mg-container">
        <h2 className="dts-heading-2">{getGeographicImpactTitle()} by geographic level</h2>
        <p className="dts-body-text mb-6">Distribution of impacts across different geographic levels</p>
        <h2 className="mg-u-sr-only" id="tablist01">Impact metrics</h2>
        <div className="dts-tablist" role="tablist" aria-labelledby="tablist01">
          <button
            className={`dts-tablist__button ${selectedMetric === "totalDamage" ? "dts-tablist__button--active" : ""}`}
            type="button"
            role="tab"
            id="tab01"
            aria-controls="tabpanel01"
            aria-selected={selectedMetric === "totalDamage"}
            onClick={() => setSelectedMetric("totalDamage")}
          >
            <span>Total Damages</span>
          </button>
          <button
            className={`dts-tablist__button ${selectedMetric === "totalLoss" ? "dts-tablist__button--active" : ""}`}
            type="button"
            role="tab"
            id="tab02"
            aria-controls="tabpanel02"
            aria-selected={selectedMetric === "totalLoss"}
            onClick={() => setSelectedMetric("totalLoss")}
          >
            <span>Total Losses</span>
          </button>
        </div>

        <div
          id="tabpanel01"
          role="tabpanel"
          aria-labelledby="tab01"
          hidden={selectedMetric !== "totalDamage"}
        >
          <ImpactMapOl
            geoData={geoData}
            selectedMetric="totalDamage"
            filters={filters || DEFAULT_FILTERS}
          />
        </div>

        <div
          id="tabpanel02"
          role="tabpanel"
          aria-labelledby="tab02"
          hidden={selectedMetric !== "totalLoss"}
        >
          <ImpactMapOl
            geoData={geoData}
            selectedMetric="totalLoss"
            filters={filters || DEFAULT_FILTERS}
          />
        </div>
      </div>
    </section>
  );
}
