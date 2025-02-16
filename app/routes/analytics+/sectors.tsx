import React, { useEffect, useState } from "react";
import type { MetaFunction } from "@remix-run/node";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";

import { authLoader, authLoaderGetAuth, authLoaderPublicOrWithPerm } from "~/util/auth";
import { NavSettings } from "~/routes/settings/nav";
import { MainContainer } from "~/frontend/container";

import Filters from "~/frontend/analytics/sectors/sections/Filters";
import ImpactOnSector from "~/frontend/analytics/sectors/sections/ImpactOnSector";
import ImpactByHazard from "~/frontend/analytics/sectors/sections/ImpactByHazard";
import ImpactMap from "~/frontend/analytics/sectors/sections/ImpactMap";

// Types
interface Sector {
  id: number;
  sectorname: string;
  subsectors?: Sector[];
}

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Loader with public access or specific permission check for "ViewData"
export const loader = authLoaderPublicOrWithPerm("ViewData", async (loaderArgs: any) => {
  // Currently, this returns the loaderArgs as is.
  // This will be replaced with actual data fetching logic for the Sectors Analysis page.
  return { loaderArgs };
});

// Meta function for page SEO
export const meta: MetaFunction = ({ data }) => {
  return [
    { title: "Sectors Analysis - DTS" },
    { name: "description", content: "Sector analysis page under DTS." },
  ];
};

// React component for Sectors Analysis page
function SectorsAnalysisContent() {
  // State declarations
  const [isMounted, setIsMounted] = useState(false);
  const [filters, setFilters] = useState<{
    sectorId: string | null;
    subSectorId: string | null;
    hazardTypeId: string | null;
    hazardClusterId: string | null;
    specificHazardId: string | null;
    geographicLevelId: string | null;
    fromDate: string | null;
    toDate: string | null;
    disasterEventId: string | null;
  } | null>(null);

  // Event handlers for Filters component
  const handleApplyFilters = (newFilters: typeof filters) => {
    setFilters(newFilters);
  };

  const handleAdvancedSearch = () => {
    // TODO: Implement advanced search functionality
    console.log("Advanced search clicked");
  };

  const handleClearFilters = () => {
    setFilters(null);
  };

  // Add sectors query for dynamic titles
  const { data: sectorsData } = useQuery({
    queryKey: ["sectors"],
    queryFn: async () => {
      const response = await fetch("/api/analytics/sectors");
      if (!response.ok) throw new Error("Failed to fetch sectors");
      return response.json() as Promise<{ sectors: Sector[] }>;
    }
  });

  return (
    <MainContainer title="Sectors Analysis" headerExtra={<NavSettings />}>
      <div style={{ maxWidth: "100%", overflow: "hidden" }}>
        <div className="sectors-page">
          {/* Filters Section */}
          <Filters
            onApplyFilters={handleApplyFilters}
            onAdvancedSearch={handleAdvancedSearch}
            onClearFilters={handleClearFilters}
          />

          {/* Conditional rendering: Display this message until filters are applied */}
          {!filters && (
            <div
              style={{
                marginTop: "2rem",
                textAlign: "center",
                padding: "2rem",
                borderRadius: "8px",
                backgroundColor: "#f9f9f9",
                color: "#333",
                fontSize: "1.6rem",
                lineHeight: "1.8rem",
              }}
            >
              <h3 style={{ color: "#004f91", fontSize: "2rem", marginBottom: "1rem" }}>
                Welcome to the Sectors Dashboard! 🌟
              </h3>
              <p>Please select and apply filters above to view the analysis.</p>
            </div>
          )}

          {/* Dashboard sections */}
          {filters && (
            <div className="sectors-content" style={{ marginTop: "2rem", maxWidth: "100%", overflow: "hidden" }}>
              {/* Impact on Sector Section */}
              {filters.sectorId && (
                <div className="space-y-8">
                  <ImpactOnSector
                    sectorId={filters.sectorId}
                    filters={filters}
                  />
                </div>
              )}

              {/* Impact by Hazard Section */}
              <ImpactByHazard filters={filters} />

              {/* Impact by Geographic Level */}
              <ImpactMap filters={filters} />
            </div>
          )}

          {/* Work In Progress Message - Updated list */}
          <div
            className="construction-message"
            style={{
              marginTop: "2rem",
              padding: "1.6rem",
              backgroundColor: "#f9f9f9",
              borderRadius: "8px",
              border: "1px solid #ddd",
            }}
          >
            <h3
              style={{
                fontSize: "1.8rem",
                marginBottom: "1rem",
                fontWeight: "600",
                color: "#333",
              }}
            >
              🚧 Work In Progress
            </h3>
            <p style={{ fontSize: "1.4rem", lineHeight: "1.5", color: "#555" }}>
              The remaining sections of this dashboard, including:
            </p>
            <ul
              style={{
                marginTop: "1rem",
                marginBottom: "1rem",
                paddingLeft: "1.5rem",
                fontSize: "1.4rem",
                lineHeight: "1.6",
                color: "#555",
              }}
            >
              <li>Impact on sectors by Location</li>
              <li>Effect details in sectors</li>
              <li>The most damaging events for sectors</li>
            </ul>
            <p style={{ fontSize: "1.4rem", lineHeight: "1.5", color: "#555" }}>
              are still under construction. Please stay tuned for future updates!
            </p>
          </div>

          <p></p>
          <div className="dts-caption mt-4">
            * Data shown is based on approved or published records
          </div>
        </div>
      </div>
    </MainContainer>
  );
}

// Wrapper component that provides QueryClient
export default function SectorsAnalysis() {
  return (
    <QueryClientProvider client={queryClient}>
      <SectorsAnalysisContent />
    </QueryClientProvider>
  );
}
