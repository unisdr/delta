import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ImpactMapOl from "./Map/ImpactMapOl";

interface Sector {
  id: number;
  sectorname: string;
  subsectors?: Sector[];
}

// Define the filter shape to match ImpactMapOl props
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
  assessmentType?: 'rapid' | 'detailed';
  confidenceLevel?: 'low' | 'medium' | 'high';
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
  assessmentType: 'rapid',
  confidenceLevel: 'low'
};

export default function ImpactMap({ filters = DEFAULT_FILTERS }: ImpactMapProps) {
  const [geoData, setGeoData] = useState<any>(null);
  const [selectedMetric, setSelectedMetric] = useState<"totalDamage" | "totalLoss">("totalDamage");
  const [selectedTab, setSelectedTab] = useState<string>('tab01');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add sectors query for dynamic titles
  const { data: sectorsResponse } = useQuery({
    queryKey: ["sectors"],
    queryFn: async () => {
      const response = await fetch("/api/analytics/sectors");
      if (!response.ok) throw new Error("Failed to fetch sectors");
      return response.json() as Promise<{ sectors: Sector[] }>;
    }
  });

  // Function to get sector with parent
  const findSectorWithParent = (sectors: Sector[], targetId: string): { sector: Sector | undefined; parent: Sector | undefined } => {
    for (const sector of sectors) {
      if (sector.id.toString() === targetId) {
        return { sector, parent: undefined };
      }
      if (sector.subsectors) {
        const subsector = sector.subsectors.find(sub => sub.id.toString() === targetId);
        if (subsector) {
          return { sector: subsector, parent: sector };
        }
      }
    }
    return { sector: undefined, parent: undefined };
  };

  // Function to get section title based on selected sector
  const sectionTitle = () => {
    if (!sectorsResponse?.sectors) return "Impact by Geographic Level";

    if (filters?.sectorId) {
      const { sector, parent } = findSectorWithParent(sectorsResponse.sectors, filters.sectorId);

      if (filters?.subSectorId && sector) {
        const { sector: subsector, parent: mainSector } = findSectorWithParent(sectorsResponse.sectors, filters.subSectorId);
        if (subsector && mainSector) {
          return `Impact in ${subsector.sectorname} (${mainSector.sectorname} Sector) by Geographic Level`;
        }
      }

      if (sector) {
        return `Impact in ${sector.sectorname} Sector by Geographic Level`;
      }
    }

    return "Impact by Geographic Level";
  };

  // Handle tab selection
  const handleSelectTab = (tabId: string) => {
    setSelectedTab(tabId);
    setSelectedMetric(tabId === 'tab01' ? 'totalDamage' : 'totalLoss');
  };

  // Fetch geographic impact data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = new URL('/api/analytics/geographic-impacts', window.location.origin);
        const activeFilters = filters || DEFAULT_FILTERS;

        // Add all non-null filters to URL
        Object.entries(activeFilters).forEach(([key, value]) => {
          if (value !== null && value !== '') {
            url.searchParams.append(key, value);
          }
        });

        const response = await fetch(url.toString());
        const data = await response.json();

        if (!response.ok) {
          // Handle specific error cases
          if (response.status === 404) {
            setGeoData({ type: "FeatureCollection", features: [] });
            return;
          }
          throw new Error(data.message || 'Failed to fetch geographic data');
        }

        // Validate response format
        if (!data || !data.features) {
          setGeoData({ type: "FeatureCollection", features: [] });
          return;
        }

        setGeoData(data);
      } catch (error) {
        console.error('Error fetching geographic data:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch geographic data');
        // Set empty data to trigger no-data UI
        setGeoData({ type: "FeatureCollection", features: [] });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters]);

  if (error) {
    return (
      <section className="dts-page-section">
        <div className="mg-container">
          <div className="alert alert-error">
            {error}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="dts-page-section">
      <div className="mg-container">
        <h2 className="dts-heading-2">{sectionTitle()}</h2>
        <p className="dts-body-text mb-6">Distribution of impacts across different geographic levels</p>
        <div className="map-section">
          <h2 className="mg-u-sr-only" id="tablist01">Geographic Impact View</h2>
          <ul className="dts-tablist" role="tablist" aria-labelledby="tablist01">
            <li role="presentation">
              <button
                className={`dts-tablist__button ${selectedTab === 'tab01' ? 'active' : ''}`}
                type="button"
                role="tab"
                id="tab01"
                aria-controls="tabpanel01"
                aria-selected={selectedTab === 'tab01'}
                tabIndex={selectedTab === 'tab01' ? 0 : -1}
                onClick={() => handleSelectTab('tab01')}
              >
                <span>Total Damages</span>
              </button>
            </li>
            <li role="presentation">
              <button
                className={`dts-tablist__button ${selectedTab === 'tab02' ? 'active' : ''}`}
                type="button"
                role="tab"
                id="tab02"
                aria-controls="tabpanel02"
                aria-selected={selectedTab === 'tab02'}
                tabIndex={selectedTab === 'tab02' ? 0 : -1}
                onClick={() => handleSelectTab('tab02')}
              >
                <span>Total Losses</span>
              </button>
            </li>
          </ul>
          <div id="tabpanel01" role="tabpanel" aria-labelledby="tab01" hidden={selectedTab !== 'tab01'}>
            {loading ? (
              <div className="map-loading">
                <div className="loading-spinner"></div>
                <p>Loading map data...</p>
              </div>
            ) : !geoData || !geoData.features || geoData.features.length === 0 ? (
              <div className="map-no-data">
                <p>No geographic data available for the selected filters.</p>
              </div>
            ) : (
              <ImpactMapOl
                geoData={geoData}
                selectedMetric={selectedMetric}
                filters={filters || DEFAULT_FILTERS}
              />
            )}
          </div>
          <div id="tabpanel02" role="tabpanel" aria-labelledby="tab02" hidden={selectedTab !== 'tab02'}>
            {loading ? (
              <div className="map-loading">
                <div className="loading-spinner"></div>
                <p>Loading map data...</p>
              </div>
            ) : !geoData || !geoData.features || geoData.features.length === 0 ? (
              <div className="map-no-data">
                <p>No geographic data available for the selected filters.</p>
              </div>
            ) : (
              <ImpactMapOl
                geoData={geoData}
                selectedMetric={selectedMetric}
                filters={filters || DEFAULT_FILTERS}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}