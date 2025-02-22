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
  const [selectedTab, setSelectedTab] = useState<string>('tab01');

  // Add sectors query for dynamic titles
  const { data: sectorsResponse } = useQuery({
    queryKey: ["sectors"],
    queryFn: async () => {
      const response = await fetch("/api/analytics/sectors");
      if (!response.ok) throw new Error("Failed to fetch sectors");
      const data = await response.json();
      return data;
    }
  });

  // Function to get section title based on selected sector
  const sectionTitle = () => {
    if (!filters?.sectorId) return "Geographic Impact Analysis";

    const sectors = sectorsResponse?.sectors || [];
    const sector = sectors.find((s: Sector) => s.id === parseInt(filters.sectorId || '', 10));
    return sector ? `Geographic Impact Analysis - ${sector.sectorname}` : "Geographic Impact Analysis";
  };

  // Handle tab selection
  const handleSelectTab = (tabId: string) => {
    setSelectedTab(tabId);
    setSelectedMetric(tabId === 'tab01' ? 'totalDamage' : 'totalLoss');
  };

  // Fetch geographic impact data
  useEffect(() => {
    const fetchData = async () => {
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
        if (!response.ok) throw new Error('Failed to fetch geographic data');
        const data = await response.json();
        setGeoData(data);
      } catch (error) {
        console.error('Error fetching geographic data:', error);
      }
    };

    fetchData();
  }, [filters]);

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
                className="dts-tablist__button"
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
                className="dts-tablist__button"
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
            {geoData ? (
              <ImpactMapOl
                geoData={geoData}
                selectedMetric="totalDamage"
                filters={filters || DEFAULT_FILTERS}
              />
            ) : (
              <div className="map-loading">
                Loading map...
              </div>
            )}
          </div>
          <div id="tabpanel02" role="tabpanel" aria-labelledby="tab02" hidden={selectedTab !== 'tab02'}>
            {geoData ? (
              <ImpactMapOl
                geoData={geoData}
                selectedMetric="totalLoss"
                filters={filters || DEFAULT_FILTERS}
              />
            ) : (
              <div className="map-loading">
                Loading map...
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}